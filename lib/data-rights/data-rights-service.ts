import "server-only";
import { requirePermission } from "@/lib/authz/guards";
import { signedAvatar, avatarStorage } from "@/lib/member/avatar-storage";
import type { StorageProvider } from "@/lib/media/storage/storage-provider";
import {
  createS3ObjectEraser, DataRightsStorageError, isErasableAvatarKey, providerSessionRevoker, unconfiguredEraser,
  type ObjectEraser, type SessionRevoker,
} from "./data-rights-adapters";
import { checkOutcome, DataRightsError, dataRightsOperation } from "./data-rights-errors";
import { DATA_RIGHTS_PERMISSIONS, rolesFor } from "./data-rights-policy";
import * as repo from "./data-rights-repository";
import { DATA_EXPORT_SCHEMA_VERSION } from "./data-rights-types";
import type { DataExport, DeletionQueuePage, DeletionRequestDTO, ExecutionResult, OwnDeletionStatus } from "./data-rights-types";
import { decisionInput, deletionRequestInput, encodeQueueCursor, executionInput, queueFilters, requestRef } from "./data-rights-validation";

export interface DataRightsDependencies {
  storage: StorageProvider;
  eraser: ObjectEraser;
  sessions: SessionRevoker;
  now?: () => Date;
}
const EXPORT_NOTICE = "This file contains the personal data USS Running holds about your own account. " +
  "It excludes other people's data, internal security records and secrets. The photo link expires within minutes.";

export function createDataRightsService(deps: DataRightsDependencies) {
  const now = deps.now ?? (() => new Date());

  async function eraseObjects(actor: string, requestId: string, objects: repo.ErasureObject[]) {
    let deleted = 0, pending = 0;
    for (const object of objects) {
      let errorCode: string | null = null;
      try {
        if (object.storageProvider !== deps.eraser.id || !isErasableAvatarKey(object.storageKey)) {
          throw new DataRightsStorageError("DATA_RIGHTS_STORAGE_MISMATCH");
        }
        await deps.eraser.erase(object.storageKey);
      } catch (error) {
        errorCode = error instanceof DataRightsStorageError ? error.code : "DATA_RIGHTS_STORAGE_FAILED";
      }
      checkOutcome((await repo.recordFollowup(actor, requestId, "object", object.mediaId, errorCode ? "failed" : "deleted", errorCode))?.out_code);
      if (errorCode) pending++; else deleted++;
    }
    return { deleted, pending };
  }

  return {
    /** Own data only: the account id comes from the trusted session, never from input. */
    async exportOwnData(): Promise<{ filename: string; data: DataExport }> {
      return dataRightsOperation(async () => {
        const { account } = await requirePermission(DATA_RIGHTS_PERMISSIONS.export);
        const row = await repo.exportOwnData(account.id, rolesFor("export"));
        checkOutcome(row?.out_code);
        if (!row.out_data?.account) throw new DataRightsError("DATA_RIGHTS_UNAVAILABLE");
        const { avatar, ...rest } = row.out_data;
        let exportedAvatar: DataExport["avatar"] = null;
        if (avatar) {
          const { storageKey, provider, ...metadata } = avatar;
          const signed = await signedAvatar({ id: avatar.id, storageKey, provider, width: avatar.width ?? 0, height: avatar.height ?? 0 }, deps.storage);
          exportedAvatar = { ...metadata, temporaryUrl: signed?.url ?? null };
        }
        const exportedAt = now().toISOString();
        return {
          filename: `uss-running-data-${exportedAt.slice(0, 10)}.json`,
          data: { schemaVersion: DATA_EXPORT_SCHEMA_VERSION, exportedAt, notice: EXPORT_NOTICE, ...rest, avatar: exportedAvatar },
        };
      });
    },

    async getOwnDeletionStatus(): Promise<OwnDeletionStatus> {
      return dataRightsOperation(async () => {
        const { account } = await requirePermission(DATA_RIGHTS_PERMISSIONS.request);
        const row = await repo.ownDeletionStatus(account.id, rolesFor("request"));
        if (!row?.authorized) throw new DataRightsError("DATA_RIGHTS_FORBIDDEN");
        const current = row.current;
        return { current, canRequest: !current || !["pending", "approved"].includes(current.status) };
      });
    },

    async requestOwnDeletion(input: unknown): Promise<DeletionRequestDTO> {
      return dataRightsOperation(async () => {
        const { account } = await requirePermission(DATA_RIGHTS_PERMISSIONS.request), v = deletionRequestInput(input);
        const row = await repo.requestDeletion(account.id, rolesFor("request"), v.reason, v.confirmEmail);
        checkOutcome(row?.out_code);
        return row.out_data!;
      });
    },

    async cancelOwnDeletion(input: unknown): Promise<DeletionRequestDTO> {
      return dataRightsOperation(async () => {
        const { account } = await requirePermission(DATA_RIGHTS_PERMISSIONS.request), v = requestRef(input);
        const row = await repo.cancelDeletion(account.id, rolesFor("request"), v.id, v.expectedVersion);
        checkOutcome(row?.out_code);
        return row.out_data!;
      });
    },

    async listDeletionRequests(input: unknown = {}): Promise<DeletionQueuePage> {
      return dataRightsOperation(async () => {
        const { account } = await requirePermission(DATA_RIGHTS_PERMISSIONS.manage), f = queueFilters(input);
        const row = await repo.listQueue(account.id, rolesFor("manage"), f);
        if (!row?.authorized) throw new DataRightsError("DATA_RIGHTS_FORBIDDEN");
        const page = row.items.slice(0, f.limit), last = page.at(-1);
        return {
          items: page.map(({ cursorAt: _cursor, ...item }) => item),
          nextCursor: row.items.length > f.limit && last ? encodeQueueCursor(last.cursorAt, last.id, f.status) : null,
        };
      });
    },

    async decideDeletionRequest(input: unknown): Promise<DeletionRequestDTO> {
      return dataRightsOperation(async () => {
        const { account } = await requirePermission(DATA_RIGHTS_PERMISSIONS.manage), v = decisionInput(input);
        const row = await repo.decideDeletion(account.id, rolesFor("manage"), v.id, v.decision, v.expectedVersion, v.reason);
        checkOutcome(row?.out_code);
        return row.out_data!;
      });
    },

    /**
     * DB erasure commits atomically first; provider I/O follows and is audited per object.
     * Re-running on an executed request retries only what is still pending.
     */
    async executeDeletionRequest(input: unknown): Promise<ExecutionResult> {
      return dataRightsOperation(async () => {
        const { account } = await requirePermission(DATA_RIGHTS_PERMISSIONS.manage), v = executionInput(input);
        const row = await repo.executeDeletion(account.id, v.id, v.expectedVersion);
        checkOutcome(row?.out_code);
        const outcome = row.out_data!;
        const objects = await eraseObjects(account.id, v.id, outcome.objects);
        const sessions = await deps.sessions.revokeAll(outcome.providerUserId).catch(() => "unavailable" as const);
        checkOutcome((await repo.recordFollowup(account.id, v.id, "sessions", null, sessions,
          sessions === "revoked" ? null : "DATA_RIGHTS_SESSIONS_UNAVAILABLE"))?.out_code);
        return { request: outcome.request, alreadyExecuted: outcome.alreadyExecuted, objects, sessions };
      });
    },
  };
}

const configured = createDataRightsService({
  storage: avatarStorage,
  eraser: createS3ObjectEraser() ?? unconfiguredEraser,
  sessions: providerSessionRevoker,
});
export const {
  exportOwnData, getOwnDeletionStatus, requestOwnDeletion, cancelOwnDeletion,
  listDeletionRequests, decideDeletionRequest, executeDeletionRequest,
} = configured;

import 'server-only';
import { requirePermission } from '@/lib/authz/guards';
import { avatarStorage, signedAvatar } from '@/lib/member/avatar-storage';
import type { StorageProvider } from '@/lib/media/storage/storage-provider';
import { UserError, userOperation } from './user-errors';
import { uuid } from './user-validation';
import * as repo from './avatar-queue-repository';
import type { AvatarQueuePage } from './user-types';

const bad = (): never => { throw new UserError('USER_SEARCH_INVALID'); };
export const AVATAR_QUEUE_LIMITS = { defaultLimit: 24, maxLimit: 60 } as const;
function input(value: unknown) {
    if (value === undefined) value = {};
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['limit', 'cursor'].includes(k))) return bad();
    const v = value as Record<string, unknown>, limit = v.limit ?? AVATAR_QUEUE_LIMITS.defaultLimit;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > AVATAR_QUEUE_LIMITS.maxLimit) return bad();
    let cursor: { at: string; id: string } | null = null;
    if (v.cursor !== undefined) {
        if (typeof v.cursor !== 'string' || v.cursor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(v.cursor)) return bad();
        try {
            const c = JSON.parse(Buffer.from(v.cursor, 'base64url').toString('utf8'));
            // Raw DB timestamp keeps microsecond precision for exact keyset paging.
            if (!c || typeof c.at !== 'string' || c.at.length > 40 || !/^\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(c.at) || !Number.isFinite(Date.parse(c.at)) || Object.keys(c).length !== 2) return bad();
            cursor = { at: c.at, id: uuid(c.id) };
        } catch { return bad(); }
    }
    return { limit: Number(limit), cursor };
}
const iso = (v: string) => new Date(v).toISOString();

export function createAvatarQueueService(storage: StorageProvider = avatarStorage) {
    return {
        async listAvatarReviewQueue(value?: unknown): Promise<AvatarQueuePage> {
            return userOperation(async () => {
                const { account } = await requirePermission('members.photo.review'), f = input(value);
                const result = await repo.listAvatarQueue(account.id, f.limit, f.cursor), page = result.items.slice(0, f.limit), last = page.at(-1);
                const items = await Promise.all(page.map(async r => ({
                    accountId: r.account_id, avatarId: r.avatar_id, uploadedAt: iso(r.uploaded_at), name: r.name, memberId: r.member_id,
                    status: r.status, photo: (await signedAvatar(r.photo, storage))?.url ?? null,
                })));
                return { total: result.total, items, nextCursor: result.items.length > f.limit && last ? Buffer.from(JSON.stringify({ at: last.uploaded_at, id: last.avatar_id })).toString('base64url') : null };
            });
        },
        async countAvatarReviewQueue(): Promise<number> {
            return userOperation(async () => { const { account } = await requirePermission('members.photo.review'); return repo.countAvatarQueue(account.id); });
        },
    };
}
export const { listAvatarReviewQueue, countAvatarReviewQueue } = createAvatarQueueService();

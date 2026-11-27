"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Textarea } from "@/components/ui";
import { activateUser, deactivateUser, suspendUser } from "@/lib/admin-users/user-actions";
import { grantManagedRole, revokeManagedRole } from "@/lib/admin-roles/role-actions";
import type { AccountStatus } from "@/lib/db/types";
import type { SystemRole } from "@/lib/authz/permissions";
import {
  LIFECYCLE_COPY, ROLE_LABELS, ROLE_MESSAGES, USER_MESSAGES, isConflict, lifecycleOperations, messageFor, reasonError,
  type LifecycleOperation,
} from "./model";

type ActionResult = { ok: true } | { ok: false; code: string };
type Mutation = (input: { id: string; expectedVersion: number; reason: string; role?: "admin" | "super_admin" }) => Promise<ActionResult>;
export type AccountActionAdapters = {
  lifecycle: Record<LifecycleOperation, Mutation>;
  grantRole: Mutation;
  revokeRole: Mutation;
};
const serverAdapters: AccountActionAdapters = {
  lifecycle: { activate: activateUser, suspend: suspendUser, deactivate: deactivateUser },
  grantRole: grantManagedRole as Mutation,
  revokeRole: revokeManagedRole as Mutation,
};

type Pending =
  | { kind: "lifecycle"; operation: LifecycleOperation }
  | { kind: "role"; operation: "grant" | "revoke"; role: "admin" | "super_admin" };

function pendingCopy(pending: Pending) {
  if (pending.kind === "lifecycle") return LIFECYCLE_COPY[pending.operation];
  const label = ROLE_LABELS[pending.role];
  return pending.operation === "grant"
    ? { label: `Grant ${label}`, title: `Grant ${label} role?`, tone: "primary" as const,
        description: pending.role === "super_admin"
          ? "Super admins can manage every account, role and setting. Grant only to trusted owners."
          : "Admins can run content, events, check-in, member lookup and photo review. They see a restricted member directory." }
    : { label: `Revoke ${label}`, title: `Revoke ${label} role?`, tone: "danger" as const,
        description: "The account keeps its member access. Elevated access ends on the next request." };
}

/**
 * Lifecycle and role controls for one account. Every change requires a reason, carries the version
 * the page was rendered with, and reloads server data afterwards; the server is the only authority.
 */
export function AccountActions({
  member, isSelf, canManageUsers, canManageRoles, adapters = serverAdapters,
}: {
  member: { id: string; status: AccountStatus; emailVerified: boolean; roles: readonly SystemRole[]; version: number; label: string };
  isSelf: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  adapters?: AccountActionAdapters;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const operations = canManageUsers && !isSelf ? lifecycleOperations(member) : [];
  const validation = reasonError(reason);
  const elevated = (["admin", "super_admin"] as const);

  function open(next: Pending) {
    setPending(next); setReason(""); setTouched(false); setError(null); setNotice("");
  }
  async function confirm() {
    setTouched(true);
    if (!pending || validation || lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const input = { id: member.id, expectedVersion: member.version, reason: reason.trim() };
      const result = pending.kind === "lifecycle"
        ? await adapters.lifecycle[pending.operation](input)
        : await (pending.operation === "grant" ? adapters.grantRole : adapters.revokeRole)({ ...input, role: pending.role });
      if (result.ok) {
        setNotice(`${pendingCopy(pending).label} saved. The audit history records your reason.`);
        setPending(null);
        router.refresh();
      } else {
        setError({ code: result.code, message: messageFor(pending.kind === "lifecycle" ? USER_MESSAGES : ROLE_MESSAGES, result.code) });
      }
    } catch {
      setError({ code: "NETWORK_ERROR", message: "We couldn't reach the server. Nothing was changed; try again." });
    } finally {
      lock.current = false; setBusy(false);
    }
  }

  const copy = pending ? pendingCopy(pending) : null;
  return (
    <div className="uss-admin-actions">
      {notice && <p className="uss-admin-notice" role="status">{notice}</p>}
      {canManageUsers && (
        <section aria-labelledby="account-status-actions">
          <h2 id="account-status-actions">Account status.</h2>
          {isSelf ? <p className="uss-admin-muted">You can't change the status of your own account.</p>
            : member.roles.includes("super_admin") ? <p className="uss-admin-muted">Super admin accounts are protected. Revoke the super admin role before changing status.</p>
              : !operations.length ? <p className="uss-admin-muted">No status change applies to this account.</p>
                : <div className="uss-admin-button-row">{operations.map(operation => (
                  <Button key={operation} variant={LIFECYCLE_COPY[operation].tone} onClick={() => open({ kind: "lifecycle", operation })}>
                    {LIFECYCLE_COPY[operation].label}
                  </Button>))}</div>}
        </section>
      )}
      {canManageRoles && (
        <section aria-labelledby="account-role-actions">
          <h2 id="account-role-actions">Roles.</h2>
          <p className="uss-admin-muted">Every account keeps the member role. Admin and super admin are granted on top.</p>
          {isSelf ? <p className="uss-admin-muted">You can't change your own roles. Ask another super admin.</p> : (
            <div className="uss-admin-button-row">
              {elevated.map(role => member.roles.includes(role)
                ? <Button key={role} variant="danger" onClick={() => open({ kind: "role", operation: "revoke", role })}>Revoke {ROLE_LABELS[role]}</Button>
                : <Button key={role} variant="secondary" disabled={member.status !== "active" || !member.emailVerified}
                  onClick={() => open({ kind: "role", operation: "grant", role })}>Grant {ROLE_LABELS[role]}</Button>)}
            </div>
          )}
          {!isSelf && (member.status !== "active" || !member.emailVerified) && (
            <p className="uss-admin-muted">Elevated roles can only be granted to active accounts with a verified email.</p>
          )}
        </section>
      )}
      <Modal
        open={pending !== null}
        onClose={() => { if (!busy) setPending(null); }}
        title={copy?.title ?? "Confirm change"}
        description={copy ? `${member.label}. ${copy.description}` : undefined}
        actions={<>
          <Button variant="secondary" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
          <Button variant={copy?.tone === "danger" ? "danger" : "primary"} loading={busy} loadingLabel="Saving…" onClick={() => void confirm()}>
            {copy?.label ?? "Confirm"}
          </Button>
        </>}
      >
        <Field id="account-change-reason" label="Reason (required)" required
          hint="Plain text, 5–500 characters. Stored in the audit history."
          error={touched ? validation ?? undefined : undefined}>
          <Textarea id="account-change-reason" value={reason} maxLength={500} rows={3} disabled={busy}
            onChange={event => setReason(event.target.value)} onBlur={() => setTouched(true)} />
        </Field>
        {error && (
          <div role="alert" className="uss-admin-error">
            <p>{error.message}</p>
            {isConflict(error.code) && <Button variant="secondary" onClick={() => { setPending(null); router.refresh(); }}>Reload latest</Button>}
          </div>
        )}
      </Modal>
    </div>
  );
}

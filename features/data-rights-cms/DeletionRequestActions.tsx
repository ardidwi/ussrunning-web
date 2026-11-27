"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { decideDeletionRequest, executeDeletionRequest } from "@/lib/data-rights/data-rights-actions";
import { dataRightsMessage, REASON_MAX } from "@/lib/data-rights/data-rights-presentation";
import type { AdminDeletionRequestDTO, DataRightsResult, DeletionRequestDTO, ExecutionResult } from "@/lib/data-rights/data-rights-types";

export interface QueueAdapters {
  decide: (input: { id: string; expectedVersion: number; decision: "approve" | "reject"; reason: string }) => Promise<DataRightsResult<DeletionRequestDTO>>;
  execute: (input: { id: string; expectedVersion: number; confirm: string }) => Promise<DataRightsResult<ExecutionResult>>;
  refresh?: () => void;
}
const serverAdapters: QueueAdapters = { decide: decideDeletionRequest, execute: executeDeletionRequest };
type Notice = { tone: "success" | "error"; text: string } | null;

/** Per-request controls. The server re-validates every rule; this only guides and prevents double submits. */
export function DeletionRequestActions({ request, adapters = serverAdapters }: { request: AdminDeletionRequestDTO; adapters?: QueueAdapters }) {
  const router = useRouter();
  const refresh = adapters.refresh ?? (() => router.refresh());
  const [mode, setMode] = useState<"idle" | "approve" | "reject" | "execute">("idle");
  const [reason, setReason] = useState(""), [confirm, setConfirm] = useState(""), [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState<Notice>(null);
  const lock = useRef(false);
  const id = request.id.slice(0, 8);

  async function guarded(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice(null);
    try { await fn(); } finally { lock.current = false; setBusy(false); }
  }
  async function decide(event: FormEvent) {
    event.preventDefault();
    if (mode !== "approve" && mode !== "reject") return;
    if (reason.trim().length < 5) { setError("Write a reason of at least 5 characters. It is shown to the member and kept in the audit log."); return; }
    setError(undefined);
    await guarded(async () => {
      const result = await adapters.decide({ id: request.id, expectedVersion: request.version, decision: mode, reason: reason.trim() });
      if (result.ok) {
        setNotice({ tone: "success", text: result.data.status === "approved" ? "Request approved. It can now be executed." : "Request declined. The member can see your reason." });
        setMode("idle"); setReason(""); refresh();
      } else setNotice({ tone: "error", text: dataRightsMessage(result.code) });
    });
  }
  async function execute(event: FormEvent) {
    event.preventDefault();
    if (confirm !== "ERASE") { setError("Type ERASE in capitals to confirm."); return; }
    setError(undefined);
    await guarded(async () => {
      const result = await adapters.execute({ id: request.id, expectedVersion: request.version, confirm });
      if (result.ok) {
        const { objects, sessions, alreadyExecuted } = result.data;
        const parts = [alreadyExecuted ? "Erasure was already complete." : "Account data erased."];
        parts.push(objects.pending ? `${objects.pending} photo file(s) still pending deletion — run again to retry.` : "Stored photo files deleted.");
        parts.push(sessions === "revoked" ? "Provider sessions revoked." : "Access is blocked; provider session revocation was unavailable.");
        setNotice({ tone: objects.pending ? "error" : "success", text: parts.join(" ") });
        setMode("idle"); setConfirm(""); refresh();
      } else setNotice({ tone: "error", text: dataRightsMessage(result.code) });
    });
  }

  const pendingObjects = request.erasure?.pendingObjects ?? 0;
  return (
    <div className="uss-data-rights-actions-block">
      {mode === "idle" && (
        <div className="uss-data-rights-actions">
          {request.status === "pending" && <>
            <Button variant="secondary" onClick={() => setMode("approve")}>Approve</Button>
            <Button variant="text" onClick={() => setMode("reject")}>Decline</Button>
          </>}
          {request.status === "approved" && <Button variant="danger" onClick={() => setMode("execute")}>Execute erasure</Button>}
          {request.status === "executed" && pendingObjects > 0 && (
            <Button variant="secondary" onClick={() => setMode("execute")}>Retry pending file deletion</Button>
          )}
        </div>
      )}
      {(mode === "approve" || mode === "reject") && (
        <form className="uss-data-rights-form" onSubmit={decide} noValidate>
          <Field id={`reason-${id}`} label={mode === "approve" ? "Approval reason" : "Reason for declining"} required error={error}
            hint="5–500 characters. Visible to the member and recorded in the audit log.">
            <Textarea value={reason} maxLength={REASON_MAX} rows={3} onChange={e => setReason(e.target.value)} />
          </Field>
          <div className="uss-data-rights-actions">
            <Button type="submit" variant={mode === "approve" ? "primary" : "secondary"} loading={busy} loadingLabel="Saving…">
              {mode === "approve" ? "Confirm approval" : "Confirm decline"}
            </Button>
            <Button variant="text" onClick={() => { setMode("idle"); setError(undefined); }} disabled={busy}>Back</Button>
          </div>
        </form>
      )}
      {mode === "execute" && (
        <form className="uss-data-rights-form" onSubmit={execute} noValidate>
          <div className="uss-data-rights-effects">
            <strong>{request.status === "executed" ? "Retry deleting the remaining stored photo files." : "This permanently erases the member's personal data."}</strong>
            {request.status !== "executed" && <p>Profile, photo, contact details, registration answers and notification recipients are erased; the account is
              deactivated and roles removed. Audit history and anonymised attendance are kept. This cannot be undone.</p>}
          </div>
          <Field id={`confirm-${id}`} label="Type ERASE to confirm" required error={error}>
            <Input value={confirm} autoComplete="off" autoCapitalize="characters" spellCheck={false} onChange={e => setConfirm(e.target.value)} />
          </Field>
          <div className="uss-data-rights-actions">
            <Button type="submit" variant="danger" loading={busy} loadingLabel="Erasing…">{request.status === "executed" ? "Retry now" : "Erase account data"}</Button>
            <Button variant="text" onClick={() => { setMode("idle"); setError(undefined); setConfirm(""); }} disabled={busy}>Back</Button>
          </div>
        </form>
      )}
      <p className={`uss-data-rights-notice ${notice ? `uss-tone-${notice.tone}` : ""}`} role={notice?.tone === "error" ? "alert" : "status"} aria-live="polite">
        {notice?.text}
      </p>
    </div>
  );
}

"use client";
import { useRef, useState, type FormEvent } from "react";
import { Badge, Button, Checkbox, Field, Input, Modal, Textarea } from "@/components/ui";
import { cancelOwnDeletion, getOwnDeletionStatus, requestOwnDeletion } from "@/lib/data-rights/data-rights-actions";
import {
  dataRightsMessage, exportFilename, formatWhen, isOpenRequest, REASON_MAX, STATUS_PRESENTATION,
} from "@/lib/data-rights/data-rights-presentation";
import type { DataRightsResult, DeletionRequestDTO, OwnDeletionStatus } from "@/lib/data-rights/data-rights-types";

export type ExportOutcome = { ok: true; filename: string; blob: Blob } | { ok: false; code: string };
export interface DataRightsAdapters {
  exportData: () => Promise<ExportOutcome>;
  status: () => Promise<DataRightsResult<OwnDeletionStatus>>;
  request: (input: { reason?: string; confirmEmail: string }) => Promise<DataRightsResult<DeletionRequestDTO>>;
  cancel: (input: { id: string; expectedVersion: number }) => Promise<DataRightsResult<DeletionRequestDTO>>;
}

async function downloadExport(): Promise<ExportOutcome> {
  try {
    const response = await fetch("/api/member/data-export", { method: "POST", credentials: "same-origin", cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { code?: string } | null;
      return { ok: false, code: body?.code ?? "DATA_RIGHTS_UNAVAILABLE" };
    }
    return { ok: true, filename: exportFilename(response.headers.get("content-disposition")), blob: await response.blob() };
  } catch {
    return { ok: false, code: "DATA_RIGHTS_UNAVAILABLE" };
  }
}
const serverAdapters: DataRightsAdapters = {
  exportData: downloadExport, status: getOwnDeletionStatus, request: requestOwnDeletion, cancel: cancelOwnDeletion,
};
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; link.rel = "noopener";
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Notice = { tone: "success" | "error"; text: string } | null;

function ExportPanel({ adapter }: { adapter: DataRightsAdapters["exportData"] }) {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState<Notice>(null), lock = useRef(false);
  async function run() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice(null);
    try {
      const result = await adapter();
      if (result.ok) {
        saveBlob(result.blob, result.filename);
        setNotice({ tone: "success", text: `Downloaded ${result.filename}. Keep it somewhere safe: it contains your personal data.` });
      } else {
        setNotice({ tone: "error", text: result.code === "DATA_RIGHTS_RATE_LIMITED"
          ? "You can download your data up to 3 times per hour. Please try again later." : dataRightsMessage(result.code) });
      }
    } finally {
      lock.current = false; setBusy(false);
    }
  }
  return (
    <section className="uss-member-panel uss-data-rights-panel" aria-labelledby="data-export-heading">
      <h2 id="data-export-heading">Download your data</h2>
      <p>Get a JSON file with your account, profile, consents, photo details, event registrations, attendance, passes and the
        notifications we sent you. It never includes other members&apos; data or internal security records.</p>
      <Button onClick={run} loading={busy} loadingLabel="Preparing file…" variant="secondary">Download my data</Button>
      <p className={`uss-data-rights-notice ${notice ? `uss-tone-${notice.tone}` : ""}`} role={notice?.tone === "error" ? "alert" : "status"} aria-live="polite">
        {notice?.text}
      </p>
    </section>
  );
}

function RequestSummary({ request, onCancel, cancelling }: { request: DeletionRequestDTO; onCancel?: () => void; cancelling: boolean }) {
  const presentation = STATUS_PRESENTATION[request.status];
  return (
    <div className="uss-data-rights-request" aria-live="polite">
      <div className="uss-data-rights-request-head">
        <strong>Deletion request</strong>
        <Badge tone={presentation.tone}>{presentation.label}</Badge>
      </div>
      <p>{presentation.member}</p>
      <dl className="uss-data-rights-facts">
        <div><dt>Requested</dt><dd>{formatWhen(request.requestedAt)}</dd></div>
        {request.decidedAt && <div><dt>Reviewed</dt><dd>{formatWhen(request.decidedAt)}</dd></div>}
        {request.cancelledAt && <div><dt>Cancelled</dt><dd>{formatWhen(request.cancelledAt)}</dd></div>}
        {request.reason && <div><dt>Your reason</dt><dd>{request.reason}</dd></div>}
        {request.decisionReason && request.status !== "cancelled" && <div><dt>Note from USS</dt><dd>{request.decisionReason}</dd></div>}
      </dl>
      {onCancel && <Button variant="secondary" onClick={onCancel} loading={cancelling} loadingLabel="Cancelling…">Cancel deletion request</Button>}
    </div>
  );
}

function DeletionPanel({ initial, adapters }: { initial: DataRightsResult<OwnDeletionStatus>; adapters: DataRightsAdapters }) {
  const [state, setState] = useState(initial);
  const [formOpen, setFormOpen] = useState(false), [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState(""), [email, setEmail] = useState(""), [understood, setUnderstood] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; understood?: string; reason?: string }>({});
  const [busy, setBusy] = useState<"submit" | "cancel" | "reload" | null>(null), [notice, setNotice] = useState<Notice>(null);
  const lock = useRef(false);

  async function guarded(kind: "submit" | "cancel" | "reload", fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(kind);
    try { await fn(); } finally { lock.current = false; setBusy(null); }
  }
  const reload = () => guarded("reload", async () => { setState(await adapters.status()); });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter your account email to confirm.";
    if (!understood) next.understood = "Confirm that you understand what will be erased.";
    if (reason.length > REASON_MAX) next.reason = `Keep the reason under ${REASON_MAX} characters.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    await guarded("submit", async () => {
      setNotice(null);
      const result = await adapters.request({ confirmEmail: email.trim(), ...(reason.trim() ? { reason: reason.trim() } : {}) });
      if (result.ok) {
        setState({ ok: true, data: { current: result.data, canRequest: false } });
        setFormOpen(false); setEmail(""); setReason(""); setUnderstood(false);
        setNotice({ tone: "success", text: "Request received. We'll review it and you can follow its status here." });
      } else if (result.code === "DATA_RIGHTS_CONFIRMATION_MISMATCH") {
        setErrors({ email: dataRightsMessage(result.code) });
      } else {
        setNotice({ tone: "error", text: dataRightsMessage(result.code) });
        if (result.code === "DATA_RIGHTS_REQUEST_OPEN") { setFormOpen(false); setState(await adapters.status()); }
      }
    });
  }
  async function cancel(request: DeletionRequestDTO) {
    setConfirmCancel(false);
    await guarded("cancel", async () => {
      setNotice(null);
      const result = await adapters.cancel({ id: request.id, expectedVersion: request.version });
      if (result.ok) {
        setState({ ok: true, data: { current: result.data, canRequest: true } });
        setNotice({ tone: "success", text: "Your deletion request was cancelled. Your account stays as it is." });
      } else {
        setNotice({ tone: "error", text: dataRightsMessage(result.code) });
        setState(await adapters.status());
      }
    });
  }

  if (!state.ok) {
    return (
      <section className="uss-member-panel uss-data-rights-panel" aria-labelledby="data-delete-heading">
        <h2 id="data-delete-heading">Delete your account</h2>
        <p role="alert" className="uss-data-rights-notice uss-tone-error">{dataRightsMessage(state.code)}</p>
        <Button variant="secondary" onClick={reload} loading={busy === "reload"} loadingLabel="Loading…">Try again</Button>
      </section>
    );
  }
  const current = state.data.current, open = isOpenRequest(current);
  return (
    <section className="uss-member-panel uss-data-rights-panel" aria-labelledby="data-delete-heading">
      <h2 id="data-delete-heading">Delete your account</h2>
      <p>Ask USS Running to erase your account. A super admin reviews each request; nothing is erased until it is approved
        and carried out, and you can cancel any time before that.</p>
      {current && <RequestSummary request={current} cancelling={busy === "cancel"}
        onCancel={open ? () => setConfirmCancel(true) : undefined} />}
      {!open && !formOpen && (
        <Button variant="danger" onClick={() => { setFormOpen(true); setNotice(null); }}>Request account deletion</Button>
      )}
      {!open && formOpen && (
        <form className="uss-data-rights-form" onSubmit={submit} noValidate aria-describedby="deletion-effects">
          <div id="deletion-effects" className="uss-data-rights-effects">
            <strong>When your request is carried out:</strong>
            <ul>
              <li>Your profile, photo, contact and emergency details are erased.</li>
              <li>You are signed out and can no longer use this account, member card or event passes.</li>
              <li>Upcoming event registrations are cancelled.</li>
              <li>Some records are kept without your contact details, such as security logs and anonymised attendance counts.</li>
            </ul>
            <p>Download your data first if you want a copy.</p>
          </div>
          <Field label="Reason (optional)" hint={`${reason.length}/${REASON_MAX} characters. Helps us improve; it is erased with your account.`} error={errors.reason}>
            <Textarea value={reason} maxLength={REASON_MAX} rows={3} onChange={e => setReason(e.target.value)} />
          </Field>
          <Field label="Confirm your email" required hint="Type the email address you sign in with." error={errors.email}>
            <Input type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <Checkbox label="I understand my account data will be erased once the request is carried out." checked={understood}
            onChange={e => setUnderstood(e.target.checked)} error={errors.understood} />
          <div className="uss-data-rights-actions">
            <Button type="submit" variant="danger" loading={busy === "submit"} loadingLabel="Sending request…">Send deletion request</Button>
            <Button variant="text" onClick={() => { setFormOpen(false); setErrors({}); }} disabled={busy === "submit"}>Keep my account</Button>
          </div>
        </form>
      )}
      <p className={`uss-data-rights-notice ${notice ? `uss-tone-${notice.tone}` : ""}`} role={notice?.tone === "error" ? "alert" : "status"} aria-live="polite">
        {notice?.text}
      </p>
      <Modal open={confirmCancel && Boolean(current)} onClose={() => setConfirmCancel(false)} title="Cancel your deletion request?"
        description="Your account will stay active and nothing will be erased."
        actions={<>
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Keep request</Button>
          <Button onClick={() => current && cancel(current)}>Cancel request</Button>
        </>} />
    </section>
  );
}

export function DataRightsSettings({ initial, adapters = serverAdapters }: {
  initial: DataRightsResult<OwnDeletionStatus>;
  adapters?: DataRightsAdapters;
}) {
  return (
    <div className="uss-data-rights">
      <ExportPanel adapter={adapters.exportData} />
      <DeletionPanel initial={initial} adapters={adapters} />
    </div>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Textarea } from "@/components/ui";
import { cancelParticipant, exportParticipants } from "./api/participant-actions";
import { participantMessage, reasonError } from "./participants-model";

/** Cancel one registration with a mandatory, audited reason. Duplicate submits are blocked while pending. */
export function CancelParticipantButton({ eventId, registrationId, expectedVersion, name }: { eventId: string; registrationId: string; expectedVersion: string; name: string }) {
  const [open, setOpen] = useState(false), [reason, setReason] = useState(""), [error, setError] = useState(""), [failure, setFailure] = useState("");
  const [pending, start] = useTransition(), router = useRouter();
  const submit = () => {
    const problem = reasonError(reason);
    setError(problem);
    if (problem || pending) return;
    start(async () => {
      const result = await cancelParticipant({ eventId, registrationId, expectedVersion, reason: reason.trim() });
      if (result.ok) { setOpen(false); setReason(""); setFailure(""); router.refresh(); }
      else setFailure(participantMessage(result.code));
    });
  };
  return <>
    <Button variant="danger" onClick={() => { setOpen(true); setFailure(""); setError(""); }} aria-label={`Cancel registration for ${name}`}>Cancel registration</Button>
    <Modal open={open} onClose={() => !pending && setOpen(false)} title="Cancel this registration?"
      description={<>The runner&apos;s place is released and a cancellation email is queued for them. Any event pass is revoked. This cannot be undone from here.</>}
      actions={<><Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Keep registration</Button><Button variant="danger" onClick={submit} loading={pending} loadingLabel="Cancelling…">Confirm cancellation</Button></>}>
      <Field label="Reason" required hint="5–240 characters, plain text. Stored in the audit history, not shown to the runner." error={error}>
        <Textarea value={reason} maxLength={240} rows={3} onChange={event => { setReason(event.target.value); if (error) setError(reasonError(event.target.value)); }} disabled={pending} />
      </Field>
      {failure && <p role="alert" className="uss-ops-alert">{failure}</p>}
    </Modal>
  </>;
}

/** Downloads the server-built CSV. The server bounds rows, checks permission and writes the audit record first. */
export function ExportParticipantsButton({ eventId, status }: { eventId: string; status: string }) {
  const [pending, start] = useTransition(), [message, setMessage] = useState(""), [failed, setFailed] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  const run = () => {
    if (pending) return;
    start(async () => {
      const result = await exportParticipants(status ? { eventId, status } : { eventId });
      if (!result.ok) { setFailed(true); setMessage(participantMessage(result.code)); return; }
      const url = URL.createObjectURL(new Blob([result.data.csv], { type: "text/csv;charset=utf-8" }));
      const anchor = link.current!;
      anchor.href = url; anchor.download = result.data.filename; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFailed(false);
      setMessage(result.data.truncated ? `Exported the first ${result.data.rowCount} rows (limit ${result.data.maxRows}). Narrow the status filter to export the rest.` : `Exported ${result.data.rowCount} ${result.data.rowCount === 1 ? "row" : "rows"}. The export is recorded in the audit history.`);
    });
  };
  return <div className="uss-ops-export">
    <Button variant="secondary" onClick={run} loading={pending} loadingLabel="Preparing CSV…">Export CSV</Button>
    <a ref={link} hidden aria-hidden="true" tabIndex={-1} />
    <p role={failed ? "alert" : "status"} className="uss-ops-muted">{message}</p>
  </div>;
}

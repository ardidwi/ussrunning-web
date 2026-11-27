"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";
import { cancelNotification, resendNotification } from "./api/actions";
import { notificationMessage } from "./model";

/** Resend / cancel one queued notification. Both buttons lock while either request is in flight. */
export function NotificationControls({ id, version, resend, cancel, label }: { id: string; version: number; resend: boolean; cancel: boolean; label: string }) {
  const [pending, start] = useTransition(), [busy, setBusy] = useState<"" | "resend" | "cancel">(""), [message, setMessage] = useState(""), [failed, setFailed] = useState(false), [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const run = (kind: "resend" | "cancel") => {
    if (pending) return;
    setBusy(kind);
    start(async () => {
      const result = kind === "resend" ? await resendNotification({ id, expectedVersion: version }) : await cancelNotification({ id, expectedVersion: version });
      if (result.ok) {
        const code: string = "code" in result && typeof result.code === "string" ? result.code : "NOTIFICATION_CANCELLED_OK";
        setFailed(code === "NOTIFICATION_SEND_FAILED");
        setMessage(code === "NOTIFICATION_CANCELLED_OK" ? "Notification cancelled. It stays in the history." : notificationMessage(code));
        setConfirm(false);
        router.refresh();
      } else { setFailed(true); setMessage(notificationMessage(result.code)); }
      setBusy("");
    });
  };
  if (!resend && !cancel) return null;
  return <div className="uss-ops-actions">
    {resend && <Button variant="secondary" onClick={() => run("resend")} loading={pending && busy === "resend"} loadingLabel="Sending…" disabled={pending} aria-label={`Send now: ${label}`}>Send now</Button>}
    {cancel && <Button variant="ghost" onClick={() => setConfirm(true)} disabled={pending} aria-label={`Cancel: ${label}`}>Cancel</Button>}
    <p role={failed ? "alert" : "status"} className="uss-ops-muted">{message}</p>
    <Modal open={confirm} onClose={() => !pending && setConfirm(false)} title="Cancel this notification?" description="It will not be sent by the scheduler or staff. The record and its history are kept."
      actions={<><Button variant="secondary" onClick={() => setConfirm(false)} disabled={pending}>Keep it</Button><Button variant="danger" onClick={() => run("cancel")} loading={pending && busy === "cancel"} loadingLabel="Cancelling…">Cancel notification</Button></>} />
  </div>;
}

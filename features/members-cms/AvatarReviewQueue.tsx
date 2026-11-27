"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, EmptyState, Field, LinkButton, Textarea } from "@/components/ui";
import { moderateMemberAvatar } from "@/lib/member/identity-actions";
import type { AvatarQueueItem, AvatarQueuePage } from "@/lib/admin-users/user-types";
import { PHOTO_MESSAGES, PHOTO_REASON_LIMITS, PHOTO_REJECTION_PRESETS, STATUS_LABELS, formatDate, isConflict, messageFor, reasonError } from "./model";

type Review = (input: { accountId: string; avatarId: string; decision: "approved" | "rejected"; reason?: string }) =>
  Promise<{ ok: true } | { ok: false; code: string }>;

function QueueCard({ item, review, onDone }: { item: AvatarQueueItem; review: Review; onDone: (message: string) => void }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const lock = useRef(false);
  const validation = reasonError(reason, PHOTO_REASON_LIMITS);

  async function decide(decision: "approved" | "rejected") {
    if (decision === "rejected") { setTouched(true); if (validation) return; }
    if (lock.current) return;
    lock.current = true; setBusy(decision); setError(null);
    try {
      const result = await review({ accountId: item.accountId, avatarId: item.avatarId, decision,
        ...(decision === "rejected" ? { reason: reason.trim() } : {}) });
      if (result.ok) onDone(decision === "approved" ? `Photo for ${item.name} approved.` : `Photo for ${item.name} rejected. The member is asked to upload a new photo.`);
      else setError({ code: result.code, message: messageFor(PHOTO_MESSAGES, result.code) });
    } catch {
      setError({ code: "NETWORK_ERROR", message: "We couldn't reach the server. Nothing was changed; try again." });
    } finally {
      lock.current = false; setBusy(null);
    }
  }

  return (
    <li className="uss-admin-photo-card">
      <article aria-labelledby={`photo-${item.avatarId}`}>
        <div className="uss-admin-photo">
          {item.photo
            ? <img src={item.photo} alt={`Profile photo submitted by ${item.name}`} width={512} height={512} referrerPolicy="no-referrer" loading="lazy" />
            : <span>Preview unavailable</span>}
        </div>
        <h3 id={`photo-${item.avatarId}`}>{item.name}</h3>
        <p className="uss-admin-secondary"><code>{item.memberId}</code> · {STATUS_LABELS[item.status]}</p>
        <p className="uss-admin-secondary">Uploaded {formatDate(item.uploadedAt)}</p>
        {!rejecting ? (
          <div className="uss-admin-button-row uss-admin-touch">
            <Button loading={busy === "approved"} loadingLabel="Approving…" disabled={busy !== null} onClick={() => void decide("approved")}>Approve</Button>
            <Button variant="danger" disabled={busy !== null} onClick={() => { setRejecting(true); setError(null); }}>Reject…</Button>
          </div>
        ) : (
          <div className="uss-admin-reject">
            <fieldset className="uss-admin-presets">
              <legend>Common reasons</legend>
              {PHOTO_REJECTION_PRESETS.map(preset => (
                <button type="button" key={preset} className="uss-admin-chip" aria-pressed={reason === preset}
                  disabled={busy !== null} onClick={() => { setReason(preset); setTouched(true); }}>{preset}</button>
              ))}
            </fieldset>
            <Field id={`reject-${item.avatarId}`} label="Reason shown to the member" required
              hint="5–240 characters, plain text." error={touched ? validation ?? undefined : undefined}>
              <Textarea id={`reject-${item.avatarId}`} rows={2} maxLength={PHOTO_REASON_LIMITS.max} value={reason}
                disabled={busy !== null} onChange={event => setReason(event.target.value)} onBlur={() => setTouched(true)} />
            </Field>
            <div className="uss-admin-button-row uss-admin-touch">
              <Button variant="danger" loading={busy === "rejected"} loadingLabel="Rejecting…" disabled={busy !== null} onClick={() => void decide("rejected")}>Reject photo</Button>
              <Button variant="secondary" disabled={busy !== null} onClick={() => { setRejecting(false); setReason(""); setTouched(false); }}>Cancel</Button>
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="uss-admin-error">
            <p>{error.message}</p>
            {isConflict(error.code) && <Button variant="secondary" onClick={() => router.refresh()}>Reload queue</Button>}
          </div>
        )}
      </article>
    </li>
  );
}

/** K-01 review queue: uploads are live immediately; rejecting needs a reason and returns the member to onboarding. */
export function AvatarReviewQueue({ initial, cursor, review = moderateMemberAvatar as Review }: {
  initial: AvatarQueuePage; cursor: string; review?: Review;
}) {
  const [items, setItems] = useState(initial.items);
  const [handled, setHandled] = useState(0);
  const [notice, setNotice] = useState("");
  const remaining = Math.max(0, initial.total - handled);
  return (
    <section className="uss-admin-workspace" aria-labelledby="moderation-heading">
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / PHOTO REVIEW</p>
        <h1 id="moderation-heading">PHOTO REVIEW.</h1>
        <p>New profile photos are live as soon as they are uploaded. Approve to confirm, or reject with a reason: the member's card,
          RSVP and event pass pause until they upload a new photo.</p>
        <p><Badge tone={remaining ? "warning" : "success"}>{remaining} waiting</Badge></p>
      </header>
      <p className="uss-admin-notice" role="status" aria-live="polite">{notice}</p>
      {!items.length ? (
        <div className="uss-member-panel">
          <EmptyState title={initial.items.length ? "This page is done." : "No photos waiting for review."}
            description={initial.items.length ? "Load the queue again to see the next photos." : "New uploads appear here oldest first."}
            action={initial.items.length || cursor ? <LinkButton href="/admin?module=moderation" variant="secondary">Reload queue ↗</LinkButton> : undefined} />
        </div>
      ) : (
        <ul className="uss-admin-photo-grid">
          {items.map(item => (
            <QueueCard key={item.avatarId} item={item} review={review} onDone={message => {
              setItems(current => current.filter(entry => entry.avatarId !== item.avatarId));
              setHandled(count => count + 1);
              setNotice(message);
            }} />
          ))}
        </ul>
      )}
      <nav className="uss-admin-pager" aria-label="Photo review pages">
        {cursor && <LinkButton href="/admin?module=moderation" variant="text">First page ↗</LinkButton>}
        {initial.nextCursor && items.length > 0 && (
          <LinkButton href={`/admin?module=moderation&cursor=${encodeURIComponent(initial.nextCursor)}`} variant="secondary">Next photos ↗</LinkButton>
        )}
      </nav>
    </section>
  );
}

"use client";
import { useRef, useState } from "react";
import { downloadMemberCard } from "../utils/download-card";
import type { MemberCardPresentationDTO } from "@/lib/member/member-card-types";
import { Badge, Button } from "@/components/ui";
import { MemberAvatar } from "./MemberAvatar";
import { MemberBarcode } from "./MemberBarcode";
export function MemberCard({ card }: { card: MemberCardPresentationDTO }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function download() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try { await downloadMemberCard(card); }
    catch { setMessage("We couldn't download the card. Refresh your account status and try again."); }
    finally { setBusy(false); lock.current = false; }
  }
  return (
    <article
      className="uss-member-card"
      aria-label="Your USS Running Member Card"
    >
      <div className="uss-card-brand">
        <img src="/uss-logo.png" alt="USS Running" width="140" height="50" />
        <span>COMMUNITY IN MOTION</span>
      </div>
      <div className="uss-card-identity">
        <MemberAvatar avatar={card.avatar} displayName={card.displayName} />
        <div>
          <h2>{card.displayName}</h2>
          <Badge tone="success">Active · Email verified</Badge>
        </div>
      </div>
      <dl>
        <dt>Member ID</dt>
        <dd>{card.memberId}</dd>
      </dl>
      <MemberBarcode value={card.barcode.value} />
      <Button variant="secondary" disabled={busy || !card.avatar} onClick={download}>
        {busy ? "Preparing card…" : "Download Member Card (PNG)"}
      </Button>
      {!card.avatar && <p role="status">Refresh your account status to load your profile photo for download.</p>}
      {message && <p role="alert">{message}</p>}
      <p className="uss-card-disclaimer">
        Show this card to USS staff when they need to confirm your membership. Staff see your current status when they scan it.
      </p>
    </article>
  );
}

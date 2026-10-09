"use client";
import type { MemberCardPresentationDTO } from "@/lib/member/member-card-types";
import { Badge } from "@/components/ui";
import { MemberAvatar } from "./MemberAvatar";
import { MemberBarcode } from "./MemberBarcode";
export function MemberCard({ card }: { card: MemberCardPresentationDTO }) {
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
      <MemberBarcode value={card.barcode.value} memberId={card.memberId} />
      <p className="uss-card-disclaimer">
        This card identifies your USS membership. It does not sign you in,
        reserve an event place or confirm attendance. A downloaded barcode does
        not confirm current account status.
      </p>
    </article>
  );
}

"use client";
import { useState } from "react";
import type { AvatarDTO } from "@/lib/member/profile-types";
import { initials } from "../utils/presentation";
/** Shared identity media; never encodes or generates a barcode. */
export function MemberAvatar({
  avatar,
  displayName,
}: {
  avatar: AvatarDTO | null;
  displayName: string;
}) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  return (
    <div className="uss-card-avatar">
      {avatar && failedAvatar !== avatar.url ? (
        <img
          ref={(image) => {
            if (image?.complete && image.naturalWidth === 0)
              setFailedAvatar(avatar.url);
          }}
          src={avatar.url}
          alt={avatar.altText || "Member avatar"}
          width="64"
          height="64"
          referrerPolicy="no-referrer"
          onError={() => setFailedAvatar(avatar.url)}
        />
      ) : (
        <span aria-label="Member initials">{initials(displayName)}</span>
      )}
    </div>
  );
}

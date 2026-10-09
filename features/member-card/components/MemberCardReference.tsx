"use client";
import type { MemberCardResult } from "@/lib/member/member-card-types";
import { MemberCardScreen, MemberCardSkeleton } from "./MemberCardScreen";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
const barcode = "USS-11111111-1111-4111-8111-111111111111";
export default function MemberCardReference({
  scenario,
}: {
  scenario: string;
}) {
  if (process.env.NODE_ENV !== "development") return null;
  const codes = {
    anonymous: "UNAUTHENTICATED",
    pending: "EMAIL_NOT_VERIFIED",
    suspended: "ACCOUNT_SUSPENDED",
    deactivated: "ACCOUNT_DEACTIVATED",
    server: "PROFILE_UNAVAILABLE",
    empty: "PROFILE_NOT_FOUND",
  } as const;
  const code = codes[scenario as keyof typeof codes];
  const initial: MemberCardResult = code
    ? { ok: false, code }
    : {
        ok: true,
        code: "MEMBER_CARD_AVAILABLE",
        data: {
          displayName:
            scenario === "long"
              ? "A very long fictional USS runner display name that must wrap without clipping on narrow screens"
              : "Preview Runner",
          memberId: "USS-PREVIEW",
          status: "active",
          barcode: {
            value: scenario === "invalid" ? "invalid" : barcode,
            formatVersion: 1,
          },
          avatar:
            scenario === "avatar"
              ? {
                  id: "preview",
                  url: "https://invalid.example/avatar.png",
                  altText: "Fictional avatar",
                  width: 64,
                  height: 64,
                }
              : null,
        },
      };
  return (
    <MemberDashboardShell activePath="/dashboard/member-card">
      <p className="uss-reference-disclosure">
        Development reference. Fictional identity only; no production accounts
        or permissions.
      </p>
      {scenario === "loading" ? (
        <MemberCardSkeleton />
      ) : scenario === "forbidden" ? (
        <ServiceFeedback
          code="INSUFFICIENT_PERMISSION"
          returnTo="/dashboard/member-card"
        />
      ) : (
        <MemberCardScreen
          initial={initial}
          adapter={async () => {
            if (process.env.NODE_ENV !== "development")
              return { ok: false, code: "PROFILE_UNAVAILABLE" };
            await new Promise((resolve) => setTimeout(resolve, 400));
            if (scenario === "network")
              throw new Error("Fictional network failure");
            return initial;
          }}
        />
      )}
    </MemberDashboardShell>
  );
}

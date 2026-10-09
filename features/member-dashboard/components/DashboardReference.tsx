"use client";
import { useState } from "react";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { ROLE_PERMISSIONS, type SystemRole } from "@/lib/authz/permissions";
import type { DashboardResult } from "../model";
import { DashboardScreen } from "./DashboardScreen";
import { DashboardLoading } from "./DashboardLoading";
// Fictional visual review only. Independently gated here and in the server reference route.
export default function DashboardReference({
  scenario,
  role,
}: {
  scenario: string;
  role: SystemRole;
}) {
  const [requests, setRequests] = useState(0);
  if (process.env.NODE_ENV !== "development") return null;
  const codes = {
    pending: "EMAIL_NOT_VERIFIED",
    suspended: "ACCOUNT_SUSPENDED",
    deactivated: "ACCOUNT_DEACTIVATED",
    unauthenticated: "UNAUTHENTICATED",
    denied: "INSUFFICIENT_PERMISSION",
    unavailable: "AUTH_NOT_CONFIGURED",
    server: "PROFILE_UNAVAILABLE",
    network: "NETWORK_ERROR",
  } as const;
  const code = codes[scenario as keyof typeof codes];
  const ready: DashboardResult = {
    ok: true,
    data: {
      displayName:
        scenario === "long"
          ? "A fictional runner with an intentionally long name to verify wrapping on the narrowest member dashboard"
          : "Preview Runner",
      memberId: "USS-PREVIEW",
      status: "active",
      emailVerified: true,
      avatar:
        scenario === "avatar-error"
          ? {
              id: "fictional",
              url: "https://example.invalid/avatar.png",
              altText: null,
              width: 64,
              height: 64,
            }
          : null,
      completion:
        scenario === "complete"
          ? { percentage: 100, missingFields: [] }
          : {
              percentage: 20,
              missingFields: ["phone", "city", "emergencyContact"],
            },
    },
  };
  const initial: DashboardResult = code ? { ok: false, code } : ready;
  async function adapter(): Promise<DashboardResult> {
    if (process.env.NODE_ENV !== "development")
      return { ok: false, code: "PROFILE_UNAVAILABLE" };
    setRequests((count) => count + 1);
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (scenario === "refresh-network")
      throw new Error("Fictional network failure");
    if (scenario === "refresh-suspended")
      return { ok: false, code: "ACCOUNT_SUSPENDED" };
    return initial;
  }
  return (
    <PermissionsProvider
      snapshot={
        code
          ? null
          : {
              roles: [role],
              permissions: ROLE_PERMISSIONS[role],
              displayName: "Fictional reviewer",
            }
      }
    >
      <MemberDashboardShell activePath="/dashboard">
        <p className="uss-reference-disclosure" role="note">
          Development reference. Fictional data; no session, profile,
          registration or event pass is created.
        </p>
        <output aria-label="Development request count">
          Requests: {requests}
        </output>
        {scenario === "loading" ? (
          <DashboardLoading />
        ) : (
          <DashboardScreen initial={initial} adapter={adapter} />
        )}
      </MemberDashboardShell>
    </PermissionsProvider>
  );
}

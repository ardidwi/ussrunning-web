"use client";
import { useState } from "react";
import ScannerScreen from "./ScannerScreen";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import type { CheckInCode, ScanResult } from "@/lib/checkin/check-in-types";
import { scanMessages, type ContextResult } from "../model";
export default function ScannerReference({ scenario }: { scenario: string }) {
  const [requests, setRequests] = useState(0);
  if (process.env.NODE_ENV !== "development") return null;
  const event = {
    id: "11111111-1111-4111-8111-111111111111",
    title:
      scenario === "long"
        ? "Preview Community Run with an intentionally long event title for small screens"
        : "Preview Community Run",
    startsAt: "2035-10-12T00:00:00Z",
    endsAt: "2035-10-12T04:00:00Z",
    timezone: "Asia/Jakarta",
    status: "registration_closed",
  };
  const initial: ContextResult = scenario.startsWith("access-")
    ? { ok: false, code: scenario.slice(7) }
    : { ok: true, data: event };
  const permissions = scenario === "member" ? [] : ["events.manage" as const];
  return (
    <PermissionsProvider
      snapshot={{
        roles: [scenario === "member" ? "member" : "admin"],
        permissions,
        displayName: "Preview Crew",
      }}
    >
      <MemberDashboardShell>
        <p role="note">
          Development scanner fixture. No real attendance is recorded. Requests:{" "}
          <span data-testid="requests">{requests}</span>
        </p>
        <ScannerScreen
          eventId={event.id}
          initial={initial}
          adapter={{
            read: async () => initial,
            scan: async () => {
              if (process.env.NODE_ENV !== "development")
                return { ok: false, code: "FORBIDDEN" };
              setRequests((n) => n + 1);
              await new Promise((resolve) =>
                setTimeout(resolve, scenario === "slow" ? 1500 : 80),
              );
              if (scenario === "network")
                throw new Error("Fixture unavailable");
              const code = (
                Object.hasOwn(scanMessages, scenario)
                  ? scenario
                  : "CHECK_IN_SUCCESS"
              ) as CheckInCode;
              if (code !== "CHECK_IN_SUCCESS" && code !== "ALREADY_CHECKED_IN")
                return {
                  ok: false,
                  code,
                  retryAfterSeconds:
                    code === "CHECK_IN_RATE_LIMITED" ? 2 : undefined,
                };
              return {
                ok: true,
                code,
                data: {
                  event: {
                    id: scenario === "scope" ? "other-event" : event.id,
                    title: event.title,
                    timezone: event.timezone,
                  },
                  member: {
                    memberId: "USS-001234",
                    displayName:
                      scenario === "long"
                        ? "Fictional runner with an intentionally long display name for narrow screen verification"
                        : "Preview Runner",
                  },
                  registration: {
                    id: "registration-private-id",
                    status: "confirmed",
                  },
                  checkIn: {
                    id: "attendance-private-id",
                    passId: "pass-private-id",
                    checkedInAt: "2035-10-12T00:30:00Z",
                    status: "checked_in",
                  },
                },
              } satisfies ScanResult;
            },
          }}
        />
      </MemberDashboardShell>
    </PermissionsProvider>
  );
}

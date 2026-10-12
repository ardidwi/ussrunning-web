"use client";
import { useState } from "react";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { PageLoading, Skeleton } from "@/components/ui";
import type { RegistrationDTO } from "@/lib/registrations/registration-types";
import type { EventPassDTO } from "@/lib/passes/pass-types";
import { EventPassScreen } from "./EventPassScreen";
import { PassEntry } from "./PassEntry";
import { DashboardRegistrations } from "@/features/event-registration/components/DashboardRegistrations";
import { RegistrationHistory } from "@/features/event-registration/components/RegistrationHistory";
import type { PassScreenResult } from "../model";
import type { QrBranding } from "@/features/qr/branding";

export default function PassReference({ scenario }: { scenario: string }) {
  const [requests, setRequests] = useState(0);
  if (process.env.NODE_ENV !== "development") return null;
  const reference = {
    eventId: "11111111-1111-4111-8111-111111111111",
    registrationId: "22222222-2222-4222-8222-222222222222",
  };
  const registration: RegistrationDTO = {
    id: reference.registrationId,
    event: {
      id: reference.eventId,
      slug: "preview-run",
      title:
        scenario === "long"
          ? "A fictional event with an intentionally long editorial title for narrow screens and high zoom"
          : "Preview Community Run",
      startsAt: "2035-10-12T00:00:00Z",
      timezone: "Asia/Jakarta",
      status: "registration_open",
    },
    status:
      scenario === "waitlisted"
        ? "waitlisted"
        : scenario === "cancelled"
          ? "cancelled"
          : "confirmed",
    registeredAt: "2035-10-01T00:00:00Z",
    updatedAt: "2035-10-01T00:00:00Z",
    cancelledAt: scenario === "cancelled" ? "2035-10-02T00:00:00Z" : null,
    version: "a".repeat(64),
  };
  const pass: EventPassDTO = {
    id: "33333333-3333-4333-8333-333333333333",
    ...reference,
    status: "active",
    issuedAt: "2035-10-01T00:00:00Z",
    expiresAt:
      scenario === "expiry"
        ? new Date(Date.now() + 4000).toISOString()
        : "2035-10-12T03:00:00Z",
    formatVersion: 1,
    barcode: {
      value: "USS-EVENT:1:abcdefghijklmnopqrstuvwxyz0123456789ABCDEFw",
      formatVersion: 1,
    },
  };
  const codes = {
    none: "EVENT_PASS_NOT_FOUND",
    waitlisted: "EVENT_PASS_NOT_ELIGIBLE",
    cancelled: "EVENT_PASS_REVOKED",
    revoked: "EVENT_PASS_REVOKED",
    expired: "EVENT_PASS_EXPIRED",
    ineligible: "EVENT_PASS_NOT_ELIGIBLE",
    unavailable: "EVENT_PASS_NOT_CONFIGURED",
    server: "EVENT_PASS_UNAVAILABLE",
    network: "NETWORK_ERROR",
    unauthenticated: "UNAUTHENTICATED",
    pending: "EMAIL_NOT_VERIFIED",
    suspended: "ACCOUNT_SUSPENDED",
    deactivated: "ACCOUNT_DEACTIVATED",
    denied: "INSUFFICIENT_PERMISSION",
  } as const;
  const ready: PassScreenResult = {
    ok: true,
    data: { registration, pass: { ok: true, data: pass } },
  };
  const code = codes[scenario as keyof typeof codes];
  const initial: PassScreenResult = code
    ? [
        "unauthenticated",
        "pending",
        "suspended",
        "deactivated",
        "denied",
        "network",
      ].includes(scenario)
      ? { ok: false, code }
      : {
          ok: true,
          data: {
            registration,
            pass: { ok: false, code },
          },
        }
    : ready;
  async function adapter(): Promise<PassScreenResult> {
    if (process.env.NODE_ENV !== "development")
      return { ok: false, code: "EVENT_PASS_UNAVAILABLE" };
    setRequests((n) => n + 1);
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (
      scenario === "expiry" &&
      pass.expiresAt &&
      Date.now() >= Date.parse(pass.expiresAt)
    )
      return {
        ok: true,
        data: { registration, pass: { ok: false, code: "EVENT_PASS_EXPIRED" } },
      };
    if (scenario === "refresh-revoked")
      return {
        ok: true,
        data: { registration, pass: { ok: false, code: "EVENT_PASS_REVOKED" } },
      };
    if (scenario === "refresh-denied")
      return { ok: false, code: "INSUFFICIENT_PERMISSION" };
    if (scenario === "refresh-network")
      throw new Error("Fictional request failure");
    return ready;
  }
  async function entry() {
    if (process.env.NODE_ENV !== "development")
      return { ok: false as const, code: "EVENT_PASS_UNAVAILABLE" };
    setRequests((n) => n + 1);
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true as const, available: true };
  }
  const history = {
    ok: true as const,
    data: { items: [registration], nextCursor: null },
  };
  const branding: QrBranding =
    scenario === "plain"
      ? { centerLogoUrl: null }
      : scenario === "custom"
        ? { centerLogoUrl: "/design-system/qr-fixture" }
        : scenario === "logo-error"
          ? { centerLogoUrl: "/missing-preview-logo.svg" }
          : scenario === "oversized"
            ? { logoScale: 10, logoPadding: 10, quietZone: 0 }
            : {};
  return (
    <MemberDashboardShell>
      <p>Development-only fictional Event Pass. Not valid for admission.</p>
      <p role="status">Requests: {requests}</p>
      {scenario === "loading" ? (
        <PageLoading label="Loading Event Pass">
          <Skeleton height="28rem" />
        </PageLoading>
      ) : scenario === "dashboard" ? (
        <DashboardRegistrations
          initial={history}
          adapter={async () => history}
          passAdapter={entry}
        />
      ) : scenario === "history" ? (
        <RegistrationHistory
          initial={history}
          adapter={{
            read: async () => history,
            cancel: async () => ({
              ok: false,
              code: "REGISTRATION_UNAVAILABLE",
            }),
          }}
          passAdapter={entry}
        />
      ) : scenario === "entry" ? (
        <PassEntry reference={reference} adapter={entry} />
      ) : (
        <EventPassScreen
          reference={reference}
          initial={initial}
          branding={branding}
          adapter={{ read: adapter, issue: adapter }}
        />
      )}
    </MemberDashboardShell>
  );
}

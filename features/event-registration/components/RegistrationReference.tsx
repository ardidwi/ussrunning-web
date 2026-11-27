"use client";
import { useState } from "react";
import type { PublicEventDTO } from "@/lib/events/event-types";
import type {
  RegistrationDTO,
  RegistrationPage,
} from "@/lib/registrations/registration-types";
import type { RegistrationResult } from "@/lib/registrations/registration-actions";
import type { HistoryResult } from "../model";
import { PublicEventDetail } from "./PublicEventDetail";
import { RegistrationHistory } from "./RegistrationHistory";
import { DashboardRegistrations } from "./DashboardRegistrations";
import { EventRegistration } from "./EventRegistration";
// Fictional, production-inaccessible interaction fixtures. Never a production fallback.
export default function RegistrationReference({
  scenario,
  view,
}: {
  scenario: string;
  view?: string;
}) {
  const [calls, setCalls] = useState(0);
  if (process.env.NODE_ENV !== "development") return null;
  const event: PublicEventDTO = {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "preview-run",
    cover: null,
    title:
      scenario === "long"
        ? "Fictional community run with a deliberately long title that must wrap without hiding any registration actions"
        : "Preview community run",
    eventType: "Community run",
    summary:
      "Development-only event reference. No real registration is created.",
    description: {
      paragraphs: [
        "Run together. This fictional event tests the registration interface.",
      ],
    },
    startsAt: "2027-01-15T23:00:00Z",
    endsAt: null,
    timezone: "Asia/Jakarta",
    venueName: "Preview meeting point",
    locationText: "Jakarta",
    mapUrl: null,
    registrationOpensAt: "2026-10-01T00:00:00Z",
    registrationClosesAt: "2027-01-14T00:00:00Z",
    capacity: 20,
    waitlistEnabled: true,
    status:
      scenario === "closed-event" ? "registration_closed" : "registration_open",
  };
  const record: RegistrationDTO = {
    id: "00000000-0000-4000-8000-000000000002",
    event,
    status:
      scenario === "waitlisted"
        ? "waitlisted"
        : scenario === "cancelled"
          ? "cancelled"
          : "confirmed",
    version: "a".repeat(64),
    registeredAt: "2026-10-09T03:00:00Z",
    cancelledAt: scenario === "cancelled" ? "2026-10-09T04:00:00Z" : null,
    updatedAt: "2026-10-09T03:00:00Z",
  };
  const failures: Record<string, string> = {
    unauthenticated: "UNAUTHENTICATED",
    pending: "EMAIL_NOT_VERIFIED",
    suspended: "ACCOUNT_SUSPENDED",
    deactivated: "ACCOUNT_DEACTIVATED",
    unavailable: "REGISTRATION_UNAVAILABLE",
    denied: "INSUFFICIENT_PERMISSION",
    network: "NETWORK_ERROR",
  };
  const error = failures[scenario];
  const initial: HistoryResult = error
    ? {
        ok: false,
        code: error as Extract<HistoryResult, { ok: false }>["code"],
      }
    : {
        ok: true,
        data: {
          items:
            (view === "event" && scenario !== "duplicate") ||
            scenario === "empty"
              ? []
              : [record],
          nextCursor: scenario === "pages" ? "fictional-cursor" : null,
        },
      };
  async function pause() {
    setCalls((c) => c + 1);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  async function read(
    cursor: string | null = null,
  ): Promise<RegistrationResult<RegistrationPage<RegistrationDTO>>> {
    await pause();
    return process.env.NODE_ENV !== "development"
      ? { ok: false, code: "REGISTRATION_UNAVAILABLE" }
      : {
          ok: true,
          data: {
            items: cursor
              ? [
                  {
                    ...record,
                    id: "next-record",
                    event: { ...record.event, title: "Older preview run" },
                  },
                ]
              : [record],
            nextCursor: null,
          },
        };
  }
  async function register(): Promise<RegistrationResult<RegistrationDTO>> {
    await pause();
    if (process.env.NODE_ENV !== "development")
      return { ok: false, code: "REGISTRATION_UNAVAILABLE" };
    const code =
      scenario === "full"
        ? "EVENT_CAPACITY_FULL"
        : scenario === "closed"
          ? "REGISTRATION_CLOSED"
          : scenario === "private"
            ? "REGISTRATION_NOT_AVAILABLE"
            : scenario === "unsupported"
              ? "REGISTRATION_CONFIGURATION_UNSUPPORTED"
              : null;
    if (scenario === "network-submit")
      throw new Error("Fictional network failure");
    return code ? { ok: false, code } : { ok: true, data: record };
  }
  async function cancel(): Promise<RegistrationResult<RegistrationDTO>> {
    await pause();
    if (process.env.NODE_ENV !== "development")
      return { ok: false, code: "REGISTRATION_UNAVAILABLE" };
    return scenario === "stale"
      ? { ok: false, code: "REGISTRATION_CONFLICT" }
      : scenario === "noncancellable"
        ? { ok: false, code: "REGISTRATION_NOT_CANCELLABLE" }
        : {
            ok: true,
            data: {
              ...record,
              status: "cancelled",
              cancelledAt: "2026-10-09T04:00:00Z",
            },
          };
  }
  return (
    <main className="uss-member-shell-main">
      <p>
        Development-only fictional reference. Requests: <output>{calls}</output>
      </p>
      {view === "event" ? (
        <PublicEventDetail
          event={event}
          registration={initial}
          registrationPanel={
            <EventRegistration
              event={event}
              initial={initial}
              adapter={{ read, register }}
            />
          }
        />
      ) : view === "dashboard" ? (
        <DashboardRegistrations
          initial={initial}
          adapter={read}
          passAdapter={async () => ({
            ok: false,
            code: "EVENT_PASS_UNAVAILABLE",
          })}
        />
      ) : (
        <RegistrationHistory
          initial={initial}
          adapter={{ read, cancel }}
          passAdapter={async () => ({
            ok: false,
            code: "EVENT_PASS_UNAVAILABLE",
          })}
        />
      )}
    </main>
  );
}

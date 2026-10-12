"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  LinkButton,
  PageLoading,
  Skeleton,
} from "@/components/ui";
import { BrandedQrCode } from "@/features/qr/BrandedQrCode";
import type { QrBranding } from "@/features/qr/branding";
import {
  eventDate,
  registrationLabels,
} from "@/features/event-registration/model";
import { readEventPass, requestEventPass } from "../api/actions";
import {
  activePassMatches,
  passPath,
  type PassReference,
  type PassScreenResult,
} from "../model";
import { PassFeedback } from "./PassFeedback";
const defaultAdapter = { read: readEventPass, issue: requestEventPass };
export function EventPassScreen({
  reference,
  initial,
  branding,
  adapter = defaultAdapter,
}: {
  reference: PassReference;
  initial: PassScreenResult;
  branding?: QrBranding;
  adapter?: { read: typeof readEventPass; issue: typeof requestEventPass };
}) {
  const [result, setResult] = useState(initial),
    [phase, setPhase] = useState<"idle" | "loading" | "issuing">("idle");
  const busy = useRef(false),
    mounted = useRef(true);
  const checkedExpiry = useRef<string | null>(null);
  const refreshFocus = useRef<HTMLDivElement>(null),
    errorFocus = useRef<HTMLDivElement>(null),
    restoring = useRef(false);
  useEffect(() => {
    if (phase === "idle" && restoring.current) {
      restoring.current = false;
      (
        refreshFocus.current?.querySelector("button") ?? errorFocus.current
      )?.focus();
    }
  }, [phase, result]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const request = useCallback(
    async (issue = false, restoreFocus = true) => {
      if (busy.current) return;
      busy.current = true;
      restoring.current = restoreFocus;
      setPhase(issue ? "issuing" : "loading");
      try {
        const next = await (issue ? adapter.issue : adapter.read)({
          eventId: reference.eventId,
          registrationId: reference.registrationId,
        });
        if (mounted.current) setResult(next);
      } catch {
        if (mounted.current) setResult({ ok: false, code: "NETWORK_ERROR" });
      } finally {
        busy.current = false;
        if (mounted.current) setPhase("idle");
      }
    },
    [adapter, reference.eventId, reference.registrationId],
  );
  useEffect(() => {
    if (!result.ok || !result.data.pass.ok || !result.data.pass.data.expiresAt)
      return;
    const expiry = result.data.pass.data.expiresAt;
    const deadline = Date.parse(expiry);
    if (!Number.isFinite(deadline) || checkedExpiry.current === expiry) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = deadline - Date.now();
      if (remaining > 0)
        timer = setTimeout(check, Math.min(remaining, 2147483647));
      else if (busy.current) timer = setTimeout(check, 1000);
      else {
        checkedExpiry.current = expiry;
        void request(false, false);
      }
    };
    check();
    return () => clearTimeout(timer);
  }, [result, request]);
  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState === "visible") void request(false, false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [request]);
  if (phase === "loading" || phase === "issuing")
    return (
      <PageLoading
        label={
          phase === "issuing" ? "Requesting Event Pass" : "Checking Event Pass"
        }
      >
        <Skeleton height="28rem" />
      </PageLoading>
    );
  if (!result.ok)
    return (
      <div className="uss-pass-error-focus" ref={errorFocus} tabIndex={-1}>
        <PassFeedback
          code={result.code}
          retry={() => request()}
          returnTo={passPath(reference)}
        />
      </div>
    );
  const { registration, pass } = result.data;
  const active =
    registration.status === "confirmed" &&
    !registration.cancelledAt &&
    pass.ok &&
    activePassMatches(pass.data, reference);
  const noPass = !pass.ok && pass.code === "EVENT_PASS_NOT_FOUND";
  return (
    <section className="uss-event-pass" aria-label="Event Pass">
      <div className="uss-pass-paper">
        <header>
          <p className="uss-member-kicker">USS RUNNING / EVENT PASS</p>
          <h1>{registration.event.title}</h1>
        </header>
        <dl>
          <div>
            <dt>Event</dt>
            <dd>
              <time dateTime={registration.event.startsAt}>
                {eventDate(
                  registration.event.startsAt,
                  registration.event.timezone,
                )}
              </time>
            </dd>
          </div>
          <div>
            <dt>Registration</dt>
            <dd>
              <Badge
                tone={
                  registration.status === "confirmed" ? "success" : "warning"
                }
              >
                {registrationLabels[registration.status]}
              </Badge>
            </dd>
          </div>
          <div>
            <dt>Pass</dt>
            <dd role="status" aria-live="polite">
              <Badge tone={active ? "success" : noPass ? "info" : "error"}>
                {active ? "Active" : noPass ? "Not issued" : "Unavailable"}
              </Badge>
            </dd>
          </div>
        </dl>
        {active && pass.ok ? (
          <>
            <BrandedQrCode
              key={pass.data.id}
              value={pass.data.barcode.value}
              branding={{ ...branding, errorCorrection: "H" }}
            />
            <h2>Present this at check-in.</h2>
            <p>
              Keep the full QR visible. Increase your screen brightness if
              needed.
            </p>
            <p className="uss-pass-note">
              Check-in staff verify current eligibility. A screenshot may stop
              working if your registration or pass changes.
            </p>
          </>
        ) : (
          <>
            {registration.status === "waitlisted" && (
              <p role="status">
                You're on the waitlist. An Event Pass is available only after
                confirmation and the event eligibility check.
              </p>
            )}
            {registration.status === "cancelled" && (
              <p role="status">
                This registration is cancelled. Do not use an earlier pass or
                screenshot.
              </p>
            )}
            <PassFeedback
              code={pass.ok ? "EVENT_PASS_UNAVAILABLE" : pass.code}
            />
            {noPass && registration.status === "confirmed" && (
              <Button onClick={() => request(true)}>Request Event Pass</Button>
            )}
          </>
        )}
      </div>
      <div className="uss-registration-actions" ref={refreshFocus}>
        <Button variant="secondary" onClick={() => request()}>
          Refresh pass status
        </Button>
        <LinkButton href="/dashboard/events" variant="text">
          Registration history ↗
        </LinkButton>
      </div>
      <p className="uss-dashboard-note">
        Event-specific pass. Your permanent Member Card is separate and does not
        reserve a place or confirm attendance.
      </p>
    </section>
  );
}

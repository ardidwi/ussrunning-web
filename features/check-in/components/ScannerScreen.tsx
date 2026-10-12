"use client";
import { useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { EmptyState } from "@/components/ui/EmptyState";
import { eventDate } from "@/features/event-registration/model";
import { readScannerContext, submitCheckIn } from "../api/actions";
import {
  blockedCode,
  passShape,
  retrySeconds,
  scanLatch,
  scanMessages,
  scopedResult,
  type ContextResult,
  type ScannerResult,
} from "../model";
import CameraScanner from "./CameraScanner";
export type ScannerAdapter = {
  read: typeof readScannerContext;
  scan: typeof submitCheckIn;
};
const production: ScannerAdapter = {
  read: readScannerContext,
  scan: submitCheckIn,
};
export default function ScannerScreen({
  eventId,
  initial,
  adapter = production,
}: {
  eventId: string;
  initial: ContextResult;
  adapter?: ScannerAdapter;
}) {
  const [context, setContext] = useState(initial),
    [phase, setPhase] = useState<
      "idle" | "submitting" | "result" | "refreshing"
    >("idle"),
    [result, setResult] = useState<ScannerResult | null>(null),
    [value, setValue] = useState(""),
    [wait, setWait] = useState(0);
  const lock = useRef(scanLatch()),
    mounted = useRef(true),
    resultRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  useEffect(() => {
    if (phase === "result") resultRef.current?.focus();
  }, [phase]);
  async function scan(payload: string) {
    if (!context.ok || phase !== "idle" || !lock.current.take()) return;
    setValue("");
    setPhase("submitting");
    setResult(null);
    let outcome: ScannerResult;
    try {
      outcome = passShape(payload)
        ? scopedResult(await adapter.scan(eventId, payload), eventId)
        : { ok: false, code: "PASS_INVALID" };
    } catch {
      outcome = { ok: false, code: "NETWORK_ERROR" };
    }
    if (!mounted.current) return;
    setResult(outcome);
    setWait(retrySeconds(outcome));
    setPhase("result");
  }
  async function refresh() {
    if (!lock.current.take()) return;
    setPhase("refreshing");
    setResult(null);
    setContext({ ok: false, code: "LOADING" });
    try {
      const next = await adapter.read(eventId);
      if (mounted.current) setContext(next);
    } catch {
      if (mounted.current) setContext({ ok: false, code: "NETWORK_ERROR" });
    } finally {
      if (mounted.current) {
        setPhase("idle");
        lock.current.release();
      }
    }
  }
  if (phase === "refreshing")
    return <p role="status">Checking crew access and event…</p>;
  if (
    !context.ok &&
    ["EVENT_NOT_FOUND", "EVENT_VALIDATION_ERROR"].includes(context.code)
  )
    return (
      <EmptyState
        title="Event unavailable."
        description="Choose an available event before scanning."
        action={
          <LinkButton href="/dashboard/check-in">Choose event</LinkButton>
        }
      />
    );
  if (!context.ok)
    return (
      <ServiceFeedback
        code={context.code}
        retry={() => void refresh()}
        returnTo={`/dashboard/check-in/${eventId}`}
      />
    );
  const event = context.data,
    restricted = result && !result.ok && blockedCode(result.code);
  return (
    <div className="uss-scanner">
      <header className="uss-member-panel">
        <p className="uss-member-kicker">CREW / EVENT CHECK-IN</p>
        <h1>{event.title}</h1>
        <p>{eventDate(event.startsAt, event.timezone)}</p>
        <p>
          Event status: {event.status.replaceAll("_", " ")}. Check-in
          availability is confirmed by the server when you scan.
        </p>
        <LinkButton variant="text" href="/dashboard/check-in">
          Change event ↗
        </LinkButton>
      </header>
      {phase === "result" && result ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className={`uss-member-panel uss-scanner-result ${result.ok ? "is-success" : "is-error"}`}
        >
          <p className="uss-member-kicker">
            {result.ok
              ? result.code === "ALREADY_CHECKED_IN"
                ? "EXISTING ATTENDANCE"
                : "ATTENDANCE CONFIRMED"
              : "CHECK-IN NOT CONFIRMED"}
          </p>
          <h2>
            {scanMessages[result.code] ??
              "Check-in is unavailable. Contact the event lead."}
          </h2>
          {result.ok && (
            <>
              <h3>{result.data.member.displayName}</h3>
              <p>Member ID: {result.data.member.memberId}</p>
              <p>{result.data.event.title} · Confirmed registration</p>
              <p>
                {eventDate(
                  result.data.checkIn.checkedInAt,
                  result.data.event.timezone,
                )}
              </p>
            </>
          )}
          {wait > 0 && <p>You can scan again in {wait} seconds.</p>}
          {restricted ? (
            <ServiceFeedback
              code={
                result.code === "FORBIDDEN"
                  ? "INSUFFICIENT_PERMISSION"
                  : result.code
              }
              returnTo={`/dashboard/check-in/${eventId}`}
            />
          ) : (
            <Button
              disabled={wait > 0}
              onClick={() => {
                setResult(null);
                setPhase("idle");
                lock.current.release();
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              Scan next
            </Button>
          )}
        </div>
      ) : null}
      <div className="uss-scanner-grid" hidden={phase === "result"}>
        <CameraScanner
          enabled={phase === "idle"}
          onDecode={(payload) => void scan(payload)}
        />
        <section className="uss-member-panel">
          <h2>Have the pass ready.</h2>
          <p>
            Scan the Event Pass QR for this event. A Member Card is an account
            identifier and cannot be used here.
          </p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void scan(value);
            }}
          >
            <Field
              id="manual-pass"
              label="Event Pass value"
              hint="If the camera is unavailable, paste the exact Event Pass value. This uses the same protected check-in."
            >
              <Input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={phase !== "idle"}
                autoComplete="off"
                spellCheck={false}
                maxLength={256}
              />
            </Field>
            <Button
              type="submit"
              disabled={!value || phase !== "idle"}
              loading={phase === "submitting"}
              loadingLabel="Checking pass…"
            >
              Check in
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

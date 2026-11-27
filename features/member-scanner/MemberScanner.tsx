"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import CameraScanner from "@/features/check-in/components/CameraScanner";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { lookupMemberBarcode, lookupMemberId } from "@/lib/member/identity-actions";
import type { IdentityResult, MembershipLookup } from "@/lib/member/identity-types";

const scannerErrors: Record<string, string> = {
  BARCODE_INVALID: "Enter the barcode from a USS Member Card.",
  MEMBER_ID_INVALID: "Enter a Member ID like USS-000123.",
  MEMBER_NOT_FOUND: "No member matched. Check the card or Member ID and try again.",
  IDENTITY_RATE_LIMITED: "Too many scans. Try again when the timer ends.",
  IDENTITY_UNAVAILABLE: "Member lookup is temporarily unavailable.",
};

type Lookup = (value: string) => Promise<IdentityResult<MembershipLookup>>;
/** Barcode scan, pasted barcode or typed Member ID: one server permission, quota (30/min) and audit trail. */
export function MemberScanner({ lookup = lookupMemberBarcode, lookupById = lookupMemberId }: {
  lookup?: Lookup;
  lookupById?: Lookup;
}) {
  const [result, setResult] = useState<IdentityResult<MembershipLookup> | null>(null);
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState("");
  const [memberId, setMemberId] = useState("");
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(0);
  const locked = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const announcement = useRef<HTMLElement>(null);
  const remaining = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  useEffect(() => {
    if (!waitUntil) return;
    const interval = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= waitUntil) setWaitUntil(0);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [waitUntil]);

  useEffect(() => {
    if (result) announcement.current?.focus();
  }, [result]);

  async function scan(barcode: string, read: Lookup = lookup) {
    if (locked.current || Date.now() < waitUntil) return;
    locked.current = true;
    setValue("");
    setMemberId("");
    setBusy(true);
    try {
      const next = await read(barcode);
      if (!next.ok && next.retryAfterSeconds) {
        const time = Date.now();
        setNow(time);
        setWaitUntil(time + next.retryAfterSeconds * 1000);
      }
      setResult(next);
    } catch {
      setResult({ ok: false, code: "IDENTITY_UNAVAILABLE" });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void scan(value.trim());
  }

  function submitMemberId(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void scan(memberId.trim(), lookupById);
  }

  function reset() {
    locked.current = false;
    setResult(null);
    window.requestAnimationFrame(() => input.current?.focus());
  }

  const blocked = result && !result.ok && !scannerErrors[result.code];
  return (
    <>
      <header className="uss-member-intro">
        <h1>Scan member.</h1>
        <p>Scan a USS Member Card, or type the Member ID printed on it, to verify the member's identity and current account status.</p>
      </header>
      <section className="uss-member-panel" aria-label="Member barcode lookup">
        {!result ? (
          <>
            {!busy && !remaining && <CameraScanner enabled onDecode={scan} subject="Member Card" />}
            <form className="uss-avatar-editor" onSubmit={submit}>
              <Field id="member-barcode" label="Member barcode" required>
                <Input ref={input} id="member-barcode" name="member-barcode" autoComplete="off"
                  spellCheck={false} required value={value} maxLength={80}
                  onChange={event => setValue(event.target.value)} disabled={busy || remaining > 0} />
              </Field>
              <Button type="submit" disabled={busy || remaining > 0}>{busy ? "Looking up member…" : "Look up barcode"}</Button>
            </form>
            <form className="uss-avatar-editor" onSubmit={submitMemberId} aria-label="Member ID lookup">
              <Field id="member-id" label="Member ID" required hint="Printed on the card, for example USS-000123. Lookups count toward the same limit as scans.">
                <Input id="member-id" name="member-id" autoComplete="off" autoCapitalize="characters" spellCheck={false} required
                  value={memberId} maxLength={40} inputMode="text" placeholder="USS-000123"
                  onChange={event => setMemberId(event.target.value)} disabled={busy || remaining > 0} />
              </Field>
              <Button type="submit" variant="secondary" disabled={busy || remaining > 0}>{busy ? "Looking up member…" : "Look up Member ID"}</Button>
            </form>
            {busy && <p role="status">Checking member status…</p>}
          </>
        ) : (
          <section ref={announcement} tabIndex={-1} aria-label="Scan result">
            {result.ok ? (
              <div className="uss-card-identity">
                {result.data.photo && <img className="uss-card-avatar" src={result.data.photo} alt="" width="84" height="84" referrerPolicy="no-referrer" />}
                <div>
                  <h2>{result.data.name}</h2>
                  <p>{result.data.memberId}</p>
                  <p>Account status: {result.data.status.replaceAll("_", " ")}</p>
                </div>
              </div>
            ) : blocked ? <ServiceFeedback code={result.code} returnTo="/admin?module=member-scanner" />
              : <p role="alert">{scannerErrors[result.code]}</p>}
            {remaining > 0 && <p>Try again in {remaining} seconds.</p>}
            {!blocked && <Button variant="secondary" disabled={remaining > 0} onClick={reset}>Scan another member</Button>}
          </section>
        )}
      </section>
    </>
  );
}

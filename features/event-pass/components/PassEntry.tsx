"use client";
import { useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui";
import { readPassEntry } from "../api/actions";
import { passPath, passMessages, type PassReference } from "../model";
export function PassEntry({
  reference,
  adapter = readPassEntry,
}: {
  reference: PassReference;
  adapter?: typeof readPassEntry;
}) {
  const [result, setResult] = useState<Awaited<
      ReturnType<typeof readPassEntry>
    > | null>(null),
    [loading, setLoading] = useState(false),
    busy = useRef(false);
  async function check() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setResult(null);
    try {
      setResult(await adapter(reference));
    } catch {
      setResult({ ok: false, code: "NETWORK_ERROR" });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <div className="uss-pass-entry">
      {result?.ok && result.available ? (
        <LinkButton href={passPath(reference)} variant="secondary">
          View Event Pass ↗
        </LinkButton>
      ) : result && !result.ok && result.code === "EVENT_PASS_NOT_FOUND" ? (
        <LinkButton href={passPath(reference)} variant="secondary">
          Request Event Pass ↗
        </LinkButton>
      ) : (
        <Button
          variant="secondary"
          loading={loading}
          loadingLabel="Checking pass…"
          onClick={check}
        >
          Check Event Pass
        </Button>
      )}
      {result && !result.ok && result.code !== "EVENT_PASS_NOT_FOUND" && (
        <p role="status">
          {passMessages[result.code] ??
            "Open your registration to check access to this pass."}
        </p>
      )}
    </div>
  );
}

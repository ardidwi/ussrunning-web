"use client";
import { Button, LinkButton, PageLoading, Skeleton } from "@/components/ui";
import { useRef, useState } from "react";
import type { HistoryResult } from "../model";
import { readHistory } from "../api/actions";
import { RegistrationFeedback } from "./RegistrationFeedback";
import { RegistrationList } from "./RegistrationList";
export function DashboardRegistrations({
  initial,
  adapter = readHistory,
}: {
  initial: HistoryResult;
  adapter?: () => Promise<HistoryResult>;
}) {
  const [result, setResult] = useState(initial),
    [loading, setLoading] = useState(false),
    busy = useRef(false);
  async function refresh() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      setResult(await adapter());
    } catch {
      setResult({ ok: false, code: "NETWORK_ERROR" });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <section className="uss-member-panel">
      <h2>Recent registrations</h2>
      <p>
        Your most recently registered runs. This is a bounded history preview,
        not a list of every upcoming event.
      </p>
      {loading ? (
        <PageLoading label="Loading registrations">
          <Skeleton height="12rem" />
        </PageLoading>
      ) : !result.ok ? (
        <RegistrationFeedback code={result.code} retry={refresh} />
      ) : (
        <RegistrationList items={result.data.items.slice(0, 3)} />
      )}
      <div className="uss-registration-actions">
        <LinkButton href="/dashboard/events" variant="text">
          View registration history ↗
        </LinkButton>
        <Button variant="text" disabled={loading} onClick={refresh}>
          Refresh registrations
        </Button>
      </div>
    </section>
  );
}

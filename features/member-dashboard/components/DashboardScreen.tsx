"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { refreshDashboard } from "../api/actions";
import type { DashboardResult, DashboardState } from "../model";
import { DashboardOverview } from "./DashboardOverview";
import { DashboardLoading } from "./DashboardLoading";
import type { HistoryResult } from "@/features/event-registration/model";
export type DashboardAdapter = () => Promise<DashboardResult>;
export function DashboardScreen({
  initial,
  adapter = refreshDashboard,
  registrations,
}: {
  initial: DashboardResult;
  adapter?: DashboardAdapter;
  registrations?: HistoryResult;
}) {
  const [state, setState] = useState<DashboardState>({
    phase: "settled",
    result: initial,
  });
  const busy = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function refresh() {
    if (busy.current) return;
    busy.current = true;
    // Remove private content while the server rechecks owner/lifecycle; never keep it on a denied result.
    setState({ phase: "loading" });
    try {
      const result = await adapter();
      if (mounted.current) setState({ phase: "settled", result });
    } catch {
      if (mounted.current)
        setState({
          phase: "settled",
          result: { ok: false, code: "NETWORK_ERROR" },
        });
    } finally {
      busy.current = false;
    }
  }
  if (state.phase === "loading") return <DashboardLoading />;
  if (!state.result.ok)
    return (
      <ServiceFeedback
        code={state.result.code}
        retry={refresh}
        returnTo="/dashboard"
      />
    );
  return (
    <>
      <p className="uss-sr-only" role="status">
        Your USS dashboard is up to date.
      </p>
      <DashboardOverview
        member={state.result.data}
        registrations={registrations}
      />
      <Button variant="text" onClick={refresh}>
        Refresh dashboard
      </Button>
    </>
  );
}

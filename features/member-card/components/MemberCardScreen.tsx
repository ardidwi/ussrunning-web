"use client";
import { useEffect, useRef, useState } from "react";
import { getOwnMemberCardPresentation } from "@/lib/member/member-card-actions";
import type { MemberCardResult } from "@/lib/member/member-card-types";
import {
  PageLoading,
  Skeleton,
  Button,
  LinkButton,
  EmptyState,
} from "@/components/ui";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { cardPresentation } from "../utils/presentation";
import { MemberCard } from "./MemberCard";
export type MemberCardAdapter = () => Promise<MemberCardResult>;
export function MemberCardSkeleton() {
  return (
    <PageLoading label="Loading your Member Card…">
      <div className="uss-member-card">
        <Skeleton height="4rem" />
        <Skeleton height="6rem" />
        <Skeleton height="20rem" />
      </div>
    </PageLoading>
  );
}
export function MemberCardScreen({
  initial,
  adapter = getOwnMemberCardPresentation,
}: {
  initial: MemberCardResult;
  adapter?: MemberCardAdapter;
}) {
  const [state, setState] = useState<
    | { phase: "settled"; result: MemberCardResult }
    | { phase: "loading" }
    | { phase: "network_error" }
  >({ phase: "settled", result: cardPresentation(initial) });
  const busy = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const retry = async () => {
    if (busy.current) return;
    busy.current = true;
    setState({ phase: "loading" });
    try {
      const result = cardPresentation(await adapter());
      if (mounted.current) setState({ phase: "settled", result });
    } catch {
      if (mounted.current) setState({ phase: "network_error" });
    } finally {
      busy.current = false;
    }
  };
  if (state.phase === "loading") return <MemberCardSkeleton />;
  if (state.phase === "network_error")
    return (
      <ServiceFeedback
        code="NETWORK_ERROR"
        retry={retry}
        returnTo="/dashboard/member-card"
      />
    );
  if (!state.result.ok) {
    if (state.result.code === "PROFILE_NOT_FOUND")
      return (
        <EmptyState
          title="Your Member Card isn't available yet."
          description="Your member profile could not be found. Please contact USS Running support."
          action={
            <LinkButton href="mailto:hello@ussrunning.com" variant="secondary">
              Contact USS support ↗
            </LinkButton>
          }
        />
      );
    return (
      <ServiceFeedback
        code={state.result.code}
        retry={retry}
        returnTo="/dashboard/member-card"
      />
    );
  }
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">MY USS / MEMBER CARD</p>
        <h1>
          ONE CREW.
          <br />
          YOUR IDENTITY.
        </h1>
        <p>Your permanent USS identity, wherever the next run takes you.</p>
      </header>
      <MemberCard key={state.result.data.memberId} card={state.result.data} />
      <Button variant="text" onClick={retry}>
        Refresh account status
      </Button>
    </>
  );
}

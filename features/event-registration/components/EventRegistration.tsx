"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LinkButton, PageLoading, Skeleton } from "@/components/ui";
import type { PublicEventDTO } from "@/lib/events/event-types";
import { readHistory, registerForEvent } from "../api/actions";
import {
  restrictedAccount,
  type HistoryResult,
  type MutationResult,
} from "../model";
import { RegistrationFeedback } from "./RegistrationFeedback";
import { RegistrationList } from "./RegistrationList";
export function EventRegistration({
  event,
  initial,
  adapter = { register: registerForEvent, read: readHistory },
}: {
  event: PublicEventDTO;
  initial: HistoryResult;
  adapter?: { register: typeof registerForEvent; read: typeof readHistory };
}) {
  const [result, setResult] = useState(initial),
    [phase, setPhase] = useState<"idle" | "registering" | "loading">("idle"),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false),
    router = useRouter(),
    existing = result.ok ? result.data.items[0] : undefined;
  async function request(kind: "register" | "reload") {
    if (lock.current) return;
    lock.current = true;
    setPhase(kind === "register" ? "registering" : "loading");
    setError(null);
    setNotice(null);
    try {
      if (kind === "reload") setResult(await adapter.read(null, event.id));
      else {
        const response: MutationResult = await adapter.register(event.id);
        if (response.ok) {
          setResult({
            ok: true,
            data: { items: [response.data], nextCursor: null },
          });
          setNotice(
            response.data.status === "confirmed"
              ? "Your registration is confirmed."
              : "You are on the waitlist. A place is not confirmed.",
          );
          router.refresh();
        } else {
          setError(response.code);
          if (restrictedAccount(response.code)) setResult(response);
        }
      }
    } catch {
      if (kind === "reload") setResult({ ok: false, code: "NETWORK_ERROR" });
      else setError("NETWORK_ERROR");
    } finally {
      lock.current = false;
      setPhase("idle");
    }
  }
  const returnTo = `/runs/${encodeURIComponent(event.slug)}`;
  if (phase === "loading")
    return (
      <PageLoading label="Checking registration">
        <Skeleton height="16rem" />
      </PageLoading>
    );
  if (!result.ok)
    return (
      <RegistrationFeedback
        code={result.code}
        retry={() => request("reload")}
        returnTo={returnTo}
      />
    );
  return (
    <section className="uss-registration-panel" aria-label="Event registration">
      <h2>Your registration</h2>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <RegistrationFeedback
          code={error}
          retry={() => request("reload")}
          returnTo={returnTo}
        />
      )}
      {existing && <RegistrationList items={[existing]} />}
      {event.status === "registration_open" &&
      (!existing || existing.status === "cancelled") ? (
        <>
          <p>
            Eligibility, the registration window and available places are
            checked when you submit.
          </p>
          <Button
            loading={phase === "registering"}
            disabled={phase !== "idle"}
            loadingLabel="Registering…"
            onClick={() => request("register")}
          >
            Register for this run
          </Button>
        </>
      ) : !existing ? (
        <p>Registration is not open for this event.</p>
      ) : null}
      <div className="uss-registration-actions">
        <Button
          variant="text"
          disabled={phase !== "idle"}
          onClick={() => request("reload")}
        >
          Refresh registration
        </Button>
        <LinkButton href="/dashboard/events" variant="text">
          Manage registrations ↗
        </LinkButton>
      </div>
    </section>
  );
}

"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  LinkButton,
  Modal,
  PageLoading,
  Skeleton,
} from "@/components/ui";
import type { RegistrationDTO } from "@/lib/registrations/registration-types";
import { readHistory, requestCancellation } from "../api/actions";
import { restrictedAccount, type HistoryResult } from "../model";
import { RegistrationFeedback } from "./RegistrationFeedback";
import { PassEntry } from "@/features/event-pass/components/PassEntry";
import { readPassEntry } from "@/features/event-pass/api/actions";
import { RegistrationList } from "./RegistrationList";
export function RegistrationHistory({
  initial,
  adapter = { read: readHistory, cancel: requestCancellation },
  passAdapter = readPassEntry,
}: {
  initial: HistoryResult;
  adapter?: { read: typeof readHistory; cancel: typeof requestCancellation };
  passAdapter?: typeof readPassEntry;
}) {
  const [result, setResult] = useState<HistoryResult>(initial),
    [phase, setPhase] = useState<"idle" | "loading" | "cancelling">("idle"),
    [selected, setSelected] = useState<RegistrationDTO | null>(null),
    [notice, setNotice] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const busy = useRef(false),
    router = useRouter();
  async function load(cursor: string | null = null) {
    if (busy.current) return;
    busy.current = true;
    setSelected(null);
    setPhase("loading");
    setError(null);
    setNotice(null);
    try {
      setResult(await adapter.read(cursor));
    } catch {
      setResult({ ok: false, code: "NETWORK_ERROR" });
    } finally {
      busy.current = false;
      setPhase("idle");
    }
  }
  async function cancel() {
    if (busy.current || !selected) return;
    busy.current = true;
    setPhase("cancelling");
    setError(null);
    setNotice(null);
    try {
      const response = await adapter.cancel({
        eventId: selected.event.id,
        registrationId: selected.id,
        expectedVersion: selected.version,
      });
      if (response.ok) {
        setSelected(null);
        setResult((previous) =>
          previous.ok
            ? {
                ...previous,
                data: {
                  ...previous.data,
                  items: previous.data.items.map((item) =>
                    item.id === response.data.id ? response.data : item,
                  ),
                },
              }
            : previous,
        );
        setNotice("Registration cancelled.");
        router.refresh();
      } else {
        setError(response.code);
        if (restrictedAccount(response.code)) setResult(response);
      }
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      busy.current = false;
      setPhase("idle");
    }
  }
  if (phase === "loading")
    return (
      <PageLoading label="Loading registrations">
        <Skeleton height="16rem" />
      </PageLoading>
    );
  if (!result.ok)
    return <RegistrationFeedback code={result.code} retry={() => load()} />;
  return (
    <section className="uss-registration-history">
      <p>Registration records are separate from event passes and attendance.</p>
      {notice && <p role="status">{notice}</p>}
      {error && !selected && (
        <RegistrationFeedback code={error} retry={() => load()} />
      )}
      <RegistrationList
        items={result.data.items}
        actions={(item) => (
          <>
            {item.status === "confirmed" && (
              <PassEntry
                adapter={passAdapter}
                reference={{ eventId: item.event.id, registrationId: item.id }}
              />
            )}
            {item.status !== "cancelled" && item.status !== "rejected" ? (
              <Button
                variant="text"
                disabled={phase !== "idle"}
                onClick={() => {
                  setError(null);
                  setSelected(item);
                }}
              >
                Request cancellation
              </Button>
            ) : null}
          </>
        )}
      />
      <div className="uss-registration-actions">
        <Button
          variant="secondary"
          disabled={phase !== "idle"}
          onClick={() => load()}
        >
          Refresh / first page
        </Button>
        {result.data.nextCursor && (
          <Button
            disabled={phase !== "idle"}
            onClick={() => load(result.data.nextCursor)}
          >
            Next page ↗
          </Button>
        )}
        <LinkButton href="/runs" variant="text">
          Find a run ↗
        </LinkButton>
      </div>
      <Modal
        open={!!selected}
        onClose={() => {
          if (!busy.current) setSelected(null);
        }}
        title="Cancel this registration?"
        description="USS Running will check whether cancellation is still allowed. Your registration changes only after confirmation."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={phase === "cancelling"}
              onClick={() => setSelected(null)}
            >
              Keep registration
            </Button>
            <Button
              variant="danger"
              disabled={!!error}
              loading={phase === "cancelling"}
              loadingLabel="Requesting…"
              onClick={cancel}
            >
              Request cancellation
            </Button>
          </>
        }
      >
        {error && <RegistrationFeedback code={error} retry={() => load()} />}
      </Modal>
    </section>
  );
}

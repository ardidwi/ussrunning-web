"use client";
import { useEffect, useState } from "react";
import { Button, Skeleton } from "@/components/ui";
import { renderMemberBarcode } from "../utils/barcode";
type CodeState =
  { phase: "loading" } | { phase: "ready"; svg: string } | { phase: "error" };
export function MemberBarcode({
  value,
  memberId,
}: {
  value: string;
  memberId: string;
}) {
  const [state, setState] = useState<CodeState>({ phase: "loading" }),
    [attempt, setAttempt] = useState(0),
    [downloadError, setDownloadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    renderMemberBarcode(value)
      .then((svg) => {
        if (!cancelled) setState({ phase: "ready", svg });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [value, attempt]);
  return (
    <div className="uss-card-code">
      <div className="uss-card-code-frame">
        {state.phase === "loading" ? (
          <div role="status" aria-busy="true">
            <Skeleton width="100%" height="100%" />
            <span>Preparing your barcode…</span>
          </div>
        ) : state.phase === "error" ? (
          <div role="alert">
            <p>We couldn't render your barcode.</p>
            <Button
              variant="secondary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          </div>
        ) : (
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.svg)}`}
            alt="Permanent USS member barcode. Identifier only; not an event pass or proof of attendance."
            width="320"
            height="320"
          />
        )}
      </div>
      <p>Permanent member identity. Event passes are issued separately.</p>
      <Button
        variant="secondary"
        disabled={state.phase !== "ready"}
        onClick={() => {
          if (state.phase !== "ready") return;
          let url: string | undefined;
          try {
            url = URL.createObjectURL(
              new Blob([state.svg], { type: "image/svg+xml" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = `${memberId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}-uss-barcode.svg`;
            link.click();
            setDownloadError(false);
          } catch {
            setDownloadError(true);
          } finally {
            if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
          }
        }}
      >
        Download barcode SVG ↓
      </Button>
      <div className="uss-card-download-feedback" role="status">
        {downloadError && "We couldn't prepare the download. Please try again."}
      </div>
    </div>
  );
}

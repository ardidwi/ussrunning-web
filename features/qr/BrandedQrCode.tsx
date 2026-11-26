"use client";
import { useEffect, useState } from "react";
import { Button, Skeleton } from "@/components/ui";
import { USS_QR_LOGO, type QrBranding } from "./branding";
import { renderBrandedQr } from "./render";
export function BrandedQrCode({
  value,
  branding,
  description = "Event Pass QR. Present at event check-in.",
}: {
  value: string;
  branding?: QrBranding;
  description?: string;
}) {
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof renderBrandedQr>
  > | null>(null);
  const [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [failedLogos, setFailedLogos] = useState<string[]>([]);
  const configKey = JSON.stringify(branding ?? {});
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError(false);
    setFailedLogos([]);
    renderBrandedQr(value, JSON.parse(configKey) as QrBranding)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [value, configKey, attempt]);
  const requested = result?.config.centerLogoUrl;
  const logo =
    requested && !failedLogos.includes(requested)
      ? requested
      : requested && !failedLogos.includes(USS_QR_LOGO)
        ? USS_QR_LOGO
        : null;
  return (
    <div className="uss-branded-qr">
      {!result ? (
        error ? (
          <div role="alert">
            <p>We couldn't render the QR.</p>
            <Button
              variant="secondary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Retry QR
            </Button>
          </div>
        ) : (
          <div role="status" aria-busy="true">
            <Skeleton width="100%" height="100%" />
            <span className="uss-sr-only">Preparing QR…</span>
          </div>
        )
      ) : (
        <>
          <img
            className="uss-qr-symbol"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`}
            alt={description}
            width="360"
            height="360"
          />
          {logo && result.logoPercent > 0 && (
            <span
              className="uss-qr-logo"
              style={{
                width: `${result.logoPercent}%`,
                padding: `${(result.logoPercent * result.paddingPercent) / 100}%`,
              }}
            >
              <img
                key={logo}
                src={logo}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => {
                  setFailedLogos((previous) => [...previous, logo]);
                }}
              />
            </span>
          )}
        </>
      )}
    </div>
  );
}

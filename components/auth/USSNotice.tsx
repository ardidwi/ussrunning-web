"use client";

import { useEffect } from "react";

export type USSNoticeKind = "success" | "error" | "info";

export default function USSNotice({
  open,
  kind,
  eyebrow = "USS RUNNING",
  title,
  message,
  detail,
  primaryLabel,
  onPrimary,
  secondaryLabel = "CLOSE",
  onClose,
}: {
  open: boolean;
  kind: USSNoticeKind;
  eyebrow?: string;
  title: string;
  message: string;
  detail?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="uss-notice-layer" role="presentation" onMouseDown={onClose}>
      <section
        className={`uss-notice uss-notice-${kind}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="uss-notice-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="uss-notice-index">
          <span>{eyebrow}</span>
          <b>{kind === "success" ? "OK" : kind === "error" ? "!" : "i"}</b>
        </div>

        <div className="uss-notice-copy">
          <span className="kicker">
            {kind === "success"
              ? "ACCESS CONFIRMED"
              : kind === "error"
                ? "ACTION REQUIRED"
                : "USS NOTICE"}
          </span>
          <h2 id="uss-notice-title">{title}</h2>
          <p>{message}</p>
          {detail ? <strong className="uss-notice-detail">{detail}</strong> : null}
        </div>

        <div className="uss-notice-actions">
          <button type="button" className="uss-notice-secondary" onClick={onClose}>
            {secondaryLabel}
          </button>
          {primaryLabel && onPrimary ? (
            <button type="button" className="uss-notice-primary" onClick={onPrimary}>
              <span>{primaryLabel}</span>
              <b>↗</b>
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

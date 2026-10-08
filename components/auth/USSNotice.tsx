"use client";

import { Modal, Button } from "@/components/ui";
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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      className={`uss-notice uss-notice-${kind}`}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} autoFocus>
            {secondaryLabel}
          </Button>
          {primaryLabel && onPrimary && (
            <Button
              variant={kind === "error" ? "danger" : "primary"}
              onClick={onPrimary}
            >
              {primaryLabel} ↗
            </Button>
          )}
        </>
      }
    >
      <div className="uss-notice-index">
        <span>{eyebrow}</span>
        <b>{kind === "success" ? "OK" : kind === "error" ? "!" : "i"}</b>
      </div>
      {detail && <strong className="uss-notice-detail">{detail}</strong>}
    </Modal>
  );
}

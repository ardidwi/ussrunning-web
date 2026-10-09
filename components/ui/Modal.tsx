"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    // Native modal dialogs make the rest of the document inert and trap focus.
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.setProperty(
      "overflow",
      "hidden",
      "important",
    );
    return () => {
      element.close();
      document.documentElement.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={`uss-modal ${className}`}
      aria-labelledby={id + "-title"}
      aria-describedby={description ? id + "-description" : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const elements = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close.current();
        }
      }}
    >
      <div className="uss-modal-body">
        <h2 id={id + "-title"}>{title}</h2>
        {description && <p id={id + "-description"}>{description}</p>}
        {children}
      </div>
      {actions && <div className="uss-modal-actions">{actions}</div>}
    </dialog>
  );
}

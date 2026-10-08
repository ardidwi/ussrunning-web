"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
type Tone = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; message: string; tone: Tone };
const ToastContext = createContext<
  ((message: string, tone?: Tone) => void) | null
>(null);
export function Toast({
  message,
  tone = "info",
  onDismiss,
}: {
  message: string;
  tone?: Tone;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`uss-toast uss-tone-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <strong>
        {tone === "success" ? "✓" : tone === "info" ? "i" : "!"}
        <span className="uss-sr-only">{tone}: </span>
      </strong>
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </div>
  );
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const notify = useCallback((message: string, tone: Tone = "info") => {
    setItems((current) =>
      current.some((item) => item.message === message && item.tone === tone)
        ? current
        : [...current.slice(-2), { id: Date.now(), message, tone }],
    );
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {items.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="uss-toast-region" aria-label="Notifications">
            {items.map((item) => (
              <Toast
                key={item.id}
                {...item}
                onDismiss={() =>
                  setItems((current) =>
                    current.filter((other) => other.id !== item.id),
                  )
                }
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast requires ToastProvider");
  return notify;
}

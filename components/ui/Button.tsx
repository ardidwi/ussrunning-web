import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Spinner } from "./Spinner";
export function Button({
  variant = "primary",
  loading = false,
  loadingLabel = "Saving…",
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon" | "text";
  loading?: boolean;
  loadingLabel?: ReactNode;
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`uss-button uss-button-${variant} ${className}`}
    >
      <span
        className="uss-button-content"
        style={{ visibility: loading ? "hidden" : undefined }}
      >
        {children}
      </span>
      {loading && (
        <span className="uss-button-loading">
          <Spinner />
          {loadingLabel}
        </span>
      )}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  children,
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?:
    "primary" | "secondary" | "ghost" | "danger" | "text" | "navigation";
}) {
  return (
    <Link
      {...props}
      href={href}
      className={`uss-button uss-button-${variant} ${className}`}
    >
      <span className="uss-button-content">{children}</span>
    </Link>
  );
}

import type { HTMLAttributes } from "react";
export function Spinner({
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={`uss-spinner ${className}`}
      aria-hidden="true"
    />
  );
}

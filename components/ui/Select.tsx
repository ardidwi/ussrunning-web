"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { useFieldControl } from "./Field";
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select(
  { id, className = "", "aria-describedby": describedBy, ...props },
  ref,
) {
  const field = useFieldControl(id, describedBy);
  return (
    <select
      {...field}
      {...props}
      ref={ref}
      className={`uss-control ${className}`}
    />
  );
});

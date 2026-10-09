"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { useFieldControl } from "./Field";
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input(
  { id, className = "", "aria-describedby": describedBy, ...props },
  ref,
) {
  const field = useFieldControl(id, describedBy);
  return (
    <input
      {...field}
      {...props}
      ref={ref}
      className={`uss-control ${className}`}
    />
  );
});

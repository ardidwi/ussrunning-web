"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import {
  useFieldControl,
  useFieldContext,
  FieldHint,
  FieldError,
} from "./Field";
export function Checkbox({
  label,
  hint,
  error,
  id: providedId,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  const generatedId = useId();
  const wrapped = useFieldContext();
  const inherited = useFieldControl(providedId);
  const id = inherited.id ?? generatedId;
  const describedBy =
    [
      inherited["aria-describedby"],
      hint && id + "-hint",
      error && id + "-error",
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className={`uss-choice-field ${className}`}>
      <div className="uss-choice">
        <input
          {...inherited}
          {...props}
          id={id}
          type="checkbox"
          aria-describedby={describedBy}
          aria-invalid={Boolean(error) || inherited["aria-invalid"]}
        />
        <label htmlFor={id}>
          {label}
          {props.required && (
            <span className="uss-required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      </div>
      <FieldHint id={id + "-hint"}>{hint}</FieldHint>
      {!wrapped && <FieldError id={id + "-error"}>{error}</FieldError>}
    </div>
  );
}

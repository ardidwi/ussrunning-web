"use client";

import {
  createContext,
  useContext,
  useId,
  type ReactNode,
  type LabelHTMLAttributes,
} from "react";

type FieldContextValue = {
  id: string;
  describedBy: string;
  invalid: boolean;
  success: boolean;
};
const FieldContext = createContext<FieldContextValue | null>(null);
export function useFieldContext() {
  return useContext(FieldContext);
}
export function useFieldControl(id?: string, describedBy?: string) {
  const field = useContext(FieldContext);
  return {
    id: id ?? field?.id,
    "aria-describedby":
      [field?.describedBy, describedBy].filter(Boolean).join(" ") || undefined,
    "aria-invalid": field?.invalid || undefined,
    "data-success": field?.success || undefined,
  };
}
export function FieldLabel({
  required,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className="uss-field-label" {...props}>
      {children}
      {required && (
        <span className="uss-required" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );
}
export function FieldHint({
  id,
  children,
}: {
  id?: string;
  children?: ReactNode;
}) {
  return children ? (
    <div className="uss-field-hint" id={id}>
      {children}
    </div>
  ) : null;
}
export function FieldError({
  id,
  children,
  success = false,
}: {
  id?: string;
  children?: ReactNode;
  success?: boolean;
}) {
  return (
    <div
      className={`uss-field-error ${success ? "uss-field-success" : ""}`}
      id={id}
      aria-live="polite"
      tabIndex={children ? 0 : undefined}
    >
      {children && (
        <>
          <span aria-hidden="true">{success ? "✓ " : "! "}</span>
          {children}
        </>
      )}
    </div>
  );
}
export type FieldProps = {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};
export function Field({
  id: providedId,
  label,
  hint,
  error,
  success,
  required,
  children,
  className = "",
}: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = [hint && id + "-hint", id + "-error"]
    .filter(Boolean)
    .join(" ");
  return (
    <FieldContext.Provider
      value={{
        id,
        describedBy,
        invalid: Boolean(error),
        success: Boolean(success) && !error,
      }}
    >
      <div className={`uss-field ${className}`}>
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
        {children}
        <FieldHint id={id + "-hint"}>{hint}</FieldHint>
        <FieldError id={id + "-error"} success={!error && Boolean(success)}>
          {error || success}
        </FieldError>
      </div>
    </FieldContext.Provider>
  );
}

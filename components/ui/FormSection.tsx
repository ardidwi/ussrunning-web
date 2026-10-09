import type { ReactNode } from "react";
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="uss-form-section">
      <legend>{title}</legend>
      {description && <p className="uss-section-description">{description}</p>}
      {children}
    </fieldset>
  );
}
export function FormActions({
  cancel,
  children,
}: {
  cancel?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="uss-form-actions">
      <div className="uss-form-cancel">{cancel}</div>
      <div className="uss-form-submit">{children}</div>
    </div>
  );
}

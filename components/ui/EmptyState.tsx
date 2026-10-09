import type { ReactNode } from "react";
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="uss-empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Badge({
  tone = "info",
  children,
}: {
  tone?: "success" | "error" | "warning" | "info";
  children: ReactNode;
}) {
  return <span className={`uss-badge uss-tone-${tone}`}>{children}</span>;
}

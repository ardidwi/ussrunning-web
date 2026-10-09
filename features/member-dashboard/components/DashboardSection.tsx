import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";
/** Content slot for independently loaded domains. Unavailable is distinct from a known empty list. */
export function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="uss-member-panel uss-dashboard-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function DashboardUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <EmptyState title={title} description={description} />;
}

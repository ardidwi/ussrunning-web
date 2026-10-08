import type { ReactNode } from "react";
export function SectionKicker({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`kicker uss-section-kicker ${className}`}>{children}</span>
  );
}
export function PageHero({
  kicker,
  title,
  description,
  children,
  className = "",
}: {
  kicker: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`uss-page-hero ${className}`}>
      <div className="content-frame">
        <SectionKicker>{kicker}</SectionKicker>
        <h1>{title}</h1>
        {description && <p className="uss-page-description">{description}</p>}
        {children}
      </div>
    </section>
  );
}

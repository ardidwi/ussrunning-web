import type { CSSProperties, ReactNode } from "react";
export function Skeleton({
  width = "100%",
  height = "1rem",
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}) {
  return (
    <div
      className="uss-skeleton"
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
export function PageLoading({
  label = "Loading…",
  children,
}: {
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div className="uss-page-loading" role="status" aria-busy="true">
      <span>{label}</span>
      {children ?? (
        <>
          <Skeleton height="3rem" />
          <Skeleton height="12rem" />
        </>
      )}
    </div>
  );
}

import { PageLoading, Skeleton } from "@/components/ui";
export function DashboardLoading() {
  return (
    <PageLoading label="Loading your USS dashboard…">
      <Skeleton width="70%" height="5rem" />
      <div className="uss-member-grid">
        <Skeleton height="20rem" />
        <Skeleton height="20rem" />
      </div>
      <div className="uss-member-grid">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} height="14rem" />
        ))}
      </div>
    </PageLoading>
  );
}

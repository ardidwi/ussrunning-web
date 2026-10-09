import { PageLoading, Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <div className="uss-member-shell">
      <div className="uss-member-content">
        <PageLoading label="Loading USS CMS…">
          <Skeleton height="4rem" />
          <Skeleton height="20rem" />
        </PageLoading>
      </div>
    </div>
  );
}

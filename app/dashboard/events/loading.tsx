import { PageLoading, Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <PageLoading label="Loading registrations">
      <Skeleton height="24rem" />
    </PageLoading>
  );
}

import { PageLoading, Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <PageLoading label="Loading Event Pass">
      <Skeleton height="28rem" />
    </PageLoading>
  );
}

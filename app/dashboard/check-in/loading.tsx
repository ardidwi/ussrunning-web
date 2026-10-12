import { Skeleton } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="uss-scanner" aria-label="Loading scanner" role="status">
      <Skeleton height="12rem" />
      <Skeleton height="24rem" />
    </div>
  );
}

import { PageLoading, Skeleton } from "@/components/ui";
export default function MemberLoading({
  profile = false,
}: {
  profile?: boolean;
}) {
  return (
    <PageLoading label={profile ? "Loading your profile…" : "Loading MY USS…"}>
      <Skeleton width="60%" height="4rem" />
      <div className="uss-member-grid">
        <Skeleton height="16rem" />
        <Skeleton height="16rem" />
      </div>
      {profile && (
        <>
          <Skeleton height="22rem" />
          <Skeleton height="18rem" />
        </>
      )}
    </PageLoading>
  );
}

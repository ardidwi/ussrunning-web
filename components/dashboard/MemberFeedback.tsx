"use client";
import { useRouter } from "next/navigation";
import { safeReturnPath } from "@/lib/auth/return-path";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { Button, EmptyState, LinkButton } from "@/components/ui";
import type { MemberErrorCode } from "@/lib/member/contract";
export default function MemberFeedback({
  code,
  returnTo = "/dashboard",
  retry,
}: {
  code: MemberErrorCode;
  returnTo?: string;
  retry?: () => void;
}) {
  const router = useRouter();
  if (
    [
      "ACCOUNT_SUSPENDED",
      "ACCOUNT_DEACTIVATED",
      "ACCOUNT_NOT_PROVISIONED",
    ].includes(code)
  )
    return (
      <section className="uss-member-panel">
        <h1>ACCOUNT STATUS.</h1>
        <AuthStatus
          result={{
            state: "error",
            code: code as
              | "ACCOUNT_SUSPENDED"
              | "ACCOUNT_DEACTIVATED"
              | "ACCOUNT_NOT_PROVISIONED",
          }}
        />
      </section>
    );
  if (code === "EMAIL_NOT_VERIFIED")
    return (
      <div className="uss-member-panel" role="status">
        <h1>VERIFY YOUR EMAIL.</h1>
        <AuthStatus result={{ state: "error", code }} />
        <p>Your account needs email verification before you can use MY USS.</p>
        <LinkButton href="/login?flow=verify">
          Verify or resend email ↗
        </LinkButton>
      </div>
    );
  if (code === "UNAUTHENTICATED")
    return (
      <div className="uss-member-panel">
        <h1>SIGN IN TO CONTINUE.</h1>
        <AuthStatus result={{ state: "error", code }} />
        <LinkButton
          href={`/login?reason=session-expired&returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`}
        >
          Sign in again ↗
        </LinkButton>
      </div>
    );
  return (
    <div className="uss-member-panel" role="alert">
      <h1>MY USS.</h1>
      <EmptyState
        title={
          code === "PROFILE_UNAVAILABLE"
            ? "Your profile is temporarily unavailable."
            : "We couldn't load your profile."
        }
        description="Please try again later. Your saved details haven't been changed."
        action={
          <Button
            variant="secondary"
            onClick={retry ?? (() => router.refresh())}
          >
            Try again
          </Button>
        }
      />
    </div>
  );
}

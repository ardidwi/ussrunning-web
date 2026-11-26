"use client";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { Button, EmptyState, LinkButton } from "@/components/ui";
import { safeReturnPath } from "@/lib/auth/return-path";
export function ServiceFeedback({
  code,
  returnTo = "/dashboard",
  retry,
}: {
  code: string;
  returnTo?: string;
  retry?: () => void;
}) {
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
  if (code === "UNAUTHENTICATED")
    return (
      <section className="uss-member-panel">
        <h1>SIGN IN TO CONTINUE.</h1>
        <AuthStatus result={{ state: "error", code: "UNAUTHENTICATED" }} />
        <LinkButton
          href={`/login?reason=session-expired&returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`}
        >
          Sign in again ↗
        </LinkButton>
      </section>
    );
  if (code === "EMAIL_NOT_VERIFIED")
    return (
      <section className="uss-member-panel" role="status">
        <h1>VERIFY YOUR EMAIL.</h1>
        <p>Verify your email before using this part of USS Running.</p>
        <LinkButton href="/login?flow=verify">
          Verify or resend email ↗
        </LinkButton>
      </section>
    );
  if (code === "PROFILE_INCOMPLETE")
    return (
      <section className="uss-member-panel" role="status">
        <h1>Complete your profile.</h1>
        <p>Add your profile photo and contact details to continue.</p>
        <LinkButton href="/dashboard/onboarding">Continue setup</LinkButton>
      </section>
    );
  const forbidden = code === "INSUFFICIENT_PERMISSION",
    missing = code === "HISTORY_NOT_FOUND" || code === "PROFILE_NOT_FOUND",
    validation = code === "HISTORY_VALIDATION_ERROR";
  return (
    <section className="uss-member-panel" role="alert">
      <h1>
        {forbidden
          ? "ACCESS RESTRICTED."
          : missing
            ? "NOT AVAILABLE."
            : "PLEASE TRY AGAIN."}
      </h1>
      <EmptyState
        title={
          forbidden
            ? "Your account cannot open this view."
            : missing
              ? "We couldn't find this information."
              : validation
                ? "Review the filters and try again."
                : code === "NETWORK_ERROR"
                  ? "We couldn't connect."
                  : "This service is temporarily unavailable."
        }
        description={
          forbidden
            ? "Return to an allowed page or contact USS Running support."
            : validation
              ? "Use valid dates and a bounded page size."
              : "Your account and saved information haven't been changed."
        }
        action={
          <>
            {retry && !forbidden && !missing && (
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            )}
            <LinkButton href="/dashboard" variant="text">
              Back to MY USS ↗
            </LinkButton>
          </>
        }
      />
    </section>
  );
}

import LoginForm from "@/components/LoginForm";
import AuthFlow from "@/components/auth/AuthFlow";
import type { AuthFlow as Flow } from "@/lib/auth/contract";
import { getClientAuthPolicy } from "@/lib/auth/policy";
import { safeReturnPath } from "@/lib/auth/return-path";
import AuthShell from "@/components/auth/AuthShell";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = typeof params.flow === "string" ? params.flow : "login";
  const flow: Flow =
    requested === "forgot" || requested === "reset" || requested === "verify"
      ? requested
      : "login";
  const copy = {
    login: [
      "WELCOME BACK",
      "LOG IN TO\nMY USS.",
      "Access your runs, passes and USS participation history with one community ID.",
    ],
    forgot: [
      "ACCOUNT RECOVERY",
      "BACK TO\nYOUR CREW.",
      "Request instructions to reset your USS account password.",
    ],
    reset: [
      "ACCOUNT RECOVERY",
      "A FRESH\nSTART.",
      "Choose a new password for your USS Running account.",
    ],
    verify: [
      "EMAIL VERIFICATION",
      "ONE STEP\nTO GO.",
      "Verify your email before your USS account becomes active.",
    ],
  }[flow];

  return (
    <AuthShell eyebrow={copy[0]} heading={copy[1]} description={copy[2]}>
      {flow === "login" ? (
        <LoginForm
          policy={getClientAuthPolicy()}
          returnTo={safeReturnPath(params.returnTo)}
          sessionExpired={params.reason === "session-expired"}
        />
      ) : (
        <AuthFlow
          key={flow}
          flow={flow}
          policy={getClientAuthPolicy()}
          returnTo={safeReturnPath(params.returnTo)}
          sessionExpired={params.reason === "session-expired"}
        />
      )}
    </AuthShell>
  );
}

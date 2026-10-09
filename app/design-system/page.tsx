import MemberCardReference from "@/features/member-card/components/MemberCardReference";
import MemberReference from "@/components/dashboard/MemberReference";
import AuthReference from "@/components/auth/AuthReference";
import AuthShell from "@/components/auth/AuthShell";
import { getClientAuthPolicy } from "@/lib/auth/policy";
import type { AuthFlow } from "@/lib/auth/contract";
import { notFound } from "next/navigation";
import FormReference from "@/components/ui/FormReference";
import WorkspaceReference from "@/components/ui/WorkspaceReference";
export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<{
    surface?: string;
    flow?: string;
    scenario?: string;
    role?: string;
    module?: string;
  }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const {
    surface,
    flow: requested,
    scenario = "success",
    role,
    module,
  } = await searchParams;
  if (surface === "card") return <MemberCardReference scenario={scenario} />;
  if (surface === "auth") {
    const flow: AuthFlow =
      requested === "register" ||
      requested === "verify" ||
      requested === "forgot" ||
      requested === "reset"
        ? requested
        : "login";
    return (
      <AuthShell
        eyebrow="AUTH FLOW REFERENCE"
        heading={"MY USS.\nYOUR CREW."}
        description="Development-only interaction review."
      >
        <AuthReference
          flow={flow}
          scenario={scenario}
          policy={getClientAuthPolicy()}
        />
      </AuthShell>
    );
  }
  if (surface === "member")
    return <MemberReference view={requested} scenario={scenario} />;
  if (surface === "admin") return <WorkspaceReference />;
  return <FormReference />;
}

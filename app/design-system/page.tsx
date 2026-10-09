import DashboardReference from "@/features/member-dashboard/components/DashboardReference";
import MemberCardReference from "@/features/member-card/components/MemberCardReference";
import CmsReference from "@/features/cms/CmsReference";
import { cmsModule } from "@/features/cms/navigation";
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
  if (surface === "dashboard")
    return (
      <DashboardReference
        scenario={scenario}
        role={role === "admin" || role === "super_admin" ? role : "member"}
      />
    );
  if (surface === "card") return <MemberCardReference scenario={scenario} />;
  if (surface === "cms")
    return (
      <CmsReference
        role={
          role === "super_admin"
            ? "super_admin"
            : role === "member"
              ? "member"
              : "admin"
        }
        module={cmsModule(module)}
        scenario={scenario}
      />
    );
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

import { notFound } from "next/navigation";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { IdentityReference } from "@/features/member-onboarding/IdentityReference";

export default async function IdentityReferencePage({ searchParams }: { searchParams: Promise<{ surface?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { surface } = await searchParams;
  return <MemberDashboardShell><IdentityReference surface={surface} /></MemberDashboardShell>;
}

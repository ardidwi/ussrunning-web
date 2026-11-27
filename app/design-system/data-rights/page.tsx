import { notFound } from "next/navigation";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { DataRightsReference } from "@/features/data-rights-cms/DataRightsReference";

/** Development-only browser QA fixture for D1.6 surfaces; 404 in every other environment. */
export default async function DataRightsReferencePage({ searchParams }: { searchParams: Promise<{ surface?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { surface } = await searchParams;
  if (surface?.startsWith("admin")) return <main className="page-black" style={{ padding: "1rem", maxWidth: "72rem", margin: "0 auto" }}><DataRightsReference surface={surface} /></main>;
  return <MemberDashboardShell><DataRightsReference surface={surface} /></MemberDashboardShell>;
}

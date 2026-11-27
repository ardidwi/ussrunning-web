import { notFound } from "next/navigation";
import { AdminReference } from "@/features/members-cms/AdminReference";

/** Development-only browser QA fixtures for the admin workspaces (synthetic data, no session or database). */
export default async function AdminReferencePage({ searchParams }: { searchParams: Promise<{ surface?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { surface } = await searchParams;
  return <AdminReference surface={surface} />;
}

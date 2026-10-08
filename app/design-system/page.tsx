import { notFound } from "next/navigation";
import FormReference from "@/components/ui/FormReference";
import WorkspaceReference from "@/components/ui/WorkspaceReference";
export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<{ surface?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { surface } = await searchParams;
  if (surface === "admin" || surface === "member")
    return <WorkspaceReference member={surface === "member"} />;
  return <FormReference />;
}

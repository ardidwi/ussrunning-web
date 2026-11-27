import { readAdminOverview, type AdminOverview as Overview } from "@/lib/admin-users/admin-overview";
import { OverviewView } from "./OverviewView";

/** D2.8: real counts; each metric degrades independently, a total failure keeps the menu usable. */
export async function AdminOverview() {
  let overview: Overview | null = null;
  try { overview = await readAdminOverview(); } catch { overview = null; }
  return <OverviewView overview={overview} />;
}

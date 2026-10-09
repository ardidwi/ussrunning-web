import { loadDashboard } from "@/features/member-dashboard/api/server";
import { DashboardScreen } from "@/features/member-dashboard/components/DashboardScreen";
export const metadata = { title: "MY USS — USS Running" };
export default async function DashboardPage() {
  const initial = await loadDashboard();
  return <DashboardScreen key={JSON.stringify(initial)} initial={initial} />;
}

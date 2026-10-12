import { loadDashboard } from "@/features/member-dashboard/api/server";
import { DashboardScreen } from "@/features/member-dashboard/components/DashboardScreen";
import { loadRegistrationHistory } from "@/features/event-registration/api/server";
export const metadata = { title: "MY USS — USS Running" };
export default async function DashboardPage() {
  const [initial, registrations] = await Promise.all([
    loadDashboard(),
    loadRegistrationHistory(),
  ]);
  return (
    <DashboardScreen
      key={JSON.stringify({ initial, registrations })}
      initial={initial}
      registrations={registrations}
    />
  );
}

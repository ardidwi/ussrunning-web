import MemberOverview from "@/components/dashboard/MemberOverview";
import { loadMember } from "@/lib/member/server";
export const metadata = { title: "MY USS — USS Running" };
export default async function DashboardPage() {
  return <MemberOverview result={await loadMember()} />;
}

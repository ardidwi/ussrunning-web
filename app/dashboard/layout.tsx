import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { signOutAction } from "@/app/actions";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
return <MemberDashboardShell signOut={signOutAction}>{children}</MemberDashboardShell>;
}

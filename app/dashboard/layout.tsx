import type { ReactNode } from "react";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { signOut } from "./actions";
import { loadMember } from "@/lib/member/server";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await loadMember();
  return (
    <MemberDashboardShell signOutAction={signOut}>
      {children}
    </MemberDashboardShell>
  );
}

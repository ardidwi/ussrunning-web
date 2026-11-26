import type { ReactNode } from "react";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { loadPermissions } from "@/features/permissions/server";
import { signOut } from "@/lib/auth/flow-actions";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const permissions = await loadPermissions();
  return (
    <PermissionsProvider snapshot={permissions.ok ? permissions.data : null}>
      <MemberDashboardShell signOutAction={signOut}>
        {children}
      </MemberDashboardShell>
    </PermissionsProvider>
  );
}

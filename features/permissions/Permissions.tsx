"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Permission } from "@/lib/authz/permissions";
import { permissionView, type PermissionSnapshot } from "./model";
const Context = createContext<PermissionSnapshot | null>(null);
export function PermissionsProvider({
  snapshot,
  children,
}: {
  snapshot: PermissionSnapshot | null;
  children: ReactNode;
}) {
  return <Context.Provider value={snapshot}>{children}</Context.Provider>;
}
export function usePermissions() {
  return permissionView(useContext(Context));
}
export function PermissionGate({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: Permission;
  anyOf?: readonly Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const access = usePermissions();
  return (
    permission ? access.can(permission) : anyOf ? access.canAny(anyOf) : false
  )
    ? children
    : fallback;
}

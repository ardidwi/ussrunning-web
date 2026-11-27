"use client";

import { PermissionsProvider } from "@/features/permissions/Permissions";
import { CmsShell } from "@/features/cms/CmsShell";
import { CmsModuleBoundary } from "@/features/cms/CmsModuleBoundary";
import { OverviewView } from "@/features/cms/OverviewView";
import { MemberScanner } from "@/features/member-scanner/MemberScanner";
import { ROLE_PERMISSIONS, type SystemRole } from "@/lib/authz/permissions";
import type { MemberDirectoryEntry, MemberDirectoryPage, AvatarQueuePage } from "@/lib/admin-users/user-types";
import type { CmsModule } from "@/features/cms/navigation";
import { AvatarReviewQueue } from "./AvatarReviewQueue";
import { MemberDetailView, MemberDirectoryView } from "./MemberViews";
import { RolesView } from "./RolesWorkspace";
import type { AccountActionAdapters } from "./AccountActions";

/** Development-only synthetic fixtures for browser QA of the admin workspaces (no database or session). */
const wait = () => new Promise(resolve => setTimeout(resolve, 400));
const ok = async () => { await wait(); return { ok: true as const }; };
const conflict = async () => { await wait(); return { ok: false as const, code: "USER_CONFLICT" }; };
const adapters: AccountActionAdapters = {
  lifecycle: { activate: ok, suspend: ok, deactivate: conflict },
  grantRole: ok,
  revokeRole: async () => { await wait(); return { ok: false as const, code: "ROLE_LAST_SUPER_ADMIN" }; },
};
const names = ["Ayu Pratiwi Kusumawardhani", "Budi Santoso", "Citra Lestari", "Dimas Anggara Putra Wijayakusuma", "Eka Rahmawati", "Farhan Hidayat"];
const statuses = ["active", "pending_verification", "suspended", "deactivated", "active", "active"] as const;
function full(i: number): MemberDirectoryEntry {
  return {
    view: "full", id: `00000000-0000-4000-8000-00000000000${i}`, displayName: names[i].split(" ")[0], email: `${names[i].split(" ")[0].toLowerCase()}.runner@example.test`,
    memberId: `USS-${String(120 + i).padStart(6, "0")}`, status: statuses[i], emailVerified: statuses[i] !== "pending_verification",
    emailVerifiedAt: null, roles: i === 0 ? ["member", "super_admin"] : i === 4 ? ["member", "admin"] : ["member"], createdAt: "2026-10-0" + (i + 1) + "T03:00:00.000Z",
    updatedAt: "2026-11-01T03:00:00.000Z", statusChangedAt: null, lastLoginAt: "2026-11-20T03:00:00.000Z", version: 3,
    profile: { exists: i !== 1, fullName: names[i], city: i % 2 ? "Jakarta Selatan" : "Bandung", marketingConsent: i % 2 === 0, privacyConsentAt: null },
  };
}
function restricted(i: number): MemberDirectoryEntry {
  const f = full(i);
  if (f.view !== "full") throw new Error();
  return { view: "restricted", id: f.id, displayName: f.displayName, emailMasked: `${f.email[0]}•••@e•••.test`, memberId: f.memberId, status: f.status,
    emailVerified: f.emailVerified, roles: f.roles, createdAt: f.createdAt, lastLoginAt: f.lastLoginAt, profile: { exists: f.profile.exists, fullName: f.profile.fullName, city: f.profile.city } };
}
const page = (view: "full" | "restricted"): MemberDirectoryPage => ({ view, items: names.map((_, i) => view === "full" ? full(i) : restricted(i)), nextCursor: "next-page-cursor" });
const photo = (color: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="${color}"/><circle cx="5" cy="4" r="2" fill="#fff"/></svg>`)}`;
const queue: AvatarQueuePage = {
  total: 7,
  items: names.slice(0, 4).map((name, i) => ({ accountId: full(i).id, avatarId: `10000000-0000-4000-8000-00000000000${i}`, uploadedAt: "2026-11-2" + i + "T03:00:00.000Z",
    name, memberId: `USS-${String(120 + i).padStart(6, "0")}`, status: "active" as const, photo: i === 3 ? null : photo(["#a2522b", "#2b6ca2", "#3d8a4f"][i]) })),
  nextCursor: "next",
};
const review = async (input: { decision: string }) => { await wait(); return input.decision === "approved" ? { ok: true as const } : { ok: false as const, code: "AVATAR_CONFLICT" }; };
const lookupResult = async (value: string) => {
  await wait();
  if (/^uss-?0*120$/i.test(value.trim())) return { ok: true as const, data: { photo: photo("#a2522b"), name: names[0], memberId: "USS-000120", status: "active" as const } };
  if (!/^uss-?\d+$/i.test(value.trim())) return { ok: false as const, code: "MEMBER_ID_INVALID" as const };
  return { ok: false as const, code: "MEMBER_NOT_FOUND" as const };
};

const SURFACES: Record<string, { module: CmsModule; role: SystemRole }> = {
  overview: { module: "overview", role: "super_admin" },
  "overview-admin": { module: "overview", role: "admin" },
  members: { module: "members", role: "super_admin" },
  "members-restricted": { module: "members", role: "admin" },
  "members-empty": { module: "members", role: "admin" },
  detail: { module: "members", role: "super_admin" },
  "detail-self": { module: "members", role: "super_admin" },
  "detail-restricted": { module: "members", role: "admin" },
  roles: { module: "roles", role: "super_admin" },
  moderation: { module: "moderation", role: "admin" },
  "moderation-empty": { module: "moderation", role: "admin" },
  scanner: { module: "member-scanner", role: "admin" },
  slot: { module: "participants", role: "admin" },
};

export function AdminReference({ surface = "overview" }: { surface?: string }) {
  const current = SURFACES[surface] ?? SURFACES.overview;
  const content = (() => {
    switch (surface) {
      case "overview-admin":
        return <OverviewView overview={{ membersByStatus: { state: "ok", value: { pending_verification: 4, active: 1287, suspended: 3, deactivated: 12 } },
          upcomingEvents: { state: "ok", value: 2 }, avatarQueue: { state: "ok", value: 7 }, failedNotifications: { state: "unavailable" } }} />;
      case "members": return <MemberDirectoryView page={page("full")} status={null} search="" cursor="" />;
      case "members-restricted": return <MemberDirectoryView page={page("restricted")} status="active" search="Ayu" cursor="prev" />;
      case "members-empty": return <MemberDirectoryView page={{ view: "restricted", items: [], nextCursor: null }} status="suspended" search="" cursor="" />;
      case "detail": return <MemberDetailView detail={{ member: full(2), isSelf: false }} canManageUsers canManageRoles adapters={adapters} />;
      case "detail-self": return <MemberDetailView detail={{ member: full(0), isSelf: true }} canManageUsers canManageRoles adapters={adapters} />;
      case "detail-restricted": return <MemberDetailView detail={{ member: restricted(2), isSelf: false }} canManageUsers={false} canManageRoles={false} />;
      case "roles": return <RolesView superAdmins={{ ok: true, data: { view: "full", items: [full(0)], nextCursor: null } }} admins={{ ok: true, data: { view: "full", items: [full(4), full(5)], nextCursor: "more" } }} />;
      case "moderation": return <AvatarReviewQueue initial={queue} cursor="" review={review} />;
      case "moderation-empty": return <AvatarReviewQueue initial={{ total: 0, items: [], nextCursor: null }} cursor="" review={review} />;
      case "scanner": return <MemberScanner lookup={lookupResult} lookupById={lookupResult} />;
      case "slot": return <CmsModuleBoundary module="participants" />;
      default:
        return <OverviewView overview={{ membersByStatus: { state: "ok", value: { pending_verification: 4, active: 1287, suspended: 3, deactivated: 12 } },
          upcomingEvents: { state: "ok", value: 2 }, avatarQueue: { state: "ok", value: 7 }, failedNotifications: { state: "ok", value: 1 } }} />;
    }
  })();
  return (
    <PermissionsProvider snapshot={{ roles: ["member", current.role], permissions: ROLE_PERMISSIONS[current.role], displayName: "Fixture Operator" }}>
      <CmsShell module={current.module} displayName="Fixture Operator">{content}</CmsShell>
    </PermissionsProvider>
  );
}

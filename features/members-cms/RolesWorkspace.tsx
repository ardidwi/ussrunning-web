import { Badge, EmptyState, LinkButton } from "@/components/ui";
import { listMemberDirectory } from "@/lib/admin-users/user-actions";
import type { MemberDirectoryPage } from "@/lib/admin-users/user-types";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { ROLE_LABELS, STATUS_LABELS, membersHref, statusTone } from "./model";

type RoleList = { ok: true; data: MemberDirectoryPage } | { ok: false; code: string };

export function RolesView({ superAdmins, admins }: { superAdmins: RoleList; admins: RoleList }) {
  const list = (role: "super_admin" | "admin", result: RoleList) => (
    <section className="uss-member-panel" aria-labelledby={`role-${role}`}>
      <h2 id={`role-${role}`}>{ROLE_LABELS[role]}s.</h2>
      {!result.ok ? <p role="alert">This list could not be loaded. No roles were changed.</p>
        : !result.data.items.length ? <EmptyState title={`No ${ROLE_LABELS[role].toLowerCase()} accounts.`} />
          : (
            <ul className="uss-admin-role-list">
              {result.data.items.map(member => (
                <li key={member.id}>
                  <span>
                    <span className="uss-admin-primary">{member.profile.fullName || member.displayName || "USS member"}</span>
                    <span className="uss-admin-secondary">{member.memberId} · <Badge tone={statusTone(member.status)}>{STATUS_LABELS[member.status]}</Badge></span>
                  </span>
                  <LinkButton href={membersHref({ member: member.id })} variant="secondary">Manage ↗</LinkButton>
                </li>
              ))}
            </ul>)}
      {result.ok && result.data.nextCursor && <p className="uss-admin-muted">More accounts hold this role. Filter the member directory by role to see all.</p>}
    </section>
  );
  return (
    <section className="uss-admin-workspace" aria-labelledby="roles-heading">
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / ROLES</p>
        <h1 id="roles-heading">ROLES.</h1>
        <p>Grant or revoke Admin and Super admin from a member's page. Every change needs a reason and is recorded in the audit history.
          You can't change your own roles, and the last active super admin can't be removed.</p>
      </header>
      <div className="uss-admin-grid-2">
        {list("super_admin", superAdmins)}
        {list("admin", admins)}
      </div>
      <form action="/admin" method="get" className="uss-admin-filters" role="search" aria-label="Find a member to grant a role">
        <input type="hidden" name="module" value="members" />
        <label className="uss-field">
          <span className="uss-field-label">Find a member to grant a role</span>
          <input className="uss-control" name="search" type="search" required minLength={3} maxLength={100} placeholder="Name, email or member ID" autoComplete="off" />
        </label>
        <div className="uss-admin-button-row">
          <button type="submit" className="uss-button uss-button-primary"><span className="uss-button-content">Search members</span></button>
        </div>
      </form>
    </section>
  );
}

export async function RolesWorkspace() {
  const [superAdmins, admins] = await Promise.all([
    listMemberDirectory({ role: "super_admin", limit: 50 }),
    listMemberDirectory({ role: "admin", limit: 50 }),
  ]);
  for (const result of [superAdmins, admins])
    if (!result.ok && result.code !== "USER_UNAVAILABLE")
      return <ServiceFeedback code={result.code === "USER_FORBIDDEN" ? "INSUFFICIENT_PERMISSION" : result.code} returnTo="/admin?module=roles" />;
  return <RolesView superAdmins={superAdmins} admins={admins} />;
}

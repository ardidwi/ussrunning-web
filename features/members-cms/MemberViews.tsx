import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { MemberDirectoryDetail, MemberDirectoryEntry, MemberDirectoryPage } from "@/lib/admin-users/user-types";
import type { AccountStatus } from "@/lib/db/types";
import { AccountActions, type AccountActionAdapters } from "./AccountActions";
import { MEMBER_STATUSES, ROLE_LABELS, STATUS_LABELS, formatDate, membersHref, statusTone } from "./model";

const nameOf = (member: MemberDirectoryEntry) => member.profile.fullName || member.displayName || "USS member";
const emailOf = (member: MemberDirectoryEntry) => member.view === "full" ? member.email : member.emailMasked;
const rolesOf = (member: MemberDirectoryEntry) => member.roles.filter(role => role !== "member").map(role => ROLE_LABELS[role]).join(", ") || "Member";

export function MembersIntro({ restricted }: { restricted: boolean }) {
  return (
    <header className="uss-member-intro">
      <p className="uss-member-kicker">USS CMS / MEMBERS</p>
      <h1 id="members-heading">MEMBERS.</h1>
      <p>{restricted
        ? "Read-only member directory. Emails are masked and contact details are not shown; account changes are made by super admins."
        : "Find accounts, review their status and change it with a recorded reason."}</p>
    </header>
  );
}

export function MemberFilters({ status, search }: { status: AccountStatus | null; search: string }) {
  return (
    <form action="/admin" method="get" className="uss-admin-filters" role="search" aria-label="Filter members">
      <input type="hidden" name="module" value="members" />
      <label className="uss-field">
        <span className="uss-field-label">Search</span>
        <input className="uss-control" name="search" type="search" defaultValue={search} minLength={3} maxLength={100}
          placeholder="Name or member ID" autoComplete="off" />
      </label>
      <label className="uss-field">
        <span className="uss-field-label">Account status</span>
        <select className="uss-control" name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {MEMBER_STATUSES.map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
        </select>
      </label>
      <div className="uss-admin-button-row">
        <button type="submit" className="uss-button uss-button-primary"><span className="uss-button-content">Apply filters</span></button>
        <LinkButton href={membersHref({})} variant="text">Clear</LinkButton>
      </div>
    </form>
  );
}

export function MemberDirectoryView({ page, status, search, cursor }: {
  page: MemberDirectoryPage; status: AccountStatus | null; search: string; cursor: string;
}) {
  return (
    <section className="uss-admin-workspace" aria-labelledby="members-heading">
      <MembersIntro restricted={page.view === "restricted"} />
      <MemberFilters status={status} search={search} />
      {!page.items.length ? (
        <div className="uss-member-panel" role="status">
          <EmptyState title="No members match these filters." description="Try another status, or search by full name prefix or member ID." />
        </div>
      ) : (
        <table className="uss-admin-table" aria-label="Members">
          <thead>
            <tr><th scope="col">Member</th><th scope="col">Member ID</th><th scope="col">Status</th><th scope="col">Roles</th><th scope="col">Joined</th><th scope="col"><span className="uss-sr-only">Open</span></th></tr>
          </thead>
          <tbody>
            {page.items.map(member => (
              <tr key={member.id}>
                <th scope="row" data-label="Member">
                  <span className="uss-admin-primary">{nameOf(member)}</span>
                  <span className="uss-admin-secondary">{emailOf(member)}</span>
                </th>
                <td data-label="Member ID"><code>{member.memberId}</code></td>
                <td data-label="Status">
                  <Badge tone={statusTone(member.status)}>{STATUS_LABELS[member.status]}</Badge>
                  {!member.emailVerified && <span className="uss-admin-secondary">Email unverified</span>}
                </td>
                <td data-label="Roles">{rolesOf(member)}</td>
                <td data-label="Joined">{formatDate(member.createdAt)}</td>
                <td className="uss-admin-row-action">
                  <LinkButton href={membersHref({ member: member.id })} variant="secondary" aria-label={`Open ${nameOf(member)}`}>Open ↗</LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <nav className="uss-admin-pager" aria-label="Member pages">
        {cursor && <LinkButton href={membersHref({ status, search })} variant="text">First page ↗</LinkButton>}
        {page.nextCursor && <LinkButton href={membersHref({ status, search, cursor: page.nextCursor })} variant="secondary">Next page ↗</LinkButton>}
      </nav>
    </section>
  );
}

export function MemberDetailView({ detail, canManageUsers, canManageRoles, adapters }: {
  detail: MemberDirectoryDetail; canManageUsers: boolean; canManageRoles: boolean; adapters?: AccountActionAdapters;
}) {
  const { member, isSelf } = detail;
  const rows: [string, string][] = [
    ["Member ID", member.memberId],
    ["Email", emailOf(member) + (member.emailVerified ? " (verified)" : " (unverified)")],
    ["Roles", rolesOf(member)],
    ["City", member.profile.city || "—"],
    ["Profile", member.profile.exists ? "Created" : "Not created yet"],
    ["Joined", formatDate(member.createdAt)],
    ["Last sign-in", formatDate(member.lastLoginAt)],
  ];
  if (member.view === "full") rows.push(["Status changed", formatDate(member.statusChangedAt)], ["Marketing consent", member.profile.marketingConsent ? "Yes" : "No"]);
  return (
    <section className="uss-admin-workspace" aria-labelledby="member-detail-heading">
      <LinkButton href={membersHref({})} variant="text">← All members</LinkButton>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / MEMBERS / DETAIL</p>
        <h1 id="member-detail-heading">{nameOf(member)}</h1>
        <p><Badge tone={statusTone(member.status)}>{STATUS_LABELS[member.status]}</Badge>{isSelf && <> · This is your account</>}</p>
      </header>
      <div className="uss-admin-detail">
        <dl className="uss-member-panel uss-admin-facts">
          {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        {member.view === "full" && (canManageUsers || canManageRoles) ? (
          <div className="uss-member-panel">
            <AccountActions member={{ ...member, label: nameOf(member) }} isSelf={isSelf}
              canManageUsers={canManageUsers} canManageRoles={canManageRoles} adapters={adapters} />
          </div>
        ) : (
          <p className="uss-member-panel uss-admin-muted">Read-only view. Status and role changes are made by super admins.</p>
        )}
      </div>
    </section>
  );
}

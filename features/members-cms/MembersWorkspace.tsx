import { LinkButton } from "@/components/ui";
import { listManagedUsers } from "@/lib/admin-users/user-actions";
import { text, type Query } from "@/features/history/query";

const STATUSES = ["pending_verification", "active", "suspended", "deactivated"] as const;

export async function MembersWorkspace({ query }: { query: Query }) {
  const status = text(query, "status");
  const cursor = text(query, "cursor");
  const search = text(query, "search");

  if (
    (status && !STATUSES.some((value) => value === status)) ||
    cursor.length > 512 ||
    search.length > 100 ||
    (search.length > 0 && search.trim().length < 3)
  ) {
    return <section className="uss-member-panel" role="alert"><h2>Invalid member filter.</h2><p>Use a supported status or a search with at least three characters.</p><LinkButton href="/admin?module=members" variant="secondary">Reset filters</LinkButton></section>;
  }

  const filters = {
    limit: 20,
    ...(status ? { status } : {}),
    ...(search ? { search: search.trim() } : {}),
    ...(cursor ? { cursor } : {}),
  };
  const result = await listManagedUsers(filters);

  if (!result.ok) {
    return <section className="uss-member-panel" role="alert"><h2>Members unavailable.</h2><p>The member directory could not be loaded. No account changes were made.</p><LinkButton href="/admin?module=members" variant="secondary">Try again</LinkButton></section>;
  }

  const base = new URLSearchParams({ module: "members" });
  if (status) base.set("status", status);
  if (search) base.set("search", search.trim());

  return (
    <section className="uss-member-panel" aria-labelledby="members-heading">
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / MEMBERS</p>
        <h1 id="members-heading">MEMBERS.</h1>
        <p>Permission-controlled member directory. Account and role changes are deliberately unavailable in this first read-only release.</p>
      </header>
      <form action="/admin" method="get" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))", alignItems: "end" }}>
        <input type="hidden" name="module" value="members" />
        <label style={{ display: "grid", gap: "0.35rem", minWidth: 0 }}>
          <span>Find members</span>
          <input name="search" type="search" defaultValue={search} minLength={3} maxLength={100} placeholder="Name, email, or member ID (3+ characters)" style={{ width: "100%", minWidth: 0, padding: "0.75rem" }} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem", minWidth: 0 }}>
          <span>Account status</span>
          <select name="status" defaultValue={status} style={{ width: "100%", minWidth: 0, padding: "0.75rem" }}>
            <option value="">All statuses</option>
            {STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <button type="submit" className="uss-button">Apply filters</button>
        <LinkButton href="/admin?module=members" variant="text">Clear</LinkButton>
      </form>
      {!result.data.items.length ? <p role="status">No members match these filters.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0", display: "grid", gap: "0.75rem" }}>
          {result.data.items.map((member) => (
            <li key={member.id} className="uss-member-panel" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              <strong>{member.displayName || member.profile.fullName || "USS Member"}</strong>
              <p>{member.email} · {member.memberId}</p>
              <p>Status: {member.status.replaceAll("_", " ")} · Email: {member.emailVerified ? "Verified" : "Unverified"}</p>
              <p>Roles: {member.roles.join(", ") || "member"}</p>
            </li>
          ))}
        </ul>
      )}
      {result.data.nextCursor && <LinkButton href={`/admin?${base.toString()}&cursor=${encodeURIComponent(result.data.nextCursor)}`} variant="secondary">Next page ↗</LinkButton>}
      {cursor && <LinkButton href={`/admin?${base.toString()}`} variant="text">First page ↗</LinkButton>}
    </section>
  );
}

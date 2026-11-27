import { LinkButton } from "@/components/ui";
import { getMemberDirectoryEntry, listMemberDirectory } from "@/lib/admin-users/user-actions";
import { text, type Query } from "@/features/history/query";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { MemberDetailView, MemberDirectoryView } from "./MemberViews";
import { MEMBER_PAGE_SIZE, memberQuery, membersHref } from "./model";

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <section className="uss-member-panel" role="alert">
      <h2>{title}</h2>
      <p>{body}</p>
      <LinkButton href={membersHref({})} variant="secondary">Back to members</LinkButton>
    </section>
  );
}

/** Server workspace: members.read (restricted) or users.manage (full); actions are permission-gated again on the server. */
export async function MembersWorkspace({ query, canManageUsers = false, canManageRoles = false }: {
  query: Query; canManageUsers?: boolean; canManageRoles?: boolean;
}) {
  const input = memberQuery(key => text(query, key));
  if (!input.ok)
    return <Unavailable title="Invalid member filter." body="Use a listed status and a search of 3–100 plain characters." />;
  if (input.member) {
    const result = await getMemberDirectoryEntry({ id: input.member });
    if (!result.ok) {
      if (result.code === "USER_NOT_FOUND") return <Unavailable title="Member not found." body="The account may have been removed, or the link is outdated." />;
      if (result.code === "USER_UNAVAILABLE" || result.code === "USER_SEARCH_INVALID")
        return <Unavailable title="Member unavailable." body="The account could not be loaded. No changes were made." />;
      return <ServiceFeedback code={result.code === "USER_FORBIDDEN" ? "INSUFFICIENT_PERMISSION" : result.code} returnTo="/admin?module=members" />;
    }
    return <MemberDetailView detail={result.data} canManageUsers={canManageUsers} canManageRoles={canManageRoles} />;
  }
  const result = await listMemberDirectory({
    limit: MEMBER_PAGE_SIZE,
    ...(input.status ? { status: input.status } : {}),
    ...(input.search ? { search: input.search } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
  });
  if (!result.ok) {
    if (result.code === "USER_SEARCH_INVALID")
      return <Unavailable title="This page link expired." body="Filters changed since the page was opened. Start again from the first page." />;
    if (result.code === "USER_UNAVAILABLE")
      return <Unavailable title="Members unavailable." body="The member directory could not be loaded. No account changes were made." />;
    return <ServiceFeedback code={result.code === "USER_FORBIDDEN" ? "INSUFFICIENT_PERMISSION" : result.code} returnTo="/admin?module=members" />;
  }
  return <MemberDirectoryView page={result.data} status={input.status} search={input.search} cursor={input.cursor} />;
}

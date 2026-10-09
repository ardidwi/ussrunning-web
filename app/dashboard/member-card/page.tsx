import { loadOwnMemberCard } from "@/features/member-card/api/server";
import { MemberCardScreen } from "@/features/member-card/components/MemberCardScreen";
export const metadata = { title: "Member Card — USS Running" };
export default async function MemberCardPage() {
  const result = await loadOwnMemberCard();
  const key = result.ok
    ? `${result.data.memberId}:${result.data.displayName}:${result.data.avatar?.url ?? ""}`
    : result.code;
  return <MemberCardScreen key={key} initial={result} />;
}

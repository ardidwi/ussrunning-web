import "server-only";
import { requireCompleteMember } from "./complete-member";
import { signedAvatar } from "./avatar-storage";
import { profileOperation } from "./profile-errors";
import { memberBarcode } from "./barcode-contract";
import type { MemberCardPresentationDTO } from "./member-card-types";
/** Owner-only, active/verified, fresh DB lifecycle check; never accepts identity input. */
export async function getCurrentMemberCardPresentation(): Promise<MemberCardPresentationDTO> {
  return profileOperation(async () => {
    const record = await requireCompleteMember();
    const name = record.profile!.full_name;
    return { displayName: typeof name === "string" && name.trim() ? name : record.display_name || record.member_id,
      memberId: record.member_id, barcode: memberBarcode(record.barcode_value), status: record.status, avatar: await signedAvatar(record.avatar) };
  });
}

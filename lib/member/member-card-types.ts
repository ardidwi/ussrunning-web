import type { AccountStatus } from "@/lib/db/types";
import type { AvatarDTO, ProfileResult } from "./profile-types";
import type { MEMBER_BARCODE_FORMAT_VERSION } from "./barcode-contract";
export interface MemberCardPresentationDTO {
  displayName: string;
  memberId: string;
  barcode: { value: string; formatVersion: typeof MEMBER_BARCODE_FORMAT_VERSION };
  status: AccountStatus;
  avatar: AvatarDTO | null;
}
export type MemberCardResult = { ok: true; code: "MEMBER_CARD_AVAILABLE"; data: MemberCardPresentationDTO } | Extract<ProfileResult<never>, { ok: false }>;

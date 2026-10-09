"use server";
import { getCurrentMemberCardPresentation } from "./member-card-service";
import { profileFailure } from "./profile-errors";
import type { MemberCardResult } from "./member-card-types";
export async function getOwnMemberCardPresentation(): Promise<MemberCardResult> {
  try { return { ok: true, code: "MEMBER_CARD_AVAILABLE", data: await getCurrentMemberCardPresentation() }; }
  catch (error) { return profileFailure(error); }
}

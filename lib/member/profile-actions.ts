"use server";
import { getCurrentMemberProfile, updateCurrentMemberProfile, getCurrentMemberCard } from "./profile-service";
import { profileFailure } from "./profile-errors";
import type { MemberProfileDTO, MemberCardDTO, ProfileResult } from "./profile-types";
export async function getOwnMemberProfile(): Promise<ProfileResult<MemberProfileDTO>> {
  try { return { ok: true, data: await getCurrentMemberProfile() }; } catch (error) { return profileFailure(error); }
}
export async function updateOwnMemberProfile(input: unknown): Promise<ProfileResult<MemberProfileDTO>> {
  try { return { ok: true, data: await updateCurrentMemberProfile(input) }; } catch (error) { return profileFailure(error); }
}
export async function getOwnMemberCard(): Promise<ProfileResult<MemberCardDTO>> {
  try { return { ok: true, data: await getCurrentMemberCard() }; } catch (error) { return profileFailure(error); }
}

"use server";

import { identityResult, lookupMember, lookupMemberById, reviewMemberAvatar, uploadOwnAvatar as upload } from "./identity-service";

export async function uploadOwnAvatar(data: FormData) {
  return identityResult(() => upload(data));
}
export async function lookupMemberBarcode(value: unknown) {
  return identityResult(() => lookupMember(value));
}
export async function lookupMemberId(value: unknown) {
  return identityResult(() => lookupMemberById(value));
}
export async function moderateMemberAvatar(value: unknown) {
  return identityResult(() => reviewMemberAvatar(value));
}

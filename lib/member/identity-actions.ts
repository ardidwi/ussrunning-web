"use server";

import { identityResult, lookupMember, reviewMemberAvatar, uploadOwnAvatar as upload } from "./identity-service";

export async function uploadOwnAvatar(data: FormData) {
  return identityResult(() => upload(data));
}
export async function lookupMemberBarcode(value: unknown) {
  return identityResult(() => lookupMember(value));
}
export async function moderateMemberAvatar(value: unknown) {
  return identityResult(() => reviewMemberAvatar(value));
}

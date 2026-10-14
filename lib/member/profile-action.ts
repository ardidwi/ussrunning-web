"use server";
import { getOwnMemberProfile, updateOwnMemberProfile } from "./profile-actions";
import { projectProfile } from "./profile-adapter";
import type { MemberResult, ProfileValues, ProfileDetails } from "./contract";
import { revalidatePath } from "next/cache";
export async function saveProfile(values: ProfileValues, revision: string, details?: ProfileDetails): Promise<MemberResult> {
  if (!values || typeof values !== "object") return { state: "error", code: "VALIDATION_ERROR" };
  const result = projectProfile(await updateOwnMemberProfile({ expectedVersion: revision, changes: {
    fullName: values.fullName, phone: values.phone, city: values.city, instagramHandle: values.instagram,
    emergencyContactName: values.emergencyContactName, emergencyContactPhone: values.emergencyContactPhone,
    ...(details ? { birthDate: details.birthDate || null, gender: details.gender || null, jerseySize: details.jerseySize || null, runningPreferences: details.runningPreferences, marketingConsent: details.marketingConsent, ...(details.privacyConsent === true ? { privacyConsent: true } : {}) } : {}),
  } }));
  if (result.state === "ready") revalidatePath("/dashboard", "layout");
  return result;
}
export async function reloadProfile(): Promise<MemberResult> { return projectProfile(await getOwnMemberProfile()); }

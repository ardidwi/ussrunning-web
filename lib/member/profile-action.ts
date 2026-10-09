"use server";
import { updateOwnMemberProfile } from "./profile-actions";
import { projectProfile } from "./profile-adapter";
import type { MemberResult, ProfileValues } from "./contract";
export async function saveProfile(values: ProfileValues, revision: string): Promise<MemberResult> {
  if (!values || typeof values !== "object") return { state: "error", code: "VALIDATION_ERROR" };
  return projectProfile(await updateOwnMemberProfile({ expectedVersion: revision, changes: {
    fullName: values.fullName, phone: values.phone, city: values.city, instagramHandle: values.instagram,
    emergencyContactName: values.emergencyContactName, emergencyContactPhone: values.emergencyContactPhone,
  } }));
}

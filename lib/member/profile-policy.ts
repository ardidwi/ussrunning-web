/** Central, code-owned initial profile vocabulary; no scattered frontend enums. */
export const PROFILE_POLICY = {
  maxBirthAgeYears: 120, maxPayloadBytes: 8192, maxPreferencesBytes: 1024, maxName: 120, maxCity: 100,
  genderValues: ["female", "male", "non_binary", "prefer_not_to_say"],
  jerseySizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  avatarMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
} as const;
export const PROFILE_FIELDS = ["fullName", "phone", "birthDate", "gender", "city", "emergencyContactName", "emergencyContactPhone", "instagramHandle", "jerseySize", "runningPreferences", "avatarMediaId", "marketingConsent", "privacyConsent"] as const;

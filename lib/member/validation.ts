import {
  profileFields,
  profileLabels,
  type ProfileValues,
  type ProfilePolicy,
  type ProfileField,
} from "./contract";
export function validateProfile(values: ProfileValues, policy: ProfilePolicy) {
  const errors: Partial<Record<ProfileField, string>> = {};
  for (const field of profileFields) {
    const value = values[field].trim();
    if (policy.required.includes(field) && !value)
      errors[field] = `Enter your ${profileLabels[field].toLowerCase()}.`;
    else if (value.length > policy.maxLengths[field])
      errors[field] = `Use ${policy.maxLengths[field]} characters or fewer.`;
  }
  for (const field of ["phone", "emergencyContactPhone"] as const) {
    const value = values[field].trim(),
      digits = value.replace(/\D/g, "").length;
    if (
      value &&
      (!/^\+?[\d ()-]+$/.test(value) ||
        digits < policy.minimumPhoneDigits ||
        digits > policy.maximumPhoneDigits)
    )
      errors[field] =
        "Enter a valid phone number, including the country code when needed.";
  }
  if (values.fullName.trim().length < 2) errors.fullName = "Use at least two characters for your full name.";
  if (values.emergencyContactName.trim() && values.emergencyContactName.trim().length < 2) errors.emergencyContactName = "Use at least two characters for the contact name.";
  for (const field of profileFields) if (/[<>\x00-\x1f\x7f]/.test(values[field])) errors[field] = "Use plain text without markup or control characters.";
  if (values.instagram.trim() && !/^@?[A-Za-z0-9_.]{1,30}$/.test(values.instagram.trim())) errors.instagram = "Use a valid Instagram handle, with an optional @ prefix.";
  if (
    Boolean(values.emergencyContactName.trim()) !==
    Boolean(values.emergencyContactPhone.trim())
  ) {
    const field = values.emergencyContactName.trim()
      ? "emergencyContactPhone"
      : "emergencyContactName";
    errors[field] = "Add both the contact name and phone, or leave both empty.";
  }
  return errors;
}

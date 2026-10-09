import type { AuthField, AuthFlow, AuthInput, AuthPolicy } from "./contract";
export function emailError(value?: string): string | undefined {
  const email = value?.trim() ?? "";
  if (!email) return "Email address is required.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter a valid email address.";
}
export function validateAuth(
  flow: AuthFlow | "resend",
  values: AuthInput,
  policy: AuthPolicy,
): Partial<Record<AuthField, string>> {
  const errors: Partial<Record<AuthField, string>> = {};
  if (["login", "register", "forgot", "resend"].includes(flow)) {
    const issue = emailError(values.email);
    if (issue) errors.email = issue;
  }
  if (flow === "register") {
    const name = values.fullName?.trim() ?? "";
    if (!name) errors.fullName = "Full name is required.";
    else if (name.length > policy.maximumNameLength)
      errors.fullName = `Use ${policy.maximumNameLength} characters or fewer.`;
    if (!values.consent)
      errors.consent = "Please accept the Privacy Policy and Terms of Use.";
  }
  if (["login", "register", "reset"].includes(flow)) {
    if (!values.password) errors.password = "Password is required.";
    else if (
      flow !== "login" &&
      (values.password.length < policy.minimumPasswordLength ||
        values.password.length > policy.maximumPasswordLength)
    )
      errors.password = `Use ${policy.minimumPasswordLength}–${policy.maximumPasswordLength} characters.`;
  }
  if (flow === "register" || flow === "reset") {
    if (!values.confirmPassword)
      errors.confirmPassword = "Confirm your password.";
    else if (values.password !== values.confirmPassword)
      errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}
export function passwordHint(policy: AuthPolicy) {
  return `Use ${policy.minimumPasswordLength}–${policy.maximumPasswordLength} characters. Choose a unique password for your USS account.`;
}
export function maskEmail(email?: string) {
  if (!email?.includes("@")) return "your registered email";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}•••@${domain}`;
}

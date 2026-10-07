"use server";

import { getAuth } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { membershipConfig } from "@/lib/membership-config";

export type JoinField =
  | "firstName"
  | "lastName"
  | "email"
  | "mobile"
  | "city"
  | "instagram"
  | "emergencyContactName"
  | "emergencyContactMobile"
  | "password"
  | "confirmPassword"
  | "acceptLegal";

export type JoinState = {
  status?: "success" | "error";
  message?: string;
  memberCode?: string;
  fieldErrors?: Partial<Record<JoinField, string>>;
};

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function normalizeInstagram(value: string) {
  const cleaned = value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0]
    .replace(/^@+/, "");

  return cleaned ? `@${cleaned}` : "";
}

function error(
  message: string,
  fieldErrors?: Partial<Record<JoinField, string>>
): JoinState {
  return { status: "error", message, fieldErrors };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidInstagram(value: string) {
  return /^@[A-Za-z0-9._]{1,30}$/.test(value);
}

function isValidPhone(value: string) {
  const length = value.replace(/\D/g, "").length;
  return (
    length >= membershipConfig.minimumPhoneDigits &&
    length <= membershipConfig.maximumPhoneDigits
  );
}

function friendlySignupError(message?: string) {
  const normalized = (message || "").toLowerCase();

  if (
    normalized.includes("already") ||
    normalized.includes("exist") ||
    normalized.includes("registered")
  ) {
    return error(
      "An account with this email already exists. Please log in instead.",
      { email: "This email is already registered." }
    );
  }

  if (normalized.includes("password")) {
    return error("Please review your password and try again.", {
      password: "This password was not accepted. Please use a different password.",
    });
  }

  return error("We couldn't create your USS account right now. Please try again.");
}

function friendlyDatabaseError(cause: unknown): JoinState {
  const record = cause as {
    code?: string;
    constraint?: string;
    message?: string;
  };

  if (record?.code === "23505") {
    const constraint = (record.constraint || record.message || "").toLowerCase();

    if (constraint.includes("instagram")) {
      return error("That Instagram account is already linked to a USS member.", {
        instagram: "Instagram is already in use.",
      });
    }

    if (constraint.includes("mobile") || constraint.includes("phone")) {
      return error("That mobile number is already linked to a USS member.", {
        mobile: "Mobile number is already in use.",
      });
    }
  }

  return error(
    "Your account was created, but we couldn't finish the USS member profile. Please try logging in again in a moment."
  );
}

export async function createMember(
  _state: JoinState,
  formData: FormData
): Promise<JoinState> {
  const firstName = cleanText(String(formData.get("firstName") || ""));
  const lastName = cleanText(String(formData.get("lastName") || ""));
  const email = cleanText(String(formData.get("email") || "")).toLowerCase();
  const mobile = cleanPhone(String(formData.get("mobile") || ""));
  const city = cleanText(String(formData.get("city") || ""));
  const instagram = normalizeInstagram(String(formData.get("instagram") || ""));
  const emergencyContactName = cleanText(
    String(formData.get("emergencyContactName") || "")
  );
  const emergencyContactMobile = cleanPhone(
    String(formData.get("emergencyContactMobile") || "")
  );
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const acceptedLegal = formData.get("acceptLegal") === "on";
  const marketingConsent = formData.get("marketingConsent") === "on";

  const fieldErrors: Partial<Record<JoinField, string>> = {};

  if (!firstName) fieldErrors.firstName = "First name is required.";
  if (!email) fieldErrors.email = "Email is required.";
  if (!mobile) fieldErrors.mobile = "Mobile number is required.";
  if (!city) fieldErrors.city = "City is required.";
  if (!instagram) fieldErrors.instagram = "Instagram is required.";
  if (!emergencyContactName) {
    fieldErrors.emergencyContactName = "Emergency contact name is required.";
  }
  if (!emergencyContactMobile) {
    fieldErrors.emergencyContactMobile = "Emergency contact number is required.";
  }
  if (!password) fieldErrors.password = "Password is required.";

  if (firstName.length > membershipConfig.maximumNameLength) {
    fieldErrors.firstName = `Use ${membershipConfig.maximumNameLength} characters or fewer.`;
  }
  if (lastName.length > membershipConfig.maximumNameLength) {
    fieldErrors.lastName = `Use ${membershipConfig.maximumNameLength} characters or fewer.`;
  }
  if (city.length > membershipConfig.maximumCityLength) {
    fieldErrors.city = `Use ${membershipConfig.maximumCityLength} characters or fewer.`;
  }

  if (email && !isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (mobile && !isValidPhone(mobile)) {
    fieldErrors.mobile = "Enter a valid mobile number.";
  }

  if (instagram && !isValidInstagram(instagram)) {
    fieldErrors.instagram = "Use a valid Instagram username.";
  }

  if (emergencyContactMobile && !isValidPhone(emergencyContactMobile)) {
    fieldErrors.emergencyContactMobile = "Enter a valid emergency contact number.";
  }

  if (
    password.length < membershipConfig.minimumPasswordLength ||
    password.length > membershipConfig.maximumPasswordLength
  ) {
    fieldErrors.password = `Password must be ${membershipConfig.minimumPasswordLength}-${membershipConfig.maximumPasswordLength} characters.`;
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Password confirmation does not match.";
  }

  if (!acceptedLegal) {
    fieldErrors.acceptLegal = "Please accept the Privacy Policy and Terms of Use.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return error("Please review the highlighted fields and try again.", fieldErrors);
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  try {
    const { data, error: authError } = await getAuth().signUp.email({
      name: fullName,
      email,
      password,
    });

    if (authError) {
      return friendlySignupError(authError.message);
    }

    const userId = data?.user?.id;
    if (!userId) {
      return error(
        "Your account was created, but we could not finish the USS member profile. Please log in and complete your profile."
      );
    }

    try {
      const profiles = await query<{ member_code: string }>(
        `WITH profile AS (
           INSERT INTO public.user_profiles(
             auth_user_id,first_name,last_name,mobile,city,instagram,
             emergency_contact_name,emergency_contact_mobile,
             marketing_consent,marketing_consent_at,privacy_version,terms_version
           )
           VALUES(
             $1,$2,$3,$4,$5,$6,$7,$8,$9,
             CASE WHEN $9 THEN now() ELSE NULL END,
             $10,$11
           )
           ON CONFLICT(auth_user_id)
           DO UPDATE SET
             first_name=EXCLUDED.first_name,
             last_name=EXCLUDED.last_name,
             mobile=EXCLUDED.mobile,
             city=EXCLUDED.city,
             instagram=EXCLUDED.instagram,
             emergency_contact_name=EXCLUDED.emergency_contact_name,
             emergency_contact_mobile=EXCLUDED.emergency_contact_mobile,
             marketing_consent=EXCLUDED.marketing_consent,
             marketing_consent_at=EXCLUDED.marketing_consent_at,
             privacy_version=EXCLUDED.privacy_version,
             terms_version=EXCLUDED.terms_version,
             updated_at=now()
           RETURNING member_code
         ),
         privacy_consent AS (
           INSERT INTO public.legal_consents(
             auth_user_id,consent_type,version,accepted,accepted_at,source
           )
           VALUES($1,'privacy',$10,true,now(),$14)
           ON CONFLICT(auth_user_id,consent_type,version)
           DO UPDATE SET accepted=true,accepted_at=now(),source=EXCLUDED.source
           RETURNING 1
         ),
         terms_consent AS (
           INSERT INTO public.legal_consents(
             auth_user_id,consent_type,version,accepted,accepted_at,source
           )
           VALUES($1,'terms',$11,true,now(),$14)
           ON CONFLICT(auth_user_id,consent_type,version)
           DO UPDATE SET accepted=true,accepted_at=now(),source=EXCLUDED.source
           RETURNING 1
         ),
         marketing_consent_row AS (
           INSERT INTO public.legal_consents(
             auth_user_id,consent_type,version,accepted,accepted_at,source
           )
           SELECT $1,'marketing',$12,true,now(),$14
           WHERE $9
           ON CONFLICT(auth_user_id,consent_type,version)
           DO UPDATE SET accepted=true,accepted_at=now(),source=EXCLUDED.source
           RETURNING 1
         ),
         newsletter AS (
           INSERT INTO public.newsletter_subscriptions(
             email,status,consent_version,consent_at,source
           )
           SELECT $13,$15,$12,now(),$14
           WHERE $9
           ON CONFLICT(email)
           DO UPDATE SET
             status=EXCLUDED.status,
             consent_version=EXCLUDED.consent_version,
             consent_at=now(),
             unsubscribed_at=NULL,
             source=EXCLUDED.source,
             updated_at=now()
           RETURNING 1
         )
         SELECT member_code FROM profile`,
        [
          userId,
          firstName,
          lastName || null,
          mobile,
          city,
          instagram,
          emergencyContactName,
          emergencyContactMobile,
          marketingConsent,
          membershipConfig.privacyVersion,
          membershipConfig.termsVersion,
          membershipConfig.marketingVersion,
          email,
          membershipConfig.joinSource,
          membershipConfig.newsletterSubscribedStatus,
        ]
      );

      const memberCode = profiles[0]?.member_code;
      if (!memberCode) {
        return error(
          "Your USS account exists, but the member ID is still being prepared. Please log in again in a moment."
        );
      }

      return {
        status: "success",
        message:
          "Your USS account is ready. Continue to My USS to see your member ID and upcoming runs.",
        memberCode,
      };
    } catch (databaseError) {
      return friendlyDatabaseError(databaseError);
    }
  } catch {
    return error(
      "We couldn't finish creating your USS account. Please try again in a moment."
    );
  }
}

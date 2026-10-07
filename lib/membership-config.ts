export const membershipConfig = {
  privacyVersion: process.env.USS_PRIVACY_VERSION || "2026-10-01",
  termsVersion: process.env.USS_TERMS_VERSION || "2026-10-01",
  minimumPasswordLength: Number(process.env.USS_MIN_PASSWORD_LENGTH || 8),
  maximumPasswordLength: Number(process.env.USS_MAX_PASSWORD_LENGTH || 128),
  maximumNameLength: Number(process.env.USS_MAX_NAME_LENGTH || 80),
  maximumCityLength: Number(process.env.USS_MAX_CITY_LENGTH || 80),
  maximumInstagramLength: Number(process.env.USS_MAX_INSTAGRAM_LENGTH || 30),
  minimumPhoneDigits: Number(process.env.USS_MIN_PHONE_DIGITS || 8),
  maximumPhoneDigits: Number(process.env.USS_MAX_PHONE_DIGITS || 15),
  joinSource: process.env.USS_JOIN_SOURCE || "join",
  newsletterSubscribedStatus:
    process.env.USS_NEWSLETTER_SUBSCRIBED_STATUS || "subscribed",
};

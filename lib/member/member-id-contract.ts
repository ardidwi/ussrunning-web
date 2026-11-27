/**
 * Staff manual entry of a human Member ID (K-02, displayed as USS-000123).
 * Accepts any case, an optional single dash and optional leading zeros; nothing else.
 * Returns the member_number as a decimal string (bigint-safe), or null when the input is not a Member ID.
 */
const MAX_MEMBER_NUMBER = "9223372036854775807";
export function parseMemberIdInput(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const match = /^USS-?([0-9]{1,25})$/i.exec(value.trim());
  if (!match) return null;
  const digits = match[1].replace(/^0+/, "");
  if (!digits || digits.length > 19) return null;
  // Equal-length decimal strings compare numerically; zero was stripped above.
  return digits.length < 19 || digits <= MAX_MEMBER_NUMBER ? digits : null;
}

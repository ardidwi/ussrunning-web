import type { MemberCardResult } from "@/lib/member/member-card-types";
import {
  MEMBER_BARCODE_FORMAT_VERSION,
  memberBarcode,
} from "@/lib/member/barcode-contract";
export function cardPresentation(result: MemberCardResult): MemberCardResult {
  if (!result || typeof result !== "object")
    return { ok: false, code: "PROFILE_UNAVAILABLE" };
  if (!result.ok) return result;
  const data = result.data;
  if (!data || data.status !== "active")
    return {
      ok: false,
      code:
        data?.status === "suspended"
          ? "ACCOUNT_SUSPENDED"
          : data?.status === "deactivated"
            ? "ACCOUNT_DEACTIVATED"
            : data?.status === "pending_verification"
              ? "EMAIL_NOT_VERIFIED"
              : "PROFILE_UNAVAILABLE",
    };
  try {
    if (
      data.barcode.formatVersion !== MEMBER_BARCODE_FORMAT_VERSION ||
      typeof data.displayName !== "string" ||
      !data.displayName ||
      typeof data.memberId !== "string" ||
      !data.memberId
    )
      throw new Error("Invalid presentation");
    memberBarcode(data.barcode.value);
    return result;
  } catch {
    return { ok: false, code: "PROFILE_UNAVAILABLE" };
  }
}
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toUpperCase();
}

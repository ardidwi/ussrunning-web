import type { AccountStatus } from "@/lib/db/types";
import type { SystemRole } from "@/lib/authz/permissions";

/** Pure UI policy for the Members, Roles and Photo review workspaces. The server re-validates everything. */
export const MEMBER_STATUSES = ["pending_verification", "active", "suspended", "deactivated"] as const satisfies readonly AccountStatus[];
export const MEMBER_PAGE_SIZE = 20;
export const REASON_LIMITS = { min: 5, max: 500 } as const;
export const PHOTO_REASON_LIMITS = { min: 5, max: 240 } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const STATUS_LABELS: Record<AccountStatus, string> = {
  pending_verification: "Pending verification",
  active: "Active",
  suspended: "Suspended",
  deactivated: "Deactivated",
};
export function statusTone(status: AccountStatus): "success" | "error" | "warning" | "info" {
  return status === "active" ? "success" : status === "suspended" ? "warning" : status === "deactivated" ? "error" : "info";
}
export const ROLE_LABELS: Record<SystemRole, string> = { member: "Member", admin: "Admin", super_admin: "Super admin" };

export type LifecycleOperation = "activate" | "suspend" | "deactivate";
export const LIFECYCLE_COPY: Record<LifecycleOperation, { label: string; title: string; description: string; tone: "primary" | "danger" | "secondary" }> = {
  activate: { label: "Reactivate account", title: "Reactivate this account?", description: "The member can sign in and use MY USS again. Email verification is not changed.", tone: "primary" },
  suspend: { label: "Suspend account", title: "Suspend this account?", description: "The member is blocked from signing in to protected areas until an account manager reactivates them. Records are kept.", tone: "secondary" },
  deactivate: { label: "Deactivate account", title: "Deactivate this account?", description: "The account is retained but closed. It can only be reactivated if the email was verified.", tone: "danger" },
};

/** Mirrors uss.manage_account transitions so only meaningful actions are offered. */
export function lifecycleOperations(member: { status: AccountStatus; emailVerified: boolean; roles: readonly SystemRole[] }): LifecycleOperation[] {
  if (member.roles.includes("super_admin")) return [];
  if (member.status === "active") return ["suspend", "deactivate"];
  if (member.status === "suspended") return member.emailVerified ? ["activate", "deactivate"] : ["deactivate"];
  if (member.status === "deactivated") return member.emailVerified ? ["activate"] : [];
  return ["deactivate"];
}

export function reasonError(value: string, limits: { min: number; max: number } = REASON_LIMITS): string | null {
  const text = value.trim();
  if (text.length < limits.min) return `Write a reason of at least ${limits.min} characters. It is kept in the audit history.`;
  if (value.length > limits.max) return `Keep the reason under ${limits.max} characters.`;
  // eslint-disable-next-line no-control-regex
  if (/[<>\u0000-\u001f\u007f]/.test(value)) return "Use plain text without < > or control characters.";
  return null;
}

const CONFLICT = "This account changed after you opened it. Reload to see the latest state, then try again.";
export const USER_MESSAGES: Record<string, string> = {
  USER_CONFLICT: CONFLICT,
  USER_INVALID_STATE: "That change no longer applies to the account's current status. Reload to see the latest state.",
  USER_PROTECTED: "Super admin accounts can't be suspended or deactivated here. Revoke the super admin role first.",
  USER_SELF_ACTION_FORBIDDEN: "You can't change the status of your own account.",
  USER_LAST_SUPER_ADMIN: "This is the last active super admin. Add another super admin before changing this account.",
  USER_VERIFICATION_UNAVAILABLE: "This account never verified its email, so it can't be reactivated. The member must sign up and verify again.",
  USER_INVALID_INPUT: "Check the reason and try again.",
  USER_NOT_FOUND: "This account no longer exists.",
  USER_FORBIDDEN: "Your account can no longer manage member accounts.",
  UNAUTHENTICATED: "Your session ended. Sign in again to continue.",
};
export const ROLE_MESSAGES: Record<string, string> = {
  ROLE_CONFLICT: CONFLICT,
  ROLE_LAST_SUPER_ADMIN: "This is the last active super admin. Grant super admin to another verified account before revoking this one.",
  ROLE_SELF_ACTION_FORBIDDEN: "You can't change your own roles. Ask another super admin.",
  ROLE_TARGET_INELIGIBLE: "Only active accounts with a verified email can receive an elevated role.",
  ROLE_ALREADY_ASSIGNED: "The account already has this role. Reload to see the latest state.",
  ROLE_NOT_ASSIGNED: "The account no longer has this role. Reload to see the latest state.",
  ROLE_TARGET_NOT_FOUND: "This account no longer exists.",
  ROLE_INVALID_INPUT: "Check the reason and try again.",
  ROLE_FORBIDDEN: "Your account can no longer manage roles.",
  UNAUTHENTICATED: "Your session ended. Sign in again to continue.",
};
export const PHOTO_MESSAGES: Record<string, string> = {
  AVATAR_CONFLICT: "The member replaced this photo. Reload the queue to review the new one.",
  PROFILE_NOT_FOUND: "This photo is no longer on the member's profile.",
  PHOTO_REVIEW_INVALID: "Write a plain-text reason of 5–240 characters.",
  INSUFFICIENT_PERMISSION: "Your account can no longer review photos.",
  UNAUTHENTICATED: "Your session ended. Sign in again to continue.",
};
export function messageFor(table: Record<string, string>, code: string): string {
  return table[code] ?? "The change could not be saved. Nothing was changed; try again in a moment.";
}
export function isConflict(code: string) {
  return code === "USER_CONFLICT" || code === "ROLE_CONFLICT" || code === "AVATAR_CONFLICT" || code === "USER_INVALID_STATE" ||
    code === "ROLE_ALREADY_ASSIGNED" || code === "ROLE_NOT_ASSIGNED";
}

export const PHOTO_REJECTION_PRESETS = [
  "Face is not clearly visible.",
  "Photo is blurry or too dark.",
  "Not a photo of a person.",
  "Contains inappropriate content.",
] as const;

export type MemberQuery =
  | { ok: true; status: AccountStatus | null; search: string; cursor: string; member: string | null }
  | { ok: false };
export function memberQuery(read: (key: string) => string): MemberQuery {
  const status = read("status"), search = read("search").trim(), cursor = read("cursor"), member = read("member");
  if (status && !MEMBER_STATUSES.some(value => value === status)) return { ok: false };
  if (search.length > 100 || (search.length > 0 && search.length < 3) || /[<>\u0000-\u001f\u007f]/.test(search)) return { ok: false };
  if (cursor.length > 512 || (cursor && !/^[A-Za-z0-9_-]+$/.test(cursor))) return { ok: false };
  if (member && !UUID.test(member)) return { ok: false };
  return { ok: true, status: (status || null) as AccountStatus | null, search, cursor, member: member || null };
}
export function membersHref(params: { status?: string | null; search?: string; cursor?: string; member?: string }) {
  const search = new URLSearchParams({ module: "members" });
  if (params.status) search.set("status", params.status);
  if (params.search) search.set("search", params.search);
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.member) search.set("member", params.member);
  return `/admin?${search.toString()}`;
}
export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

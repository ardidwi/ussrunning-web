// Stable states only. Editable Story types/categories/tags are database reference records.
export type UUID = string;
export type Timestamp = string;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type AccountStatus = "pending_verification" | "active" | "suspended" | "deactivated";
export type ContentStatus = "draft" | "published" | "archived";
export type StoryStatus = "draft" | "scheduled" | "published" | "archived";
export type EventStatus = "draft" | "published" | "registration_open" | "registration_closed" | "completed" | "cancelled" | "archived";
export type RegistrationStatus = "pending" | "confirmed" | "waitlisted" | "cancelled" | "rejected";
export type PassStatus = "active" | "revoked" | "expired";
export type NotificationStatus = "queued" | "sending" | "sent" | "delivered" | "failed" | "bounced";
export interface AccountRow {
  id: UUID; auth_provider_user_id: string; email: string; member_id: string; barcode_value: string;
  status: AccountStatus; email_verified_at: Timestamp | null; display_name: string | null;
  created_at: Timestamp; updated_at: Timestamp; last_login_at: Timestamp | null;
}
export interface RegistrationRow {
  id: UUID; event_id: UUID; account_id: UUID; status: RegistrationStatus;
  registered_at: Timestamp; cancelled_at: Timestamp | null; source: string; admin_note: string | null;
  created_at: Timestamp; updated_at: Timestamp;
}
export interface RevisionRow {
  id: UUID; version: number; created_by: UUID | null; created_at: Timestamp;
}

import "server-only";
import { Buffer } from "node:buffer";
import { PROFILE_FIELDS, PROFILE_POLICY as P } from "./profile-policy";
import { ProfileError } from "./profile-errors";
import type { FieldErrors, ProfilePatch, RunningPreferences, UpdateProfileInput } from "./profile-types";
const plain = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
const unsafeText = /[<>\u0000-\u001f\u007f]/;
function text(value: unknown, min: number, max: number): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || unsafeText.test(value)) throw new Error();
  const result = value.trim().replace(/\s+/g, " ");
  if (!result) return null;
  if (result.length < min || result.length > max) throw new Error();
  return result;
}
function phone(value: unknown) {
  const raw = text(value, 1, 40); if (!raw) return null;
  if (!/^\+?[0-9 ()-]+$/.test(raw)) throw new Error();
  const normalized = raw.replace(/[ ()-]/g, "");
  if (!/^\+?[0-9]{7,15}$/.test(normalized)) throw new Error();
  return normalized;
}
function date(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error();
  const parsed = new Date(value + "T00:00:00Z"), now = new Date();
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value > now.toISOString().slice(0, 10)) throw new Error();
  const earliest = new Date(now); earliest.setUTCFullYear(now.getUTCFullYear() - P.maxBirthAgeYears);
  if (parsed < earliest) throw new Error();
  return value;
}
export function validatePreferences(value: unknown): RunningPreferences {
  if (!plain(value) || Object.keys(value).some(k => !["distancesKm", "days", "goals"].includes(k))) throw new Error();
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > P.maxPreferencesBytes) throw new Error();
  const result: RunningPreferences = {};
  for (const key of Object.keys(value)) {
    const items = value[key];
    if (!Array.isArray(items) || items.length > (key === "goals" ? 5 : key === "days" ? 7 : 8)) throw new Error();
    if (key === "distancesKm") { if (items.some(v => typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > 200)) throw new Error(); result.distancesKm = [...new Set(items)] as number[]; }
    if (key === "days") { if (items.some(v => typeof v !== "string" || !(P.days as readonly string[]).includes(v))) throw new Error(); result.days = [...new Set(items)] as string[]; }
    if (key === "goals") { result.goals = [...new Set(items.map(v => { const result = text(v, 1, 60); if (!result) throw new Error(); return result; }))]; }
  }
  return result;
}
export function validateProfileUpdate(value: unknown): UpdateProfileInput {
  const errors: FieldErrors = {};
  // Reject cycles, exotic objects and oversized JSON before any SQL casts.
  try { if (!plain(value) || Buffer.byteLength(JSON.stringify(value), "utf8") > P.maxPayloadBytes) throw new Error(); }
  catch { throw new ProfileError("PROFILE_VALIDATION_ERROR", { changes: "INVALID" }); }
  if (Object.keys(value).some(k => !["expectedVersion", "changes"].includes(k))) errors.changes = "UNSUPPORTED";
  const version = value.expectedVersion;
  if (typeof version !== "string" || !/^[0-9a-f]{64}$/.test(version)) errors.expectedVersion = "INVALID";
  if (!plain(value.changes) || !Object.keys(value.changes).length) throw new ProfileError("PROFILE_VALIDATION_ERROR", { changes: "REQUIRED", ...errors });
  const changes: ProfilePatch = {};
  for (const [key, valueOfField] of Object.entries(value.changes)) {
    if (!(PROFILE_FIELDS as readonly string[]).includes(key)) { errors.changes = "UNSUPPORTED"; continue; }
    try {
      switch (key) {
        case "fullName": { const name = text(valueOfField, 2, P.maxName); if (!name) throw new Error(); changes.fullName = name; break; }
        case "phone": changes.phone = phone(valueOfField); break;
        case "birthDate": changes.birthDate = date(valueOfField); break;
        case "city": changes.city = text(valueOfField, 1, P.maxCity); break;
        case "emergencyContactName": changes.emergencyContactName = text(valueOfField, 2, P.maxName); break;
        case "emergencyContactPhone": changes.emergencyContactPhone = phone(valueOfField); break;
        case "gender": { const v = text(valueOfField, 1, 30); if (v && !(P.genderValues as readonly string[]).includes(v)) throw new Error(); changes.gender = v; break; }
        case "jerseySize": { const v = text(valueOfField, 1, 10)?.toUpperCase() || null; if (v && !(P.jerseySizes as readonly string[]).includes(v)) throw new Error(); changes.jerseySize = v; break; }
        case "instagramHandle": { const v = text(valueOfField, 1, 31)?.replace(/^@/, "") || null; if (v && !/^[A-Za-z0-9_.]{1,30}$/.test(v)) throw new Error(); changes.instagramHandle = v?.toLowerCase() || null; break; }
        case "runningPreferences": changes.runningPreferences = validatePreferences(valueOfField); break;
        case "avatarMediaId": if (valueOfField !== null && (typeof valueOfField !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valueOfField))) throw new Error(); changes.avatarMediaId = valueOfField as string | null; break;
        case "marketingConsent": if (typeof valueOfField !== "boolean") throw new Error(); changes.marketingConsent = valueOfField; break;
        case "privacyConsent": if (valueOfField !== true) throw new Error(); changes.privacyConsent = true; break;
      }
    } catch { errors[key as keyof ProfilePatch] = "INVALID"; }
  }
  if (Object.keys(errors).length) throw new ProfileError("PROFILE_VALIDATION_ERROR", errors);
  return { expectedVersion: version as string, changes };
}

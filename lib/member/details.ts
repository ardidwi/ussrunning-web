import type { ProfileDetails, ProfileDetailField } from "./contract";
import { PROFILE_POLICY } from "./profile-policy";
export function emptyProfileDetails(): ProfileDetails { return { birthDate:"",gender:"",jerseySize:"",runningPreferences:{},marketingConsent:false,privacyAccepted:false }; }
export function readProfileDetails(value: unknown): ProfileDetails | null {
  if (value === undefined) return emptyProfileDetails();
  if (!value || typeof value !== "object") return null;
  const v=value as Record<string,unknown>;
  if (["birthDate","gender","jerseySize"].some(key=>typeof v[key]!=="string") || typeof v.marketingConsent!=="boolean" || typeof v.privacyAccepted!=="boolean" || !v.runningPreferences || typeof v.runningPreferences!=="object" || Array.isArray(v.runningPreferences)) return null;
  const prefs=v.runningPreferences as Record<string,unknown>;
  let serialized: string;
  try { serialized=JSON.stringify(prefs); } catch { return null; }
  if (Object.keys(prefs).some(key=>!["days","distancesKm","goals"].includes(key)) || serialized.length>1024) return null;
  if (prefs.days!==undefined && (!Array.isArray(prefs.days) || prefs.days.length>7 || prefs.days.some(day=>!(PROFILE_POLICY.days as readonly unknown[]).includes(day)))) return null;
  if (prefs.distancesKm!==undefined && (!Array.isArray(prefs.distancesKm) || prefs.distancesKm.length>8 || prefs.distancesKm.some(n=>typeof n!=="number"||!Number.isFinite(n)||n<=0||n>200))) return null;
  if (prefs.goals!==undefined && (!Array.isArray(prefs.goals)||prefs.goals.length>5||prefs.goals.some(g=>typeof g!=="string"||!g.trim()||g.length>60))) return null;
  return { birthDate:v.birthDate as string,gender:v.gender as string,jerseySize:v.jerseySize as string,runningPreferences:JSON.parse(serialized) as ProfileDetails["runningPreferences"],marketingConsent:v.marketingConsent,privacyAccepted:v.privacyAccepted };
}
export function validateProfileDetails(details: ProfileDetails): Partial<Record<ProfileDetailField,string>> {
  const errors: Partial<Record<ProfileDetailField,string>>={};
  if (!readProfileDetails(details)) errors.runningPreferences="Review your running preferences.";
  if (details.birthDate) { const parsed=new Date(details.birthDate+"T00:00:00Z"), today=new Date(), earliest=new Date(today);earliest.setUTCFullYear(today.getUTCFullYear()-PROFILE_POLICY.maxBirthAgeYears);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(details.birthDate)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==details.birthDate||details.birthDate>today.toISOString().slice(0,10)||parsed<earliest)errors.birthDate="Use a valid birth date that is not in the future.";
  }
  if (details.gender && !(PROFILE_POLICY.genderValues as readonly string[]).includes(details.gender)) errors.gender="Choose a supported gender option.";
  if (details.jerseySize && !(PROFILE_POLICY.jerseySizes as readonly string[]).includes(details.jerseySize)) errors.jerseySize="Choose a supported jersey size.";
  return errors;
}

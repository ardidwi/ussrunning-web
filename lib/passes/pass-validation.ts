import "server-only";
import { PassError } from './pass-errors';
import { validateToken } from './pass-token';
function invalid(): never { throw new PassError('EVENT_PASS_VALIDATION_ERROR'); }
function object(value:unknown,allowed:readonly string[]):Record<string,unknown> {
  if (!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) invalid();
  try { if (Buffer.byteLength(JSON.stringify(value))>1024) invalid(); } catch { invalid(); }
  if(Object.keys(value).some(k=>!allowed.includes(k))) invalid();
  return value as Record<string,unknown>;
}
function uuid(value:unknown):string {
  if(typeof value!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) invalid();
  return value.toLowerCase();
}
export function reference(value:unknown) { const v=object(value,['eventId','registrationId']);return {eventId:uuid(v.eventId),registrationId:uuid(v.registrationId)}; }
export function revocation(value:unknown) { const v=object(value,['eventId','registrationId','passId']);return {eventId:uuid(v.eventId),registrationId:uuid(v.registrationId),passId:uuid(v.passId)}; }
export function resolution(value:unknown) { const v=object(value,['eventId','value']);return {eventId:uuid(v.eventId),hash:validateToken(v.value)}; }

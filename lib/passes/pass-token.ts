import "server-only";
import { createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { PassError } from './pass-errors';
import type { PassRecord, EventPassDTO } from './pass-types';
export const PASS_FORMAT_VERSION = 1 as const;
const prefix = 'USS-EVENT:1:';
function key(id: string): Buffer {
  try {
    const keys: unknown = JSON.parse(process.env.EVENT_PASS_TOKEN_KEYS ?? '');
    if (!keys || typeof keys !== 'object' || Array.isArray(keys) || !Object.hasOwn(keys,id)) throw Error();
    const value = (keys as Record<string,unknown>)[id];
    if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) throw Error();
    return Buffer.from(value,'hex');
  } catch { throw new PassError('EVENT_PASS_NOT_CONFIGURED'); }
}
export function passValue(id: string, eventId: string, registrationId: string, keyId: string): string {
  return prefix + createHmac('sha256',key(keyId)).update(`uss:event-pass:v1|${id}|${eventId}|${registrationId}`).digest('base64url');
}
export function tokenHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function validateToken(value: unknown): string {
  if (typeof value !== 'string' || !/^USS-EVENT:1:[A-Za-z0-9_-]{43}$/.test(value)) throw new PassError('EVENT_PASS_VALIDATION_ERROR');
  const suffix=value.slice(prefix.length);
  if (Buffer.from(suffix,'base64url').toString('base64url') !== suffix) throw new PassError('EVENT_PASS_VALIDATION_ERROR');
  return tokenHash(value);
}
export function candidate(eventId: string, registrationId: string) {
  const keyId=process.env.EVENT_PASS_TOKEN_KEY_ID;
  if (!keyId || !/^[a-zA-Z0-9_-]{1,32}$/.test(keyId)) throw new PassError('EVENT_PASS_NOT_CONFIGURED');
  const id=randomUUID();
  return {id,keyId,hash:tokenHash(passValue(id,eventId,registrationId,keyId))};
}
export function present(p: PassRecord): EventPassDTO {
  if (p.formatVersion !== PASS_FORMAT_VERSION || !p.tokenKeyId) throw new PassError('EVENT_PASS_PROTOCOL_UNSUPPORTED');
  const value=passValue(p.id,p.eventId,p.registrationId,p.tokenKeyId),hash=tokenHash(value);
  if (!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(p.tokenHash,'hex'))) throw new PassError('EVENT_PASS_NOT_CONFIGURED');
  return {id:p.id,registrationId:p.registrationId,eventId:p.eventId,status:'active',issuedAt:p.issuedAt,expiresAt:p.expiresAt,formatVersion:PASS_FORMAT_VERSION,barcode:{value,formatVersion:PASS_FORMAT_VERSION}};
}

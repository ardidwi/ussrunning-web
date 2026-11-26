import "server-only";
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
export type PassCode = 'PROFILE_INCOMPLETE' | 'EVENT_PASS_VALIDATION_ERROR' | 'EVENT_PASS_NOT_FOUND' | 'EVENT_PASS_NOT_ELIGIBLE' | 'EVENT_PASS_REVOKED' | 'EVENT_PASS_EXPIRED' | 'EVENT_PASS_PROTOCOL_UNSUPPORTED' | 'EVENT_PASS_NOT_CONFIGURED' | 'EVENT_PASS_UNAVAILABLE';
export class PassError extends Error { constructor(public readonly code: PassCode) { super(code); } }
export async function passOperation<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) {
    if (e instanceof PassError || e instanceof AccountError || e instanceof AuthorizationError) throw e;
    throw new PassError('EVENT_PASS_UNAVAILABLE');
  }
}

import 'server-only';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
export type PartnerCode = 'PARTNER_NOT_FOUND' | 'PARTNER_FORBIDDEN' | 'PARTNER_CONFLICT' | 'PARTNER_SLUG_TAKEN' | 'PARTNER_INVALID_STATE' | 'PARTNER_INVALID_CONTENT' | 'PARTNER_INVALID_INPUT' | 'PARTNER_MEDIA_INVALID' | 'PARTNER_INVALID_REFERENCE' | 'PARTNER_NOT_PUBLISHABLE' | 'PARTNER_UNAVAILABLE' | 'PARTNER_URL_INVALID' | 'PARTNER_EVENT_NOT_FOUND' | 'PARTNER_RELATION_CONFLICT';
export class PartnerError extends Error {
    constructor(public readonly code: PartnerCode) { super(code); }
}
export async function partnerOperation<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    }
    catch (e) {
        if (e instanceof PartnerError || e instanceof AccountError)
            throw e;
        if (e instanceof AuthorizationError)
            throw new PartnerError(e.code === 'INSUFFICIENT_PERMISSION' ? 'PARTNER_FORBIDDEN' : 'PARTNER_UNAVAILABLE');
        if (e && typeof e === 'object' && 'code' in e && e.code === '23505')
            throw new PartnerError('PARTNER_SLUG_TAKEN');
        throw new PartnerError('PARTNER_UNAVAILABLE');
    }
}

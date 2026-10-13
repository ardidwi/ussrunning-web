import 'server-only';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
export type SiteCode = 'SITE_CONTENT_NOT_FOUND' | 'SITE_CONTENT_FORBIDDEN' | 'SITE_CONTENT_CONFLICT' | 'SITE_CONTENT_INVALID_KEY' | 'SITE_CONTENT_INVALID_PAYLOAD' | 'SITE_CONTENT_INVALID_REFERENCE' | 'SITE_CONTENT_INVALID_URL' | 'SITE_CONTENT_INVALID_STATE' | 'SITE_CONTENT_NOT_PUBLISHABLE' | 'SITE_CONTENT_UNAVAILABLE';
export class SiteError extends Error {
    constructor(public readonly code: SiteCode) { super(code); }
}
export async function siteOperation<T>(fn: () => Promise<T>): Promise<T> { try {
    return await fn();
}
catch (e) {
    if (e instanceof SiteError || e instanceof AccountError)
        throw e;
    if (e instanceof AuthorizationError)
        throw new SiteError('SITE_CONTENT_FORBIDDEN');
    if (e && typeof e === 'object' && 'code' in e && e.code === '23505')
        throw new SiteError('SITE_CONTENT_CONFLICT');
    throw new SiteError('SITE_CONTENT_UNAVAILABLE');
} }

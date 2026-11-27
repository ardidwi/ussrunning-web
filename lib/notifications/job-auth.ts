import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
export type JobAuthResult = 'AUTHORIZED' | 'UNAUTHORIZED' | 'NOT_CONFIGURED';
/** Minimum secret length; shorter values are treated as not configured rather than weakly protected. */
export const MIN_JOB_SECRET_LENGTH = 32;
/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Both values are hashed to a fixed length before a
 * constant-time comparison, so neither the length nor a prefix of the secret is observable through timing.
 */
export function authorizeJobRequest(authorization: string | null, secret: string | undefined = process.env.CRON_SECRET): JobAuthResult {
    const expected = secret?.trim();
    if (!expected || expected.length < MIN_JOB_SECRET_LENGTH) return 'NOT_CONFIGURED';
    if (typeof authorization !== 'string' || authorization.length > 1024 || !authorization.startsWith('Bearer ')) return 'UNAUTHORIZED';
    const digest = (v: string) => createHash('sha256').update(v, 'utf8').digest();
    return timingSafeEqual(digest(authorization.slice(7)), digest(expected)) ? 'AUTHORIZED' : 'UNAUTHORIZED';
}

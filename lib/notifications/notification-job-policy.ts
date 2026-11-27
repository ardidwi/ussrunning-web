/**
 * D2.6 scheduled delivery policy. Cron runs every 5 minutes (vercel.json), so a new intent is sent within one interval.
 * maxAttempts matches the DB cap in uss.claim_notification_for_job and the managed claim (3), keeping both paths consistent.
 * Backoff is exponential: baseDelaySeconds * factor^(attempt-1), capped: 60s, then 240s, then terminal 'failed'.
 */
export const NOTIFICATION_JOB_POLICY = {
    batchSize: 25,
    concurrency: 5,
    maxAttempts: 3,
    baseDelaySeconds: 60,
    backoffFactor: 4,
    maxDelaySeconds: 3600,
    leaseSeconds: 300,
    timeBudgetMs: 45000,
} as const;
export function retryDelaySeconds(attempt: number) {
    const p = NOTIFICATION_JOB_POLICY;
    return Math.min(p.maxDelaySeconds, p.baseDelaySeconds * p.backoffFactor ** Math.max(0, attempt - 1));
}

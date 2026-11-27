import 'server-only';
import { getTransactionalEmailConfig } from '@/lib/email/config';
import { createResendProvider } from '@/lib/email/providers/resend';
import type { EmailProvider, ProviderResult } from '@/lib/email/types';
import { issuePassForConfirmedRegistration } from '@/lib/passes/pass-service';
import { PassError } from '@/lib/passes/pass-errors';
import { selectEnvelope } from './notification-envelope';
import { NOTIFICATION_JOB_POLICY } from './notification-job-policy';
import { claimForJob, finishJobAttempt, listDueNotifications, mergePassAnnouncement } from './notification-job-repository';
import { hasActivePass } from './notification-repository';
import type { NotificationRecord } from './notification-types';

export interface JobDelivery { provider: EmailProvider; from: string; baseUrl: string }
/** Counts only: the job response and logs never carry recipients, content, tokens or provider payloads. */
export interface NotificationJobReport {
    code: 'NOTIFICATION_JOB_COMPLETED' | 'NOTIFICATION_PROVIDER_UNAVAILABLE';
    scanned: number; claimed: number; sent: number; failed: number; retryScheduled: number; skipped: number;
    passesIssued: number; passIssueSkipped: number; deferred: number;
}
function empty(code: NotificationJobReport['code']): NotificationJobReport { return { code, scanned: 0, claimed: 0, sent: 0, failed: 0, retryScheduled: 0, skipped: 0, passesIssued: 0, passIssueSkipped: 0, deferred: 0 }; }

async function ensurePass(r: NotificationRecord, report: NotificationJobReport) {
    // Issue only for an intent that has never been attempted: a retry must replay its first envelope unchanged.
    if (r.notification_type !== 'registration_confirmed' || r.attempt_count > 0) return;
    try {
        const result = await issuePassForConfirmedRegistration(r.event_id, r.registration_id);
        if (result.code === 'EVENT_PASS_ISSUED') report.passesIssued++;
        else if (result.code !== 'EVENT_PASS_EXISTS') report.passIssueSkipped++;
    } catch (e) {
        // Missing keyring or a transient DB error: send the confirmation without a pass link; the member can open it later.
        if (!(e instanceof PassError)) throw e;
        report.passIssueSkipped++;
    }
}

async function deliver(r: NotificationRecord, d: JobDelivery, report: NotificationJobReport) {
    await ensurePass(r, report);
    const passActive = r.notification_type === 'registration_confirmed' && await hasActivePass(r.registration_id);
    let envelope;
    try { envelope = selectEnvelope(r, d.from, d.baseUrl, passActive); }
    catch { report.skipped++; return; }
    const claim = await claimForJob(r.id, envelope.hash, d.provider.name);
    if (claim.code !== 'OK' || !claim.record?.claim_id) { report.skipped++; return; }
    report.claimed++;
    let result: ProviderResult;
    try { result = await d.provider.send({ ...envelope.content, to: envelope.to, from: d.from, idempotencyKey: claim.record.idempotency_key }); }
    catch { result = { ok: false, code: 'EMAIL_DELIVERY_FAILED', retryable: true }; }
    if (result.ok && !/^[A-Za-z0-9_-]{1,200}$/.test(result.messageId)) result = { ok: false, code: 'EMAIL_DELIVERY_FAILED', retryable: false };
    const outcome = await finishJobAttempt(r.id, claim.record.claim_id, result.ok, result.ok ? result.messageId : null, result.ok ? null : result.code, result.ok ? false : result.retryable === true);
    if (!outcome) { report.skipped++; return; }
    if (outcome.status === 'sent') {
        report.sent++;
        if (envelope.passReady) await mergePassAnnouncement(r.registration_id);
    } else if (outcome.retryable) report.retryScheduled++;
    else report.failed++;
}

/**
 * D2.6 worker body. Callers MUST authenticate first (app/api/jobs/notifications). Safe to run concurrently: every send
 * is preceded by a committed SKIP LOCKED claim, and the provider receives the intent's fixed idempotency key.
 * `delivery` is a server-only test seam; production always uses the configured Resend adapter.
 */
export async function runNotificationJob(delivery?: JobDelivery, now: () => number = Date.now): Promise<NotificationJobReport> {
    const policy = NOTIFICATION_JOB_POLICY, started = now();
    let d = delivery;
    if (!d) {
        try { const c = getTransactionalEmailConfig(); d = { provider: createResendProvider(c.apiKey, c.timeoutMs), from: c.from, baseUrl: c.baseUrl }; }
        catch { return empty('NOTIFICATION_PROVIDER_UNAVAILABLE'); }
    }
    const report = empty('NOTIFICATION_JOB_COMPLETED');
    const due = await listDueNotifications(policy.batchSize);
    report.scanned = due.length;
    // The confirmation for the same registration links the pass, so its separate announcement waits to be merged.
    const confirmed = new Set(due.filter(r => r.notification_type === 'registration_confirmed').map(r => r.registration_id));
    const queue = due.filter(r => !(r.notification_type === 'event_pass_available' && confirmed.has(r.registration_id)));
    report.deferred = due.length - queue.length;
    const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
            if (now() - started > policy.timeBudgetMs) { report.deferred++; continue; }
            try { await deliver(next, d!, report); }
            catch { report.skipped++; console.error(JSON.stringify({ scope: "notification-job", code: "DELIVERY_STEP_FAILED", notificationId: next.id })); }
        }
    };
    await Promise.all(Array.from({ length: Math.min(policy.concurrency, queue.length) }, worker));
    return report;
}

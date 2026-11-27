export const NOTIFICATION_TYPES = ['registration_confirmed', 'registration_waitlisted', 'registration_cancelled', 'event_pass_available'] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];
export type NotificationStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
export interface OperationalPayload {
    eventName: string;
    eventSlug: string | null;
    displayName: string | null;
    venue: string | null;
    instructions: string | null;
    startsAt: string;
    timezone: string;
    registrationId: string;
    registrationStatus: 'confirmed' | 'waitlisted' | 'cancelled';
}
export interface NotificationRecord {
    id: string;
    notification_type: NotificationType;
    recipient: string;
    account_id: string;
    event_id: string;
    registration_id: string;
    pass_id: string | null;
    template_key: NotificationType;
    template_version: number;
    payload: OperationalPayload;
    status: string;
    cancelled_at: string | null;
    idempotency_key: string;
    attempt_count: number;
    retryable: boolean;
    next_attempt_at: string | null;
    queued_at: string;
    sent_at: string | null;
    failed_at: string | null;
    version: number;
    claim_id: string | null;
    last_error_code: string | null;
    provider: string | null;
    provider_message_id: string | null;
    envelope_hash?: string | null;
    claimed_at?: string | null;
}
/** Delivery diagnostics, not an address book or email-body disclosure. */
export interface NotificationDto {
    id: string;
    type: NotificationType;
    channel: 'email';
    status: NotificationStatus;
    eventId: string;
    registrationId: string;
    passId: string | null;
    attemptCount: number;
    retryable: boolean;
    nextAttemptAt: string | null;
    queuedAt: string;
    sentAt: string | null;
    failedAt: string | null;
    version: number;
    errorCode: string | null;
    provider: string | null;
}
export interface NotificationFilters {
    type: NotificationType | null;
    status: NotificationStatus | null;
    limit: number;
    cursor: {
        at: string;
        id: string;
    } | null;
}

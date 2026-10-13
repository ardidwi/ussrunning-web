import 'server-only';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
export type NotificationCode = 'NOTIFICATION_NOT_FOUND' | 'NOTIFICATION_FORBIDDEN' | 'NOTIFICATION_INVALID_RECIPIENT' | 'NOTIFICATION_INVALID_TEMPLATE' | 'NOTIFICATION_PROVIDER_UNAVAILABLE' | 'NOTIFICATION_SEND_FAILED' | 'NOTIFICATION_ALREADY_SENT' | 'NOTIFICATION_CONFLICT' | 'NOTIFICATION_RATE_LIMITED' | 'NOTIFICATION_NOT_RETRYABLE' | 'NOTIFICATION_UNAVAILABLE';
export class NotificationError extends Error {
    constructor(public readonly code: NotificationCode) { super(code); }
}
export async function notificationOperation<T>(fn: () => Promise<T>): Promise<T> { try {
    return await fn();
}
catch (e) {
    if (e instanceof NotificationError || e instanceof AccountError)
        throw e;
    if (e instanceof AuthorizationError)
        throw new NotificationError('NOTIFICATION_FORBIDDEN');
    throw new NotificationError('NOTIFICATION_UNAVAILABLE');
} }

import 'server-only';
import type { EmailContent } from '@/lib/email/types';
import { NotificationError } from './notification-errors';
import { uuid, validatePayload, validateType } from './notification-validation';
const PASS_LINE = 'Your Event Pass is ready. Show it at check-in; it is separate from your member card.';
export const TEMPLATE_VERSION = 1;
const copy = { registration_confirmed: { subject: 'Your USS Running registration is confirmed', message: 'Your registration is confirmed.' }, registration_waitlisted: { subject: 'You are on the USS Running waitlist', message: 'Your registration is waitlisted. This is not a confirmed place or an event pass.' }, registration_cancelled: { subject: 'Your USS Running registration was cancelled', message: 'Your registration has been cancelled.' }, event_pass_available: { subject: 'Your USS Running Event Pass is available', message: 'Your Event Pass is available in your dashboard. Open it there to view its current status.' } } as const;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export interface RenderOptions {
    /** Registration's event id, taken from the trusted delivery row; the pass page needs it to resolve the registration. */
    eventId?: string;
    /** Confirmed email also links the automatically issued Event Pass (D4.1). Never contains the pass token. */
    passReady?: boolean;
}
export function dashboardLink(baseUrl: string, registrationId: string, eventId?: string) { let base: URL; try {
    base = new URL(baseUrl);
}
catch {
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE');
} const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname); if (base.username || base.password || base.pathname !== '/' || base.hash || base.search || (base.protocol !== 'https:' && !(base.protocol === 'http:' && local && process.env.NODE_ENV !== 'production')))
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE'); const link = new URL('/dashboard/registrations/' + registrationId, base.origin); if (eventId)
    link.searchParams.set('eventId', uuid(eventId)); return link.href; }
export function renderNotification(type: unknown, payload: unknown, baseUrl: string, version = 1, options: RenderOptions = {}): EmailContent { const key = validateType(type), p = validatePayload(payload); if (version !== TEMPLATE_VERSION || (key === 'event_pass_available' ? p.registrationStatus !== 'confirmed' : key !== 'registration_' + p.registrationStatus))
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE'); const spec = copy[key], url = dashboardLink(baseUrl, p.registrationId, options.eventId), pass = options.passReady === true && key === 'registration_confirmed', eventUrl = p.eventSlug ? new URL('/runs/' + encodeURIComponent(p.eventSlug), baseUrl).href : url; const details = [p.displayName ? 'For ' + p.displayName : null, p.venue, p.instructions].filter((v): v is string => Boolean(v)); const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: p.timezone }).format(new Date(p.startsAt)) + ' (' + p.timezone + ')'; return { subject: spec.subject, text: `USS Running\n\n${spec.message}\n${p.eventName}\n${date}\n${details.join('\n')}\nStatus: ${p.registrationStatus}\nEvent details: ${eventUrl}\n\n${pass ? `${PASS_LINE}\nOpen Event Pass: ${url}` : `View registration: ${url}`}\n\nThis operational message is not an authentication credential.`, html: `<!doctype html><html lang="en"><body><h1>USS Running</h1><p>${escape(spec.message)}</p><h2>${escape(p.eventName)}</h2><p>${escape(date)}</p>${details.map(v => '<p>' + escape(v) + '</p>').join('')}<p>Status: ${escape(p.registrationStatus)}</p><p><a href="${escape(eventUrl)}">Event details</a></p>${pass ? `<p>${escape(PASS_LINE)}</p><p><a href="${escape(url)}">Open Event Pass</a></p>` : `<p><a href="${escape(url)}">View registration</a></p>`}<p>This operational message is not an authentication credential.</p></body></html>` }; }

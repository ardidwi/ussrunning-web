import 'server-only';
import { SiteError } from './site-errors';
import { SITE_KEYS, SECTION_IDS } from './site-types';
import type { SiteKey, SlotPayloads } from './site-types';
export const SITE_POLICY = { maxBytes: 32768, maxText: 4000, maxReferences: 12, maxPage: 50, defaultPage: 20 } as const;
function fail(code: 'SITE_CONTENT_INVALID_PAYLOAD' | 'SITE_CONTENT_INVALID_URL' = 'SITE_CONTENT_INVALID_PAYLOAD'): never { throw new SiteError(code); }
export function object(v: unknown, keys: readonly string[]): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k)))
    fail(); return v as Record<string, unknown>; }
export function key(v: unknown): SiteKey { if (typeof v !== 'string' || !SITE_KEYS.includes(v as SiteKey))
    throw new SiteError('SITE_CONTENT_INVALID_KEY'); return v as SiteKey; }
export function text(v: unknown, max: number = SITE_POLICY.maxText): string { if (typeof v !== 'string' || v.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v) || !v.trim())
    fail(); return v.trim(); }
export function uuid(v: unknown): string { if (typeof v !== 'string' || !(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i).test(v))
    fail(); return v.toLowerCase(); }
export function version(v: unknown): number { if (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 2147483647)
    fail(); return Number(v); }
export function link(v: unknown, externalOnly = false): string { if (typeof v !== 'string' || !v || v.length > 2048 || /[\x00-\x20<>\\]/.test(v) || /%(?:0[0-9a-f]|1[0-9a-f]|2f|5c)/i.test(v))
    fail('SITE_CONTENT_INVALID_URL'); if (!externalOnly && v.startsWith('/') && !v.startsWith('//')) {
    const u = new URL(v, 'https://site.invalid');
    if (!(/^\/(?:$|runs(?:\/|$)|stories(?:\/|$)|about(?:$|[?#])|partners(?:$|[?#])|membership(?:$|[?#])|login(?:$|[?#])|join(?:$|[?#])|privacy(?:$|[?#])|terms(?:$|[?#]))/).test(u.pathname))
        fail('SITE_CONTENT_INVALID_URL');
    return v;
} try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password || !u.hostname)
        fail('SITE_CONTENT_INVALID_URL');
    return u.href;
}
catch {
    fail('SITE_CONTENT_INVALID_URL');
} }
const boolean = (v: unknown) => { if (typeof v !== 'boolean')
    fail(); return v; };
const number = (v: unknown) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100)
    fail(); return v; };
const media = (v: unknown) => v == null ? null : uuid(v);
const cta = (v: unknown) => { if (v == null)
    return null; const c = object(v, ['label', 'href']); return { label: text(c.label, 120), href: link(c.href) }; };
const ids = (v: unknown) => { if (!Array.isArray(v) || v.length > SITE_POLICY.maxReferences)
    fail(); const a = v.map(uuid); if (new Set(a).size !== a.length)
    fail(); return a; };
export function payload<K extends SiteKey>(k: K, value: unknown): SlotPayloads[K] {
    let encoded: string;
    try {
        encoded = JSON.stringify(value);
    }
    catch {
        fail();
    }
    if (!encoded! || Buffer.byteLength(encoded!) > SITE_POLICY.maxBytes)
        fail();
    let result: unknown;
    switch (k) {
        case 'homepage.hero': {
            const p = object(value, ['enabled', 'eyebrow', 'established', 'headline', 'description', 'cta', 'desktopMediaId', 'mobileMediaId', 'focus', 'overlay']);
            result = { enabled: boolean(p.enabled), eyebrow: text(p.eyebrow, 240), established: text(p.established, 120), headline: text(p.headline, 400), description: text(p.description), cta: cta(p.cta), desktopMediaId: media(p.desktopMediaId), mobileMediaId: media(p.mobileMediaId), focus: number(p.focus), overlay: number(p.overlay) };
            break;
        }
        case 'login.visual': {
            const p = object(value, ['enabled', 'kicker', 'headline', 'description', 'desktopMediaId', 'mobileMediaId', 'focus', 'overlay']);
            result = { enabled: boolean(p.enabled), kicker: text(p.kicker, 240), headline: text(p.headline, 400), description: text(p.description), desktopMediaId: media(p.desktopMediaId), mobileMediaId: media(p.mobileMediaId), focus: number(p.focus), overlay: number(p.overlay) };
            break;
        }
        case 'homepage.membership': {
            const p = object(value, ['enabled', 'kicker', 'headline', 'description', 'cta', 'imageMediaId']);
            result = { enabled: boolean(p.enabled), kicker: text(p.kicker, 240), headline: text(p.headline, 400), description: text(p.description), cta: cta(p.cta), imageMediaId: media(p.imageMediaId) };
            break;
        }
        case 'homepage.manifesto': {
            const p = object(value, ['enabled', 'label', 'paragraphs', 'footnote', 'cta']);
            if (!Array.isArray(p.paragraphs) || p.paragraphs.length < 1 || p.paragraphs.length > 12)
                fail();
            result = { enabled: boolean(p.enabled), label: text(p.label, 240), paragraphs: p.paragraphs.map(x => text(x, 1000)), footnote: text(p.footnote, 240), cta: cta(p.cta) };
            break;
        }
        case 'homepage.marquee': {
            const p = object(value, ['enabled', 'text']);
            result = { enabled: boolean(p.enabled), text: text(p.text, 240) };
            break;
        }
        case 'homepage.featured': {
            const p = object(value, ['enabled', 'storyIds', 'galleryIds', 'partnerIds', 'eventIds']);
            result = { enabled: boolean(p.enabled), storyIds: ids(p.storyIds), galleryIds: ids(p.galleryIds), partnerIds: ids(p.partnerIds), eventIds: ids(p.eventIds) };
            break;
        }
        case 'homepage.sections': {
            const p = object(value, ['order']);
            if (!Array.isArray(p.order) || p.order.length !== SECTION_IDS.length || new Set(p.order).size !== SECTION_IDS.length || p.order.some(v => !SECTION_IDS.includes(v as typeof SECTION_IDS[number])))
                fail();
            result = { order: p.order };
            break;
        }
        case 'auth.login': {
            const p = object(value, ['eyebrow', 'heading', 'description']);
            result = { eyebrow: text(p.eyebrow, 240), heading: text(p.heading, 400), description: text(p.description) };
            break;
        }
        case 'auth.register': {
            const p = object(value, ['enabled', 'eyebrow', 'headline', 'description', 'formKicker', 'formDescription', 'backgroundMediaId']);
            result = { enabled: boolean(p.enabled), eyebrow: text(p.eyebrow, 240), headline: text(p.headline, 400), description: text(p.description), formKicker: text(p.formKicker, 240), formDescription: text(p.formDescription), backgroundMediaId: media(p.backgroundMediaId) };
            break;
        }
        case 'footer.global': {
            const p = object(value, ['tagline', 'newsletterKicker', 'newsletterTitle', 'newsletterDescription', 'copyright', 'instagram', 'strava', 'contactEmail']);
            if (typeof p.contactEmail !== 'string' || p.contactEmail.length > 254 || !(/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/).test(p.contactEmail))
                fail();
            result = { tagline: text(p.tagline, 400), newsletterKicker: text(p.newsletterKicker, 240), newsletterTitle: text(p.newsletterTitle, 240), newsletterDescription: text(p.newsletterDescription), copyright: text(p.copyright, 400), instagram: link(p.instagram, true), strava: link(p.strava, true), contactEmail: p.contactEmail };
            break;
        }
        default: throw new SiteError('SITE_CONTENT_INVALID_KEY');
    }
    return result as SlotPayloads[K];
}

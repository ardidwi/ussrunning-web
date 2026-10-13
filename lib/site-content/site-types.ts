import type { MediaAsset } from '@/lib/media/media-types';
export const SECTION_IDS = ['next_runs', 'manifesto', 'stats', 'partners', 'membership', 'stories', 'gallery'] as const;
export type SectionId = typeof SECTION_IDS[number];
export type Cta = {
    label: string;
    href: string;
};
type Enabled = {
    enabled: boolean;
};
type Copy = Enabled & {
    headline: string;
    description: string;
};
export type SlotPayloads = {
    'homepage.hero': Copy & {
        eyebrow: string;
        established: string;
        cta: Cta | null;
        desktopMediaId: string | null;
        mobileMediaId: string | null;
        focus: number;
        overlay: number;
    };
    'homepage.membership': Copy & {
        kicker: string;
        cta: Cta | null;
        imageMediaId: string | null;
    };
    'homepage.manifesto': Enabled & {
        label: string;
        paragraphs: string[];
        footnote: string;
        cta: Cta | null;
    };
    'homepage.marquee': Enabled & {
        text: string;
    };
    'homepage.featured': Enabled & {
        storyIds: string[];
        galleryIds: string[];
        partnerIds: string[];
        eventIds: string[];
    };
    'homepage.sections': {
        order: SectionId[];
    };
    'login.visual': Copy & {
        kicker: string;
        desktopMediaId: string | null;
        mobileMediaId: string | null;
        focus: number;
        overlay: number;
    };
    'auth.login': {
        eyebrow: string;
        heading: string;
        description: string;
    };
    'auth.register': Copy & {
        eyebrow: string;
        formKicker: string;
        formDescription: string;
        backgroundMediaId: string | null;
    };
    'footer.global': {
        tagline: string;
        newsletterKicker: string;
        newsletterTitle: string;
        newsletterDescription: string;
        copyright: string;
        instagram: string;
        strava: string;
        contactEmail: string;
    };
};
export type SiteKey = keyof SlotPayloads;
export const SITE_KEYS = ['homepage.hero', 'homepage.membership', 'homepage.manifesto', 'homepage.marquee', 'homepage.featured', 'homepage.sections', 'login.visual', 'auth.login', 'auth.register', 'footer.global'] as const satisfies readonly SiteKey[];
export type Surface = 'homepage' | 'login' | 'register' | 'global';
export const SURFACE_KEYS: Readonly<Record<Surface, readonly SiteKey[]>> = { homepage: SITE_KEYS.filter(k => k.startsWith('homepage.')), login: ['login.visual', 'auth.login'], register: ['auth.register'], global: ['footer.global'] };
export type SiteStatus = 'draft' | 'published' | 'archived';
export type SiteRecord = {
    id: string;
    key: SiteKey;
    content: unknown;
    status: SiteStatus;
    version: number;
    publishedContent: unknown | null;
    publishedVersion: number | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
};
export type ManagedSlot<K extends SiteKey = SiteKey> = K extends SiteKey ? Omit<SiteRecord, 'key' | 'content' | 'publishedContent'> & {
    key: K;
    payload: SlotPayloads[K];
    publishedPayload: SlotPayloads[K] | null;
    hasUnpublishedChanges: boolean;
    media: MediaAsset[];
} : never;
export type PublicSlot<K extends SiteKey = SiteKey> = K extends SiteKey ? {
    key: K;
    payload: SlotPayloads[K] | null;
    media: MediaAsset[];
    source: 'published' | 'default' | 'empty';
    fallbackReason: null | 'missing' | 'invalid' | 'unavailable';
    publishedAt: string | null;
} : never;

import type { MediaAsset, MediaRecord } from '@/lib/media/media-types';
export type PartnerType = 'partner' | 'sponsor' | 'collaborator';
export type PartnerStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type Placement = 'event_page' | 'event_pass' | 'sponsor_section';
export type PartnerContent = {
    name: string;
    description: string | null;
    websiteUrl: string | null;
    logoMediaId: string | null;
    type: PartnerType;
    tier: string | null;
    visibility: 'public' | 'private';
    isGlobal: boolean;
    activeFrom: string | null;
    activeUntil: string | null;
};
export type PartnerRecord = PartnerContent & {
    id: string;
    slug: string;
    status: PartnerStatus;
    version: number;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    media: MediaRecord | null;
};
export type ManagedPartner = Omit<PartnerRecord, 'media'> & {
    logo: MediaAsset | null;
};
export type PublicPartner = {
    slug: string;
    name: string;
    description: string | null;
    websiteUrl: string | null;
    type: PartnerType;
    tier: string | null;
    sortOrder: number;
    logo: MediaAsset | null;
};
export type RelationContent = {
    tier: string | null;
    placement: Placement;
    activeFrom: string | null;
    activeUntil: string | null;
};
export type RelationRecord = RelationContent & {
    id: string;
    eventId: string;
    partnerId: string;
    status: 'active' | 'inactive';
    version: number;
    sortOrder: number;
    partner: PartnerRecord;
};
export type ManagedSponsorship = Omit<RelationRecord, 'partner'> & {
    partner: ManagedPartner;
};
export type PublicSponsorship = {
    tier: string | null;
    placement: Placement;
    sortOrder: number;
    partner: PublicPartner;
};
export type PartnerPage<T> = {
    items: T[];
    nextCursor: string | null;
};
export type PartnerFilter = {
    limit: number;
    status: PartnerStatus | null;
    type: PartnerType | null;
    cursor: {
        date?: string;
        order?: number;
        id: string;
    } | null;
    scope: string;
};

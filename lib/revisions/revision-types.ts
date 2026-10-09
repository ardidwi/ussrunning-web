import type { RevisionEntity } from "@/lib/history/policy";
export interface RevisionMetadata {
    id: string;
    entityId: string;
    version: number;
    action: string;
    occurredAt: string;
    actor: {
        accountId: string;
        displayName: string | null;
    } | null;
}
export interface RevisionListInput {
    entity: RevisionEntity;
    entityId: string;
    limit?: number;
    cursor?: string;
}
export interface RevisionDetailInput {
    entity: RevisionEntity;
    entityId: string;
    revisionId: string;
}
export interface RevisionPage {
    entity: RevisionEntity;
    items: RevisionMetadata[];
    nextCursor: string | null;
}
/** Deliberate safe partial snapshots. Rich body/config/URLs/PII never pass through generic history. */
export interface SnapshotMap {
    site_content: {
        headline?: string;
        description?: string;
        ctaLabel?: string;
    };
    story: {
        title?: string;
        slug?: string;
        excerpt?: string;
        status?: string;
        featured?: boolean;
        sponsored?: boolean;
    };
    partner: {
        name?: string;
        slug?: string;
        description?: string;
        visible?: boolean;
        featured?: boolean;
    };
    event: {
        title?: string;
        slug?: string;
        summary?: string;
        status?: string;
        startsAt?: string;
        endsAt?: string;
        timezone?: string;
        venueName?: string;
    };
}
export type RevisionDetail = {
    [E in RevisionEntity]: {
        entity: E;
        metadata: RevisionMetadata;
        snapshot: SnapshotMap[E];
        snapshotScope: "safe_preview";
    };
}[RevisionEntity];

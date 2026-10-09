export interface AuditFilters {
    limit?: number;
    cursor?: string;
    from?: string;
    until?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
}
export interface AuditDTO {
    id: string;
    actor: {
        accountId: string;
        displayName: string | null;
    } | null;
    action: string;
    entityType: string;
    entityId: string | null;
    revisionId: string | null;
    occurredAt: string;
    metadata: {
        changedFields: string[];
    };
}
export interface AuditPage {
    items: AuditDTO[];
    nextCursor: string | null;
    window: {
        from: string;
        until: string;
    };
}

import type { RegistrationStatus, EventStatus } from "@/lib/db/types";
export interface RegistrationDTO {
    id: string;
    event: {
        id: string;
        slug: string;
        title: string;
        startsAt: string;
        timezone: string;
        status: EventStatus;
    };
    version: string;
    status: RegistrationStatus;
    registeredAt: string;
    cancelledAt: string | null;
    updatedAt: string;
}
export interface ManagedRegistrationDTO extends RegistrationDTO {
    accountId: string;
}
export interface RegistrationPage<T> {
    items: T[];
    nextCursor: string | null;
}
export interface RegisterInput {
    eventId: string;
}
export interface CancelRegistrationInput {
    eventId: string;
    registrationId: string;
    expectedVersion: string;
}
export interface RegistrationFilters {
    limit: number;
    eventId: string | null;
    status: RegistrationStatus | null;
    cursor: {
        at: string;
        id: string;
    } | null;
}
/** Staff-only participant row (events.manage). Member barcode and event pass token are never included. */
export interface ParticipantDTO extends ManagedRegistrationDTO {
    participant: {
        displayName: string | null;
        memberId: string | null;
        email: string | null;
        checkedInAt: string | null;
        passStatus: 'active' | 'revoked' | 'expired' | null;
    };
}
export interface ParticipantExport {
    filename: string;
    csv: string;
    rowCount: number;
    truncated: boolean;
    maxRows: number;
}

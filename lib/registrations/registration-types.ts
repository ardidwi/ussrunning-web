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

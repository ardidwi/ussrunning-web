import type { AccountStatus } from '@/lib/db/types';
import type { SystemRole } from '@/lib/authz/permissions';
export const USER_POLICY = { defaultLimit: 20, maxLimit: 100, maxInputBytes: 4096, maxSearch: 100, maxDays: 366 } as const;
export type UserOperation = 'activate' | 'suspend' | 'deactivate';
export interface ManagedUserDTO {
    id: string;
    displayName: string | null;
    email: string;
    memberId: string;
    status: AccountStatus;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    roles: SystemRole[];
    createdAt: string;
    updatedAt: string;
    statusChangedAt: string | null;
    lastLoginAt: string | null;
    version: number;
    profile: {
        exists: boolean;
        fullName: string | null;
        city: string | null;
        marketingConsent: boolean;
        privacyConsentAt: string | null;
    };
}
export interface UserFilters {
    limit: number;
    status: AccountStatus | null;
    verified: boolean | null;
    role: SystemRole | null;
    search: string | null;
    memberId: string | null;
    createdFrom: string | null;
    createdTo: string | null;
    cursor: {
        at: string;
        id: string;
    } | null;
    fingerprint: string;
}
export interface UserRecord {
    id: string;
    display_name: string | null;
    email: string;
    member_id: string;
    status: AccountStatus;
    email_verified_at: string | null;
    roles: SystemRole[];
    created_at: string;
    updated_at: string;
    status_changed_at: string | null;
    last_login_at: string | null;
    version: number;
    profile_exists: boolean;
    full_name: string | null;
    city: string | null;
    marketing_consent: boolean;
    privacy_consent_at: string | null;
}

import type { RegistrationStatus } from "@/lib/db/types";
export const REGISTRATION_POLICY = { defaultLimit: 20, maxLimit: 50, maxInputBytes: 2048, maxCursorBytes: 512, lockTimeout: '15s' } as const;
export const REGISTRATION_STATES: readonly RegistrationStatus[] = ['pending', 'confirmed', 'waitlisted', 'cancelled', 'rejected'];
export const CANCELLABLE_STATES: readonly RegistrationStatus[] = ['pending', 'confirmed', 'waitlisted'];
// Only none/cancelled enters booking; pending/rejected need a future explicit approval/admin workflow.
export const CANCELLABLE_EVENT_STATES = ['published', 'registration_open', 'registration_closed', 'cancelled'] as const;

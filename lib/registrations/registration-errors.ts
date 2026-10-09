import "server-only";
import { AccountError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/authz/errors";
export type RegistrationCode = 'REGISTRATION_VALIDATION_ERROR' | 'REGISTRATION_NOT_AVAILABLE' | 'REGISTRATION_CLOSED' | 'REGISTRATION_NOT_FOUND' | 'REGISTRATION_NOT_CANCELLABLE' | 'REGISTRATION_PENDING' | 'REGISTRATION_REJECTED' | 'REGISTRATION_CONFIGURATION_UNSUPPORTED' | 'EVENT_CAPACITY_FULL' | 'REGISTRATION_CONFLICT' | 'REGISTRATION_UNAVAILABLE';
export class RegistrationError extends Error {
    constructor(public readonly code: RegistrationCode) { super(code); }
}
export async function registrationOperation<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    }
    catch (e) {
        if (e instanceof RegistrationError || e instanceof AccountError || e instanceof AuthorizationError)
            throw e;
        if (e && typeof e === 'object' && 'code' in e && e.code === '23505')
            throw new RegistrationError('REGISTRATION_CONFLICT');
        throw new RegistrationError('REGISTRATION_UNAVAILABLE');
    }
}

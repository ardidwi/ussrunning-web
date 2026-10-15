import 'server-only';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
export const USER_CODES = ['USER_NOT_FOUND', 'USER_FORBIDDEN', 'USER_CONFLICT', 'USER_INVALID_STATE', 'USER_PROTECTED', 'USER_SELF_ACTION_FORBIDDEN', 'USER_LAST_SUPER_ADMIN', 'USER_VERIFICATION_UNAVAILABLE', 'USER_SEARCH_INVALID', 'USER_INVALID_INPUT', 'USER_UNAVAILABLE'] as const;
export type UserCode = typeof USER_CODES[number];
export class UserError extends Error {
    constructor(public readonly code: UserCode) { super(code); }
}
export async function userOperation<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    }
    catch (e) {
        if (e instanceof UserError || e instanceof AccountError)
            throw e;
        if (e instanceof AuthorizationError)
            throw new UserError('USER_FORBIDDEN');
        throw new UserError('USER_UNAVAILABLE');
    }
}

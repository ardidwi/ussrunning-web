import "server-only";
import { AccountError } from "@/lib/auth/errors";
import type { AccountErrorCode } from "@/lib/auth/errors";
export type AuthorizationCode = AccountErrorCode | "INSUFFICIENT_PERMISSION" | "AUTHORIZATION_UNAVAILABLE";
export class AuthorizationError extends Error {
    constructor(public readonly code: AuthorizationCode) { super(code); }
}
export async function authorizationOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    }
    catch (error) {
        if (error instanceof AccountError || error instanceof AuthorizationError)
            throw error;
        throw new AuthorizationError("AUTHORIZATION_UNAVAILABLE");
    }
}

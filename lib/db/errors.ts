import "server-only";

export type DatabaseErrorCode = "DB_NOT_CONFIGURED" | "DB_UNAVAILABLE" | "DB_CONFLICT" | "DB_CONSTRAINT";

/** Deliberately excludes provider messages, SQL text, parameters and credential-bearing causes. */
export class DatabaseError extends Error {
  constructor(public readonly code: DatabaseErrorCode, message: string, public readonly sqlState?: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function normalizeDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "23505") return new DatabaseError("DB_CONFLICT", "A unique database value already exists.", code);
  if (["23503", "23514", "23502", "23001"].includes(code)) return new DatabaseError("DB_CONSTRAINT", "A database relationship or constraint was not satisfied.", code);
  return new DatabaseError("DB_UNAVAILABLE", "The database operation could not be completed.");
}

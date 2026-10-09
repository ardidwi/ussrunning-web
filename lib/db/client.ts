import "server-only";
import { neon } from "@neondatabase/serverless";
import { DatabaseError, normalizeDatabaseError } from "./errors";

let cached: ReturnType<typeof neon> | undefined;
let cachedUrl: string | undefined;

export function isDatabaseConfigured() {
  // Preserve legacy presence semantics: invalid whitespace config must not enable demo fallback.
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new DatabaseError("DB_NOT_CONFIGURED", "DATABASE_URL is missing. Configure a server-side PostgreSQL connection string.");
  try {
    const parsed = new URL(url);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new DatabaseError("DB_NOT_CONFIGURED", "DATABASE_URL must be a valid PostgreSQL connection string.");
  }
  if (!cached || cachedUrl !== url) {
    cached = neon(url);
    cachedUrl = url;
  }
  return cached;
}

/** SQL text must be developer-owned; all external values go in params. */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = getSql();
  return await sql.query(text, params) as T[];
}

/** Opt-in sanitized errors for new repositories. Legacy query preserves SQLSTATE/constraint handling. */
export async function querySafe<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  try { return await query<T>(text, params); }
  catch (error) { throw normalizeDatabaseError(error); }
}

// Compatibility entry point: one accessor serves legacy public.* and future uss.* repositories.
import "server-only";
export { getSql, query, querySafe, isDatabaseConfigured, DatabaseError, normalizeDatabaseError } from "./db/index";
export type * from "./db/types";

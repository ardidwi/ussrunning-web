import {
  HISTORY_POLICY,
  REVISION_ENTITIES,
  type RevisionEntity,
} from "@/lib/history/policy";
import type { AuditFilters } from "@/lib/audit/audit-types";
import type { RevisionListInput } from "@/lib/revisions/revision-types";
export type Query = Record<string, string | string[] | undefined>;
export function text(query: Query, key: string) {
  return typeof query[key] === "string" ? (query[key] as string) : "";
}
const date = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
export function auditQuery(
  query: Query,
):
  | { ok: true; filters: AuditFilters }
  | { ok: false; code: "HISTORY_VALIDATION_ERROR" } {
  try {
    const size = text(query, "limit"),
      limit = size ? Number(size) : HISTORY_POLICY.defaultLimit;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > HISTORY_POLICY.maxLimit
    )
      return { ok: false, code: "HISTORY_VALIDATION_ERROR" };
    const start = text(query, "fromDate"),
      end = text(query, "untilDate");
    if ((start && !date(start)) || (end && !date(end)))
      return { ok: false, code: "HISTORY_VALIDATION_ERROR" };
    if (Boolean(start) !== Boolean(end))
      return { ok: false, code: "HISTORY_VALIDATION_ERROR" };
    const from = start
        ? start + "T00:00:00.000Z"
        : text(query, "from") || undefined,
      until = end ? end + "T23:59:59.999Z" : text(query, "until") || undefined;
    if (
      from &&
      until &&
      (Date.parse(until) - Date.parse(from) < 0 ||
        Date.parse(until) - Date.parse(from) >
          HISTORY_POLICY.maxDays * 86400000)
    )
      return { ok: false, code: "HISTORY_VALIDATION_ERROR" };
    return {
      ok: true,
      filters: {
        limit,
        ...(from ? { from } : {}),
        ...(until ? { until } : {}),
        ...(text(query, "action") ? { action: text(query, "action") } : {}),
        ...(text(query, "entityType")
          ? { entityType: text(query, "entityType") }
          : {}),
        ...(text(query, "cursor") ? { cursor: text(query, "cursor") } : {}),
      },
    };
  } catch {
    return { ok: false, code: "HISTORY_VALIDATION_ERROR" };
  }
}
export function revisionQuery(query: Query): RevisionListInput | null {
  const entity = text(query, "entity"),
    entityId = text(query, "entityId"),
    size = text(query, "limit"),
    limit = size ? Number(size) : HISTORY_POLICY.defaultLimit;
  if (
    !REVISION_ENTITIES.includes(entity as RevisionEntity) ||
    !/^([0-9a-f]{8})-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(entityId) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > HISTORY_POLICY.maxLimit
  )
    return null;
  return {
    entity: entity as RevisionEntity,
    entityId,
    limit,
    ...(text(query, "cursor") ? { cursor: text(query, "cursor") } : {}),
  };
}
export function historyHref(
  module: "activity" | "revisions",
  fields: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams({ module });
  for (const [key, value] of Object.entries(fields))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return "/admin?" + params.toString();
}
export function historyTime(value: string) {
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value)) + " WIB"
    );
  } catch {
    return "Time unavailable";
  }
}
export const entityLabels = {
  site_content: "Website content",
  story: "Story",
  partner: "Partner",
  event: "Event",
} as const;

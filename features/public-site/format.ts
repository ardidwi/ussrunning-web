/** Public date label, e.g. "04 JUL 2024", rendered in USS's home timezone. */
export function publicDate(value: string | null | undefined, timeZone = "Asia/Jakarta"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .toUpperCase();
}

/**
 * Integers shown as labels. Years and identifiers must never get thousands
 * separators ("2024", not "2,024"); counts may.
 */
export function formatMetric(value: number, kind: "count" | "year"): string {
  return kind === "year" ? String(Math.trunc(value)) : value.toLocaleString("en-US");
}

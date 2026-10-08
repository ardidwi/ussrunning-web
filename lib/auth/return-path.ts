// Destination is navigation only; the destination's server still enforces access.
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return "/dashboard";
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/dashboard";
  }
  if (decoded.startsWith("//") || /[\\\x00-\x20]/.test(decoded))
    return "/dashboard";
  const url = new URL(value, "https://uss.invalid");
  if (
    url.origin !== "https://uss.invalid" ||
    /^(?:\/(?:login|join|api|design-system))(?:\/|$)/.test(
      decodeURIComponent(url.pathname),
    )
  )
    return "/dashboard";
  return url.pathname + url.search + url.hash;
}

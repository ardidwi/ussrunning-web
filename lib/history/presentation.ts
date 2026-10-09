/** Only approved public/editorial text fields may use this bounded escaped-data projection. */
export function safeText(value: unknown, maximum = 240): string | null {
    if (typeof value !== "string" || value.length > maximum || /[<>\u0000-\u001f\u007f]/.test(value))
        return null;
    // Defense in depth for misplaced operational secrets; never serialize arbitrary metadata.
    if (/(?:bearer\s|password|secret|token|api[_ -]?key|@[a-z0-9.-]+\.[a-z]{2,}|\b(?:sk_|re_)[a-z0-9]{8,})/i.test(value))
        return null;
    return value;
}
export function safeLabel(value: unknown): string { return typeof value === "string" && /^[a-z][a-z0-9_.]{0,79}$/.test(value) ? value : "unsupported"; }

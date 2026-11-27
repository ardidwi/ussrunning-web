/**
 * RFC 4180 CSV with spreadsheet formula-injection protection (OWASP "CSV Injection"): a cell starting with
 * = + - @ (or a tab/carriage return that some spreadsheets strip before evaluating) is prefixed with a single
 * quote so it is always read as text. Every cell is quoted; embedded quotes are doubled.
 */
export function csvCell(value: unknown): string {
    let text = value === null || value === undefined ? '' : String(value);
    text = text.replace(/\r\n?/g, '\n');
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}
export function csvRow(values: readonly unknown[]): string { return values.map(csvCell).join(','); }
export function csvDocument(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
    // CRLF line endings and a UTF-8 BOM keep names with non-ASCII characters intact in spreadsheet apps.
    return '﻿' + [csvRow(header), ...rows.map(csvRow)].join('\r\n') + '\r\n';
}

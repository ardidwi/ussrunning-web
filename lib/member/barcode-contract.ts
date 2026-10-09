/** Protocol v1 encodes the existing opaque DB identity verbatim. No new identity/wrapper. */
export const MEMBER_BARCODE_FORMAT_VERSION = 1 as const;
export function memberBarcode(value: string) {
  if (!/^USS-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/.test(value)) throw new Error("INVALID_MEMBER_BARCODE");
  return { value, formatVersion: MEMBER_BARCODE_FORMAT_VERSION };
}

import { memberBarcode } from "@/lib/member/barcode-contract";
// Existing qrcode dependency; this changes image presentation, never identity protocol.
export async function renderMemberBarcode(value: string): Promise<string> {
  memberBarcode(value);
  const QRCode = await import("qrcode");
  return QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 4,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

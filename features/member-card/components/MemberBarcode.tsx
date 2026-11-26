"use client";
import { BrandedQrCode } from "@/features/qr/BrandedQrCode";

export function MemberBarcode({ value }: { value: string }) {
  return (
    <div className="uss-card-code">
      <div className="uss-card-code-frame">
        <BrandedQrCode value={value} description="Permanent USS member barcode for staff identity checks." />
      </div>
    </div>
  );
}

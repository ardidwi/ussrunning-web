"use client";
import { useId, useState } from "react";
import { barcodeGeometry, barcodeSvg, validImage } from "@/lib/cms";
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  const id = useId();
  return (
    <div className="cms-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          className="resize-none"
          id={id}
          style={{ resize: "none" }}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="cms-image-field">
      <Field
        label={label + " · URL HTTPS"}
        value={value}
        onChange={(v) => {
          onChange(v);
          setError(
            validImage(v) ? "" : "Gunakan URL HTTPS atau upload gambar.",
          );
        }}
      />
      <label className="cms-upload">
        {busy ? "Membaca gambar…" : "Pilih foto dari perangkat"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 2 * 1024 * 1024 ||
              file.size === 0
            ) {
              setError("Pilih JPG, PNG, atau WebP maksimal 2 MB.");
              e.target.value = "";
              return;
            }
            setError("");
            setBusy(true);
            const reader = new FileReader();
            reader.onload = () => {
              onChange(String(reader.result));
              setBusy(false);
            };
            reader.onerror = () => {
              setError("Foto tidak terbaca. Pilih ulang.");
              setBusy(false);
            };
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
      </label>
      <small>
        JPG, PNG, WebP · maks. 2 MB · disimpan di browser untuk demo.
      </small>
      {error && <p role="alert">{error}</p>}
      {value && validImage(value) && (
        <img className="cms-image-preview" src={value} alt="Preview foto" />
      )}
    </div>
  );
}
export function Barcode({ value }: { value: string }) {
  const { bars, width } = barcodeGeometry(value);
  return (
    <svg
      className="cms-barcode"
      role="img"
      aria-label={"Barcode akun " + value}
      viewBox={`0 0 ${width} 100`}
    >
      <rect width={width} height={100} fill="white" />
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={10}
          width={b.width}
          height={80}
          fill="black"
        />
      ))}
    </svg>
  );
}
export function DownloadBarcode({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([barcodeSvg(value)], { type: "image/svg+xml" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = value + ".svg";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      Unduh barcode
    </button>
  );
}

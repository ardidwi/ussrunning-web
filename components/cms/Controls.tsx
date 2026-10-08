"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  Field as FormField,
  Input,
  Textarea,
  FieldError,
} from "@/components/ui";
import { validImage } from "@/lib/cms";

const fieldHints: Record<string, string> = {
  Judul: "Judul utama yang tampil di halaman dan kartu Story.",
  "Slug URL": "Alamat artikel. Gunakan huruf kecil dan tanda hubung.",
  Ringkasan: "Ringkasan singkat untuk kartu Story dan pratinjau sosial.",
  Kategori: "Kategori yang ditampilkan pada kartu dan artikel.",
  Penulis: "Nama penulis yang ditampilkan pada artikel.",
  "Isi artikel": "Isi lengkap yang dibaca pengunjung halaman Story.",
  Cover: "Visual utama untuk daftar Story dan header artikel.",
  "Nama event": "Nama publik untuk run atau event ini.",
  Tanggal:
    "Tanggal yang tampil pada kartu event. Gunakan format yang mudah dibaca.",
  Lokasi: "Lokasi pertemuan yang tampil pada event.",
  "Kuota contoh":
    "Jumlah peserta pada demo; kapasitas produksi ditentukan server.",
  "Nama tampilan": "Nama yang ditampilkan pada profil member.",
  "Nama Member baru": "Gunakan nama fiktif untuk akun demo.",
  Headline: "Judul utama yang terlihat pada hero halaman.",
  Deskripsi: "Teks pengantar yang terlihat di bawah headline.",
  "Footer note": "Catatan yang ditampilkan pada footer publik.",
  Caption: "Keterangan singkat untuk foto di galeri.",
  "Cari Stories": "Cari judul Story dalam daftar demo di perangkat ini.",
};
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <FormField
      label={label}
      hint={
        hint ??
        fieldHints[label] ??
        (label.includes("URL")
          ? "Gunakan URL HTTPS untuk visual ini; pratinjau disimpan di browser untuk demo."
          : "Nilai untuk pratinjau demo di browser ini.")
      }
      error={error}
      className="cms-field"
    >
      {multiline ? (
        <Textarea
          className="resize-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FormField>
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
      <FieldError>{error}</FieldError>
      {value && validImage(value) && (
        <img className="cms-image-preview" src={value} alt="Preview foto" />
      )}
    </div>
  );
}

async function qrDataUrl(value: string, width = 720) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "H",
    margin: 2,
    width,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
}

async function brandedQrPng(value: string) {
  const size = 1024;
  const qr = await loadImage(await qrDataUrl(value, size));
  const logo = await loadImage("/uss-logo.png");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(qr, 0, 0, size, size);

  // Keep the protected center compact. QR error correction is set to H.
  const outer = Math.round(size * 0.19);
  const inner = Math.round(size * 0.15);
  const outerX = Math.round((size - outer) / 2);
  const innerX = Math.round((size - inner) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(outerX, outerX, outer, outer);
  ctx.fillStyle = "#090909";
  ctx.fillRect(innerX, innerX, inner, inner);

  const maxLogoWidth = inner * 0.76;
  const maxLogoHeight = inner * 0.42;
  const ratio = Math.min(
    maxLogoWidth / logo.width,
    maxLogoHeight / logo.height,
  );
  const logoWidth = logo.width * ratio;
  const logoHeight = logo.height * ratio;
  ctx.drawImage(
    logo,
    (size - logoWidth) / 2,
    (size - logoHeight) / 2,
    logoWidth,
    logoHeight,
  );

  return canvas.toDataURL("image/png");
}

export function Barcode({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    qrDataUrl(value)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      className="uss-qr-pass"
      role="img"
      aria-label={"USS QR member ID " + value}
    >
      <div className="uss-qr-code">
        {src ? <img src={src} alt="" /> : <div className="uss-qr-loading" />}
        <span className="uss-qr-logo" aria-hidden="true">
          <img src="/uss-logo.png" alt="" />
        </span>
      </div>
      <div className="uss-qr-meta">
        <span>USS MEMBER QR</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function DownloadBarcode({ value }: { value: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true);
          const url = await brandedQrPng(value);
          const a = document.createElement("a");
          a.href = url;
          a.download = value + "-uss-qr.png";
          a.click();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Preparing QR…" : "Download QR"}
    </button>
  );
}

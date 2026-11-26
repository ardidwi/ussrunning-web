"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { MemberAvatar } from "@/features/member-card/components/MemberAvatar";
import { uploadOwnAvatar } from "@/lib/member/identity-actions";
import { AVATAR_EDGE, type IdentityResult } from "@/lib/member/identity-types";
import type { AvatarDTO } from "@/lib/member/profile-types";
import { compressCrop, drawCrop, initialCrop, type Crop } from "./avatar-image";

export function AvatarEditor({ photo, name, version, onSaved, upload = uploadOwnAvatar }: {
  photo: AvatarDTO | null; name: string; version: string;
  onSaved?: () => void; upload?: (form: FormData) => Promise<IdentityResult<unknown>>;
}) {
  const router = useRouter();
  const canvas = useRef<HTMLCanvasElement>(null);
  const lock = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState(initialCrop);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setImage(null);
    if (!file) return;
    if (file.size > 25_000_000) {
      setMessage("Choose a photo under 25 MB.");
      return;
    }
    const src = URL.createObjectURL(file);
    const selected = new Image();
    let active = true;
    selected.onload = () => {
      if (!active) return;
      if (Math.min(selected.naturalWidth, selected.naturalHeight) < 128 ||
          selected.naturalWidth * selected.naturalHeight > 48_000_000) {
        setMessage("Choose a photo at least 128 pixels wide and high, with a smaller total resolution.");
        return;
      }
      setImage(selected);
    };
    selected.onerror = () => {
      if (active) setMessage("This photo could not be opened. Try using your camera or choose a JPEG, PNG, or WebP photo.");
    };
    selected.src = src;
    return () => { active = false; URL.revokeObjectURL(src); };
  }, [file]);

  useEffect(() => {
    if (image && canvas.current) drawCrop(canvas.current, image, crop);
  }, [image, crop]);

  async function save() {
    if (!canvas.current || !image || lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    setSaved(false);
    try {
      const file = await compressCrop(canvas.current);
      const form = new FormData();
      form.set("photo", file);
      form.set("version", version);
      const result = await upload(form);
      if (!result.ok) {
        setMessage(result.code === "AVATAR_CONFLICT" ? "Your profile changed. Reload the page before saving your photo."
          : result.code === "IDENTITY_RATE_LIMITED" ? "Too many photo uploads. Try again in an hour."
          : result.code === "AVATAR_INVALID" ? "Choose a clear photo at least 128 pixels wide and high."
          : "Your photo could not be saved. Try again.");
        return;
      }
      setSaved(true);
      setFile(null);
      setMessage("Profile photo saved.");
      if (onSaved) onSaved();
      else router.refresh();
    } catch {
      setMessage("Your photo could not be saved. Try again.");
    } finally {
      setPending(false);
      lock.current = false;
    }
  }

  const range = (label: string, key: keyof Crop, min: number, max: number, step = 1) => (
    <label className="uss-avatar-range">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={crop[key]}
        disabled={pending} onChange={event => setCrop(previous => ({ ...previous, [key]: Number(event.target.value) }))} />
    </label>
  );
  return (
    <div className="uss-avatar-editor">
      {photo && !image && <MemberAvatar avatar={photo} displayName={name} />}
      <div className="uss-avatar-inputs">
        {["Choose a profile photo", "Take a photo"].map((label, index) => (
          <label key={label}>{label}
            <input className="uss-control" type="file" accept="image/*" capture={index ? "user" : undefined}
              disabled={pending} onClick={event => { event.currentTarget.value = ""; }}
              onChange={event => {
                const next = event.currentTarget.files?.[0];
                if (next) {
                  setCrop(initialCrop);
                  setFile(next);
                  setMessage("");
                  setSaved(false);
                }
              }} />
          </label>
        ))}
      </div>
      {file && !image && !message && <p role="status">Opening photo…</p>}
      {image && (
        <div className="uss-avatar-crop">
          <canvas ref={canvas} width={AVATAR_EDGE} height={AVATAR_EDGE} role="img" aria-label="Square profile photo preview" />
          <div>
            {range("Zoom", "zoom", 1, 3, 0.05)}
            {range("Horizontal position", "x", 0, 100)}
            {range("Vertical position", "y", 0, 100)}
            <Button onClick={save} disabled={pending}>{pending ? "Saving photo…" : "Save photo"}</Button>
          </div>
        </div>
      )}
      {message && <p role={saved ? "status" : "alert"}>{message}</p>}
    </div>
  );
}

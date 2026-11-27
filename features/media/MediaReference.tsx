"use client";
import { ROLE_PERMISSIONS } from "@/lib/authz/permissions";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { CmsShell } from "@/features/cms/CmsShell";
import type { MediaLibraryItem, MediaUsage } from "@/lib/media/media-types";
import { MediaLibrary, type LibraryOperations } from "./components/MediaLibrary";
import { libraryQuery } from "./model";

const now = "2026-11-20T09:30:00.000Z";
const item = (n: number, o: Partial<MediaLibraryItem> = {}): MediaLibraryItem => ({ id: `44444444-4444-4444-8444-${String(n).padStart(12, "0")}`, url: "/uss-logo.png", deliveryAvailable: true, mimeType: "image/png", sizeBytes: 120000 + n, width: 1200, height: 800, altText: `Fictional crew photo ${n} crossing the city at dawn`, caption: null, status: "active", visibility: "public", version: 1, createdAt: now, updatedAt: now, usageCount: n % 3, ...o });
const items = [item(1), item(2, { visibility: "private", url: null, deliveryAvailable: false }), item(3), item(4, { mimeType: "image/webp" }), item(5), item(6)];
const usage: MediaUsage[] = [{ kind: "story", role: "cover", entityId: "22222222-2222-4222-8222-222222222222", label: "18 runners. One city.", status: "published" }, { kind: "gallery", role: "item", entityId: "33333333-3333-4333-8333-333333333333", label: "Night run gallery", status: "draft" }];
/** Development-only fictional media library; no storage, uploads or permission authority. */
export default function MediaReference({ scenario = "default" }: { scenario?: string }) {
  if (process.env.NODE_ENV !== "development") return null;
  const fail = scenario === "upload-fail";
  const ops: Partial<LibraryOperations> = {
    requestLibraryUpload: async () => { if (scenario === "rate-limited") return { ok: false as const, code: "MEDIA_RATE_LIMITED" as const }; return { ok: true as const, data: { uploadId: crypto.randomUUID(), uploadUrl: "memory://fixture", method: "PUT" as const, headers: {}, expiresAt: now, maxBytes: 10485760 } }; },
    putObject: async () => { await new Promise((r) => setTimeout(r, 300)); return true; },
    finalizeLibraryUpload: async (input: unknown) => fail ? { ok: false as const, code: "MEDIA_INVALID_CONTENT" as const } : { ok: true as const, data: { ...item(9), id: (input as { uploadId: string }).uploadId, altText: "Freshly uploaded fictional image" } },
    updateLibraryMedia: async (input: unknown) => { const v = input as { id: string; altText?: string; caption?: string; visibility?: "public" | "private" }; const base = items.find((x) => x.id === v.id)!; return { ok: true as const, data: { ...base, ...(v.altText ? { altText: v.altText } : {}), ...(v.caption !== undefined ? { caption: v.caption } : {}), ...(v.visibility ? { visibility: v.visibility } : {}), version: base.version + 1 } }; },
    archiveLibraryMedia: async (input: unknown) => { const v = input as { id: string }; if (scenario === "in-use") return { ok: false as const, code: "MEDIA_IN_USE" as const }; return { ok: true as const, data: { ...items.find((x) => x.id === v.id)!, status: "archived" as const } }; },
    getLibraryMediaUsage: async (input: unknown) => ({ ok: true as const, data: (input as { id: string }).id.endsWith("1") ? usage : [] }),
  };
  const page = scenario === "empty" ? { items: [], nextCursor: null } : { items, nextCursor: scenario === "pagination" ? "fixture-cursor" : null };
  return <PermissionsProvider snapshot={{ roles: ["admin"], permissions: ROLE_PERMISSIONS.admin, displayName: "Fictional CMS reviewer" }}><CmsShell module="media" displayName="Fictional CMS reviewer">
    <p className="uss-reference-disclosure">Development-only fictional media. No storage, uploads or permission authority.</p>
    <MediaLibrary page={scenario === "error" ? null : page} query={libraryQuery({})} error={scenario === "error" ? "The media library is temporarily unavailable." : null} operations={ops} />
  </CmsShell></PermissionsProvider>;
}

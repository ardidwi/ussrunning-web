"use client";
import { useRef, useState } from "react";
import { ROLE_PERMISSIONS } from "@/lib/authz/permissions";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { CmsShell } from "@/features/cms/CmsShell";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import type { ManagedGallery, GalleryItem } from "@/lib/gallery/gallery-types";
import type { MediaAsset } from "@/lib/media/media-types";
import { GalleryEditor } from "./GalleryEditor";
import { GalleryList } from "./GalleryWorkspace";

const id = "66666666-6666-4666-8666-666666666666", now = "2026-10-13T09:30:00.000Z";
const media: MediaAsset = { id: "77777777-7777-4777-8777-777777777777", url: "/uss-logo.png", deliveryAvailable: true, mimeType: "image/png", sizeBytes: 12345, width: 800, height: 600, altText: "Fictional crew image", caption: null, status: "active", visibility: "public", version: 1, createdAt: now, updatedAt: now };
const unavailable = { ...media, id: "88888888-8888-4888-8888-888888888888", url: null, deliveryAvailable: false, altText: "Fictional image without delivery" };
const base: ManagedGallery = { id, slug: "fictional-city-gallery", status: "draft", version: 2, title: "THE CITY IN MOTION.", description: "Fictional USS Running images for development review.", visibility: "public", eventId: null, coverMediaId: media.id, cover: media, createdAt: now, updatedAt: now, publishedAt: null };
const initialItems: GalleryItem[] = [
  { id: "99999999-9999-4999-8999-999999999999", caption: "Before the city wakes", altTextOverride: null, sortOrder: 0, media },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", caption: null, altTextOverride: "The crew at the finish", sortOrder: 1, media: unavailable },
];
/** Development-only fictional Gallery; no trusted session, database mutation or persistent media. */
export default function GalleryReference({ scenario = "draft", view = "edit" }: { scenario?: string; view?: string }) {
  if (process.env.NODE_ENV !== "development") return null;
  const [gallery, setGallery] = useState<ManagedGallery>(() => ({ ...base, status: scenario === "published" ? "published" : scenario === "archived" ? "archived" : "draft", cover: scenario === "no-cover" ? null : scenario === "media-unavailable" ? unavailable : media, coverMediaId: scenario === "no-cover" ? null : scenario === "media-unavailable" ? unavailable.id : media.id, publishedAt: scenario === "published" ? now : null }));
  const [items, setItems] = useState<GalleryItem[]>(scenario === "empty" ? [] : initialItems);
  const itemsRef = useRef(items);
  const [requests, setRequests] = useState(0);
  const snapshot = { roles: ["admin" as const], permissions: ROLE_PERMISSIONS.admin, displayName: "Fictional Gallery editor" };
  const ok = (data: ManagedGallery) => ({ ok: true as const, data });
  const changed = (patch: Partial<ManagedGallery>) => { const next = { ...gallery, ...patch, version: gallery.version + 1, updatedAt: now }; setGallery(next); return ok(next); };
  const operations = {
    createEditorGallery: async (input: unknown) => { setRequests((n) => n + 1); if (scenario === "slow-create") await new Promise((resolve) => setTimeout(resolve, 800)); return ok({ ...gallery, ...(input as Partial<ManagedGallery>), status: "draft", version: 1 }); },
    updateEditorGallery: async (input: unknown) => scenario === "conflict" ? { ok: false as const, code: "GALLERY_CONFLICT" as const } : changed((input as { changes: Partial<ManagedGallery> }).changes),
    readEditorGallery: async () => ok(gallery),
    publishEditorGallery: async () => scenario === "invalid-transition" ? { ok: false as const, code: "GALLERY_NOT_PUBLISHABLE" as const } : changed({ status: "published", publishedAt: now }),
    unpublishEditorGallery: async () => changed({ status: "draft", publishedAt: null }),
    archiveEditorGallery: async () => changed({ status: "archived" }),
    addEditorGalleryItem: async (input: unknown) => { const next = changed({}); itemsRef.current = [...itemsRef.current, { ...initialItems[1], id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", sortOrder: itemsRef.current.length, media: (input as { mediaAssetId: string }).mediaAssetId === unavailable.id ? unavailable : media }]; setItems(itemsRef.current); return next; },
    updateEditorGalleryItem: async (input: unknown) => { const value = input as { itemId: string; caption: string | null; altTextOverride: string | null }; itemsRef.current = itemsRef.current.map((item) => item.id === value.itemId ? { ...item, caption: value.caption, altTextOverride: value.altTextOverride } : item); setItems(itemsRef.current); return changed({}); },
    removeEditorGalleryItem: async (input: unknown) => { itemsRef.current = itemsRef.current.filter((item) => item.id !== (input as { itemId: string }).itemId); setItems(itemsRef.current); return changed({}); },
    reorderEditorGalleryItems: async (input: unknown) => scenario === "order-conflict" ? { ok: false as const, code: "GALLERY_ORDER_CONFLICT" as const } : changed({}),
    readEditorGalleryItems: async (input: unknown) => ({ ok: true as const, data: { items: (input as { cursor?: string }).cursor ? [] : itemsRef.current, nextCursor: scenario === "partial-items" && !(input as { cursor?: string }).cursor ? "fictional-cursor" : null } }),
    readEditorGalleryRevisions: async () => ({ ok: true as const, data: { items: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", version: gallery.version, action: "gallery.update", createdAt: now }], nextBeforeVersion: null } }),
    readGalleryEventOptions: async () => ({ ok: true as const, data: { items: [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", title: "Fictional morning run", status: "published" as const }], nextCursor: null } }),
    listPickerMedia: async (cursor?: string) => ({ ok: true as const, data: { items: cursor ? [unavailable] : [media, unavailable], nextCursor: cursor ? null : "fictional-cursor" } }),
  };
  return <PermissionsProvider snapshot={snapshot}><CmsShell module="gallery" displayName={snapshot.displayName}><p className="uss-reference-disclosure">Development-only fictional Gallery. No backend identity, persistent media or publication authority.</p><span className="uss-reference-disclosure" data-testid="gallery-request-count">Fictional create requests: {requests}</span>{scenario === "forbidden" ? <ServiceFeedback code="INSUFFICIENT_PERMISSION" /> : scenario === "unavailable" ? <ServiceFeedback code="GALLERY_UNAVAILABLE" /> : view === "list" ? <GalleryList items={scenario === "empty" ? [] : [gallery]} nextCursor={scenario === "pagination" ? "fictional-cursor" : null} status="" /> : <GalleryEditor key={scenario + view} initial={view === "create" ? null : gallery} initialItems={view === "create" ? [] : items} initialItemCursor={scenario === "partial-items" ? "fictional-cursor" : null} initialRevisions={[{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", version: 2, action: "gallery.update", createdAt: now }]} initialRevisionError={scenario === "history-unavailable" ? "GALLERY_UNAVAILABLE" : null} eventOptions={scenario === "events-unavailable" ? null : { items: [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", title: "Fictional morning run", status: "published" }], nextCursor: null }} eventOptionsError={scenario === "events-unavailable" ? "EVENT_UNAVAILABLE" : null} startPreview={view === "preview"} operations={operations} />}</CmsShell></PermissionsProvider>;
}

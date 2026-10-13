import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { Query } from "@/features/history/query";
import { text } from "@/features/history/query";
import { getManagedGallery, listManagedGalleries, listManagedGalleryItems, listGalleryRevisions } from "@/lib/gallery/gallery-actions";
import type { ManagedGallery } from "@/lib/gallery/gallery-types";
import { readGalleryEventOptions } from "./api/actions";
import { GalleryEditor } from "./GalleryEditor";
import { GALLERY_PAGE_SIZE, GALLERY_STATUSES, galleryHref, galleryMessage, galleryTime, type GalleryStatusFilter } from "./model";

function Failure({ code }: { code: string }) {
  return <div className="uss-member-panel uss-gallery-failure" role="alert"><h2>GALLERIES UNAVAILABLE.</h2><p>{galleryMessage(code)}</p><LinkButton href={galleryHref()} variant="secondary">Back to Galleries</LinkButton></div>;
}
export function GalleryCover({ gallery }: { gallery: Pick<ManagedGallery, "cover" | "title"> }) {
  return gallery.cover?.deliveryAvailable && gallery.cover.url ? <img src={gallery.cover.url} alt={gallery.cover.altText || `Cover for ${gallery.title}`} /> : <div className="uss-gallery-cover-fallback">{gallery.cover ? "Cover delivery unavailable" : "No cover"}</div>;
}
export function GalleryList({ items, nextCursor, status }: { items: ManagedGallery[]; nextCursor: string | null; status: GalleryStatusFilter | "" }) {
  return <>
    <div className="uss-gallery-toolbar"><div><p className="uss-member-kicker">USS CMS / GALLERY</p><h1>GALLERIES.</h1><p>Arrange the images that carry a run's story. Work in draft, then publish deliberately.</p></div><LinkButton href={galleryHref({ view: "create" })}>Create Gallery ↗</LinkButton></div>
    <nav aria-label="Gallery status filters" className="uss-gallery-filters">{["", ...GALLERY_STATUSES].map((item) => <LinkButton key={item || "all"} href={galleryHref(item ? { status: item } : {})} variant={item === status ? "primary" : "secondary"} aria-current={item === status ? "page" : undefined}>{item || "All"}</LinkButton>)}</nav>
    {items.length ? <ul className="uss-gallery-list">{items.map((gallery) => <li key={gallery.id}><article className="uss-gallery-row"><div className="uss-gallery-thumb"><GalleryCover gallery={gallery} /></div><div className="uss-gallery-row-copy"><div className="uss-gallery-meta"><Badge tone={gallery.status === "published" ? "success" : gallery.status === "archived" ? "error" : "info"}>{gallery.status}</Badge><span>{gallery.visibility}</span>{gallery.eventId && <span>Event linked</span>}</div><h2>{gallery.title}</h2><p className="uss-gallery-muted">/gallery/{gallery.slug} · Updated {galleryTime(gallery.updatedAt)}</p></div><LinkButton href={galleryHref({ view: "edit", id: gallery.id })} variant="secondary">Manage ↗</LinkButton></article></li>)}</ul> : <EmptyState title="No Galleries in this view." description="Create a draft or choose another status filter." action={<LinkButton href={galleryHref({ view: "create" })}>Create Gallery</LinkButton>} />}
    <div className="uss-gallery-pagination"><span>Showing up to {GALLERY_PAGE_SIZE} Galleries per page.</span>{nextCursor && <LinkButton href={galleryHref({ ...(status ? { status } : {}), cursor: nextCursor })} variant="secondary">Next page ↗</LinkButton>}</div>
  </>;
}
export async function GalleryWorkspace({ query }: { query: Query }) {
  const view = text(query, "view");
  if (view === "create") {
    const events = await readGalleryEventOptions();
    return <GalleryEditor initial={null} initialItems={[]} initialItemCursor={null} initialRevisions={[]} initialRevisionError={null} eventOptions={events.ok ? events.data : null} eventOptionsError={events.ok ? null : events.code} />;
  }
  if (view === "edit" || view === "preview") {
    const id = text(query, "id");
    if (!/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return <Failure code="GALLERY_NOT_FOUND" />;
    const [gallery, items, revisions, events] = await Promise.all([getManagedGallery({ id }), listManagedGalleryItems({ id, limit: 100 }), listGalleryRevisions({ id, limit: 10 }), readGalleryEventOptions()]);
    if (!gallery.ok) return <Failure code={gallery.code} />;
    if (!items.ok) return <Failure code={items.code} />;
    return <GalleryEditor key={id} initial={gallery.data} initialItems={items.data.items} initialItemCursor={items.data.nextCursor} initialRevisions={revisions.ok ? revisions.data.items : []} initialRevisionError={revisions.ok ? null : revisions.code} eventOptions={events.ok ? events.data : null} eventOptionsError={events.ok ? null : events.code} startPreview={view === "preview"} />;
  }
  if (view) return <Failure code="GALLERY_INVALID_INPUT" />;
  const status = text(query, "status");
  if (status && !GALLERY_STATUSES.includes(status as GalleryStatusFilter)) return <Failure code="GALLERY_INVALID_INPUT" />;
  const cursor = text(query, "cursor");
  if (cursor.length > 1024) return <Failure code="GALLERY_INVALID_INPUT" />;
  const result = await listManagedGalleries({ limit: GALLERY_PAGE_SIZE, ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) });
  return result.ok ? <GalleryList items={result.data.items} nextCursor={result.data.nextCursor} status={status as GalleryStatusFilter | ""} /> : <Failure code={result.code} />;
}

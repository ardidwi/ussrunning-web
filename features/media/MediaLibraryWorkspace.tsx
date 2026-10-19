import { LinkButton } from "@/components/ui";
import { listPickerMedia } from "@/features/media/api/actions";
import { text, type Query } from "@/features/history/query";

export async function MediaLibraryWorkspace({ query }: { query: Query }) {
  const cursor = text(query, "cursor");
  if (cursor.length > 512) {
    return <section role="alert" className="uss-member-panel"><h2>Invalid page.</h2><LinkButton href="/admin?module=media" variant="secondary">Back to media</LinkButton></section>;
  }
  const result = await listPickerMedia(cursor || undefined);
  if (!result.ok) {
    return <section role="alert" className="uss-member-panel"><h2>Media library unavailable.</h2><p>Media metadata could not be loaded. Nothing was changed.</p><LinkButton href="/admin?module=media" variant="secondary">Retry</LinkButton></section>;
  }
  return <section className="uss-member-panel" aria-labelledby="media-library-heading">
    <header className="uss-member-intro">
      <p className="uss-member-kicker">USS CMS / MEDIA</p>
      <h1 id="media-library-heading">MEDIA LIBRARY.</h1>
      <p>Browse active media assets. Upload, metadata editing and deletion remain unavailable until persistent storage has passed operational verification.</p>
    </header>
    {result.data.items.length === 0 ? <p role="status">No active media assets found.</p> :
      <ul style={{listStyle:"none",padding:0,display:"grid",gap:"1rem",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,14rem),1fr))"}}>
        {result.data.items.map(asset => <li key={asset.id} className="uss-member-panel" style={{minWidth:0,overflowWrap:"anywhere"}}>
          {asset.visibility === "public" && asset.deliveryAvailable && asset.url ?
            <img src={asset.url} alt={asset.altText || "Uploaded image"} loading="lazy" style={{width:"100%",maxHeight:"13rem",objectFit:"contain"}} /> :
            <p role="status">Preview unavailable or private</p>}
          <strong>{asset.altText || "Untitled media"}</strong>
          <p>{asset.mimeType} · {asset.visibility} · {asset.status}</p>
          <p>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : "Dimensions unavailable"}</p>
        </li>)}
      </ul>}
    {result.data.nextCursor && <LinkButton href={`/admin?module=media&cursor=${encodeURIComponent(result.data.nextCursor)}`} variant="secondary">Next page ↗</LinkButton>}
    {cursor && <LinkButton href="/admin?module=media" variant="text">First page ↗</LinkButton>}
  </section>;
}

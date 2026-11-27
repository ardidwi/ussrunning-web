import { listLibraryMedia } from "./api/library-actions";
import { MediaLibrary } from "./components/MediaLibrary";
import { libraryQuery, mediaMessage, serviceFilters } from "./model";

/**
 * Admin slot for /admin?module=media. Receives the raw /admin search params, validates them itself and
 * relies on the media service for authorization (cms.content.manage); the nav gate is UX only.
 */
export async function MediaLibraryWorkspace({ query }: { query: Record<string, string | string[] | undefined> }) {
  const q = libraryQuery(query);
  const result = await listLibraryMedia(serviceFilters(q));
  // A stale cursor is a navigation problem, not an outage: show the first page instead.
  if (!result.ok && q.cursor && result.code === "MEDIA_VALIDATION_ERROR") {
    const first = await listLibraryMedia(serviceFilters({ ...q, cursor: "" }));
    return <MediaLibrary key="first" page={first.ok ? first.data : null} query={{ ...q, cursor: "" }} error={first.ok ? null : mediaMessage(first.code)} />;
  }
  return <MediaLibrary key={JSON.stringify(q)} page={result.ok ? result.data : null} query={q} error={result.ok ? null : mediaMessage(result.code)} />;
}
export default MediaLibraryWorkspace;

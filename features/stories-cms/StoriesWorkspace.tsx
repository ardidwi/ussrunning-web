import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { Query } from "@/features/history/query";
import { text } from "@/features/history/query";
import { getStoryReferenceData, getStoryTaxonomy, listManagedStories } from "@/lib/stories/story-actions";
import { TaxonomyManager } from "./TaxonomyManager";
import type { ManagedStory } from "@/lib/stories/story-types";
import { StoryEditor } from "./StoryEditor";
import { getEditorStory } from "./api/actions";
import { STORY_PAGE_SIZE, STORY_STATUSES, storyHref, storyMessage, storyTime, type StoryStatusFilter } from "./model";

function Failure({ code }: { code: string }) {
  return <div className="uss-member-panel uss-story-failure" role="alert"><h2>STORIES UNAVAILABLE.</h2><p>{storyMessage(code)}</p><LinkButton href={storyHref()} variant="secondary">Back to Stories</LinkButton></div>;
}
function Cover({ story }: { story: Pick<ManagedStory, "cover" | "title"> }) {
  return story.cover?.deliveryAvailable && story.cover.url ? <img src={story.cover.url} alt={story.cover.altText || `Cover for ${story.title}`} /> : <div className="uss-story-cover-fallback">{story.cover ? "Cover delivery unavailable" : "No cover"}</div>;
}
export function StoryList({ items, nextCursor, status }: { items: Omit<ManagedStory, "body" | "bodyMedia" | "authorAccountId">[]; nextCursor: string | null; status: StoryStatusFilter | "" }) {
  return <>
    <div className="uss-story-toolbar"><div><p className="uss-member-kicker">USS CMS / EDITORIAL</p><h1>STORIES.</h1><p>Shape the next chapter. Draft privately, then publish when ready.</p></div><div className="uss-story-actions"><LinkButton href={storyHref({ view: "taxonomy" })} variant="secondary">Categories &amp; tags</LinkButton><LinkButton href={storyHref({ view: "create" })}>Create Story ↗</LinkButton></div></div>
    <nav aria-label="Story status filters" className="uss-story-filters">
      {["", ...STORY_STATUSES].map((item) => <LinkButton key={item || "all"} href={storyHref(item ? { status: item } : {})} variant={item === status ? "primary" : "secondary"} aria-current={item === status ? "page" : undefined}>{item || "All"}</LinkButton>)}
    </nav>
    {items.length === 0 ? <EmptyState title="No Stories in this view." description="Create a draft or choose another status filter." action={<LinkButton href={storyHref({ view: "create" })}>Create Story</LinkButton>} /> : <ul className="uss-story-list">
      {items.map((story) => <li key={story.id}><article className="uss-story-row">
        <div className="uss-story-thumb"><Cover story={story} /></div>
        <div className="uss-story-row-copy"><div className="uss-story-row-meta"><Badge>{story.status}</Badge><span>{story.visibility}</span><span>{story.contentType}</span>{story.category && <span>{story.category.name}</span>}</div><h2>{story.title}</h2><p className="uss-story-slug">/stories/{story.slug}</p><p className="uss-story-row-date">{story.status === "scheduled" ? `Scheduled ${storyTime(story.publishAt)}` : story.status === "published" ? `Published ${storyTime(story.publishedAt)}` : `Updated ${storyTime(story.updatedAt)}`}</p></div>
        <LinkButton href={storyHref({ view: "edit", id: story.id })} variant="secondary">Manage ↗</LinkButton>
      </article></li>)}
    </ul>}
    <div className="uss-story-pagination"><p>Showing up to {STORY_PAGE_SIZE} Stories per page.</p>{nextCursor && <LinkButton href={storyHref({ ...(status ? { status } : {}), cursor: nextCursor })} variant="secondary">Next page ↗</LinkButton>}</div>
  </>;
}
export async function StoriesWorkspace({ query }: { query: Query }) {
  const view = text(query, "view");
  if (view === "taxonomy") {
    const lists = await getStoryTaxonomy();
    return lists.ok ? <TaxonomyManager initial={lists.data} /> : <Failure code={lists.code} />;
  }
  if (view === "create") {
    const refs = await getStoryReferenceData();
    return refs.ok ? <StoryEditor initial={null} references={refs.data} /> : <Failure code={refs.code} />;
  }
  if (view === "edit" || view === "preview") {
    const id = text(query, "id");
    if (!/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return <Failure code="STORY_NOT_FOUND" />;
    const [story, refs] = await Promise.all([getEditorStory({ id }), getStoryReferenceData()]);
    if (!story.ok) return <Failure code={story.code} />;
    if (!refs.ok) return <Failure code={refs.code} />;
    return <StoryEditor key={story.data.id} initial={story.data} references={refs.data} startPreview={view === "preview"} />;
  }
  if (view) return <Failure code="STORY_INVALID_INPUT" />;
  const status = text(query, "status");
  if (status && !STORY_STATUSES.includes(status as StoryStatusFilter)) return <Failure code="STORY_INVALID_INPUT" />;
  const cursor = text(query, "cursor");
  if (cursor.length > 1024) return <Failure code="STORY_INVALID_INPUT" />;
  const result = await listManagedStories({ limit: STORY_PAGE_SIZE, ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) });
  return result.ok ? <StoryList items={result.data.items} nextCursor={result.data.nextCursor} status={status as StoryStatusFilter | ""} /> : <Failure code={result.code} />;
}

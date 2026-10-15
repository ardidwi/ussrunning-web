export type StarterStory = {
  slug: string;
  contentType: string;
  title: string;
  excerpt: string;
  body: readonly string[];
};

// Presentation-only starter content. It is used only when the authoritative
// public Stories contract succeeds with zero published items. It must never
// mask a service failure and disappears automatically once CMS content exists.
export const STARTER_STORIES: readonly StarterStory[] = [
  {
    slug: "18-runners-day-one",
    contentType: "ORIGIN / 001",
    title: "18 RUNNERS. DAY ONE.",
    excerpt:
      "4 July 2024. Friends and family became the first starting line.",
    body: ["Friends and family became the first starting line."],
  },
] as const;

export function getStarterStoryBySlug(slug: string) {
  return STARTER_STORIES.find((story) => story.slug === slug) ?? null;
}

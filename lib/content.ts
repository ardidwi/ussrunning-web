import { query } from "@/lib/db";
import { runs as fallbackRuns, type Run } from "@/data/site";

export type CmsHero = {
  kicker?: string;
  eyebrow?: string;
  established?: string;
  headline: string;
  description: string;
  imageUrl: string;
  imageObjectKey?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type StoryItem = {
  slug: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  image: string;
};

const fallbackHomeHero: CmsHero = {
  eyebrow: "JAKARTA, INDONESIA",
  established: "EST. 2024",
  headline: "WE RUN. WE CONNECT. WE MOVE.",
  description:
    "Built in Jakarta. USS Running brings people together through movement, then keeps the story going through culture, friendship and shared experiences.",
  imageUrl:
    "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=2200&q=90",
  ctaLabel: "EXPLORE RUNS",
  ctaHref: "/runs",
};

const fallbackLoginHero: CmsHero = {
  kicker: "MY USS / COMMUNITY ACCESS",
  headline: "YOUR RUNS. YOUR PEOPLE. ONE ID.",
  description:
    "Sign in to keep your RSVPs, run passes and USS history in one place. Membership stays free.",
  imageUrl:
    "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1800&q=90",
};

function normalizeHero(value: unknown, fallback: CmsHero): CmsHero {
  if (!value || typeof value !== "object") return fallback;
  const data = value as Record<string, unknown>;

  return {
    kicker: typeof data.kicker === "string" ? data.kicker : fallback.kicker,
    eyebrow:
      typeof data.eyebrow === "string" ? data.eyebrow : fallback.eyebrow,
    established:
      typeof data.established === "string"
        ? data.established
        : fallback.established,
    headline:
      typeof data.headline === "string" ? data.headline : fallback.headline,
    description:
      typeof data.description === "string"
        ? data.description
        : fallback.description,
    imageUrl:
      typeof data.imageUrl === "string" ? data.imageUrl : fallback.imageUrl,
    imageObjectKey:
      typeof data.imageObjectKey === "string"
        ? data.imageObjectKey
        : fallback.imageObjectKey,
    ctaLabel:
      typeof data.ctaLabel === "string" ? data.ctaLabel : fallback.ctaLabel,
    ctaHref:
      typeof data.ctaHref === "string" ? data.ctaHref : fallback.ctaHref,
  };
}

export async function getCmsSection(pageSlug: string, sectionKey: string) {
  try {
    const rows = await query<{ content: unknown }>(
      `SELECT s.content
       FROM public.cms_sections s
       JOIN public.cms_pages p ON p.id = s.page_id
       WHERE p.slug = $1
         AND s.section_key = $2
         AND p.status = 'published'
         AND s.status = 'published'
       LIMIT 1`,
      [pageSlug, sectionKey]
    );

    return rows[0]?.content ?? null;
  } catch {
    return null;
  }
}

export async function getHomeHero(): Promise<CmsHero> {
  return normalizeHero(
    await getCmsSection("home", "hero"),
    fallbackHomeHero
  );
}

export async function getLoginHero(): Promise<CmsHero> {
  return normalizeHero(
    await getCmsSection("login", "hero"),
    fallbackLoginHero
  );
}

function formatRun(row: {
  slug: string;
  eyebrow: string | null;
  title: string;
  start_at: string | Date | null;
  location_name: string | null;
  distance_label: string | null;
  registration_status: string;
  image: string | null;
}): Run {
  const date = row.start_at ? new Date(row.start_at) : null;
  const dateText = date
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
        .format(date)
        .toUpperCase()
    : "TBA";
  const timeText = date
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
    : "TBA";

  const statusMap: Record<string, string> = {
    open: "RSVP OPEN",
    closed: "RSVP CLOSED",
    sold_out: "SOLD OUT",
    coming_soon: "COMING SOON",
    draft: "COMING SOON",
  };

  return {
    slug: row.slug,
    eyebrow: row.eyebrow || "USS RUN",
    title: row.title,
    date: dateText,
    time: timeText,
    location: row.location_name || "JAKARTA",
    distance: row.distance_label || "COMMUNITY RUN",
    status: statusMap[row.registration_status] || row.registration_status,
    image:
      row.image ||
      "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1600&q=85",
  };
}

export async function getRuns(): Promise<Run[]> {
  try {
    const rows = await query<{
      slug: string;
      eyebrow: string | null;
      title: string;
      start_at: string | Date | null;
      location_name: string | null;
      distance_label: string | null;
      registration_status: string;
      image: string | null;
    }>(
      `SELECT
         e.slug,
         e.eyebrow,
         e.title,
         e.start_at,
         e.location_name,
         e.distance_label,
         e.registration_status,
         m.public_url AS image
       FROM public.events e
       LEFT JOIN public.media_assets m ON m.id = e.cover_media_id
       WHERE e.published = true
       ORDER BY e.start_at NULLS LAST, e.created_at`
    );

    return rows.length ? rows.map(formatRun) : fallbackRuns;
  } catch {
    return fallbackRuns;
  }
}

export async function getRunBySlug(slug: string): Promise<Run | null> {
  const runs = await getRuns();
  return runs.find((run) => run.slug === slug) ?? null;
}

export async function getStories(): Promise<StoryItem[]> {
  try {
    const rows = await query<StoryItem>(
      `SELECT
         s.slug,
         COALESCE(s.eyebrow, 'USS JOURNAL') AS eyebrow,
         s.title,
         COALESCE(s.excerpt, '') AS excerpt,
         COALESCE(m.public_url, '') AS image
       FROM public.stories s
       LEFT JOIN public.media_assets m ON m.id = s.cover_media_id
       WHERE s.status = 'published'
       ORDER BY s.published_at, s.created_at`
    );

    if (rows.length) return rows;
  } catch {
    // fall through to presentation seed
  }

  return [
    {
      slug: "18-runners-day-one",
      eyebrow: "ORIGIN / 001",
      title: "18 RUNNERS. DAY ONE.",
      excerpt: "4 July 2024. Friends and family became the first starting line.",
      image:
        "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=85",
    },
  ];
}

export async function getPartners(): Promise<string[]> {
  try {
    const rows = await query<{ name: string }>(
      `SELECT name
       FROM public.partners
       WHERE active = true
       ORDER BY sort_order, name`
    );

    return rows.map((row) => row.name);
  } catch {
    return [];
  }
}


export type SiteSettings = {
  instagram: string;
  strava: string;
  contactEmail: string;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const fallback: SiteSettings = {
    instagram: "https://www.instagram.com/ussrunning?stkn=MTZyNnkybXhiN29wZQ==",
    strava: "https://strava.app.link/fC4mwJNBS6b",
    contactEmail: "hello@ussrunning.com",
  };

  try {
    const rows = await query<{ value: unknown }>(
      `SELECT value FROM public.site_settings WHERE key = 'socials' LIMIT 1`
    );
    const value = rows[0]?.value;
    if (!value || typeof value !== "object") return fallback;
    const data = value as Record<string, unknown>;

    return {
      instagram:
        typeof data.instagram === "string" && data.instagram
          ? data.instagram
          : fallback.instagram,
      strava:
        typeof data.strava === "string" && data.strava
          ? data.strava
          : fallback.strava,
      contactEmail:
        typeof data.contactEmail === "string" && data.contactEmail
          ? data.contactEmail
          : fallback.contactEmail,
    };
  } catch {
    return fallback;
  }
}


export type PublicMediaItem = {
  id: string;
  title: string;
  url: string;
  alt: string;
  caption: string;
};

export async function getMediaCollection(
  slug: string
): Promise<PublicMediaItem[]> {
  try {
    return await query<PublicMediaItem>(
      `SELECT
         m.id::text AS id,
         m.title,
         COALESCE(m.public_url,'') AS url,
         COALESCE(m.alt_text,'') AS alt,
         COALESCE(i.caption,m.alt_text,'') AS caption
       FROM public.media_collection_items i
       JOIN public.media_collections c ON c.id=i.collection_id
       JOIN public.media_assets m ON m.id=i.media_id
       WHERE c.slug=$1
         AND m.status='active'
         AND m.public_url IS NOT NULL
       ORDER BY i.sort_order,m.created_at`,
      [slug]
    );
  } catch {
    return [];
  }
}

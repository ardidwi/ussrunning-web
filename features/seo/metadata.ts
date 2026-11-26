import type { Metadata } from "next";

export const SITE_NAME = "USS Running";
export const SITE_TAGLINE = "Community in Motion";
export const DEFAULT_DESCRIPTION =
  "USS Running is a free running community in Jakarta. Community runs, stories, race-week moments and one USS ID for every member.";
/** Branded fallback share image served by app/brand/og/route.tsx. */
export const DEFAULT_OG_IMAGE = {
  url: "/brand/og",
  width: 1200,
  height: 630,
  alt: "USS Running — Community in Motion",
} as const;

/**
 * Canonical origin for absolute metadata URLs. APP_BASE_URL is the configured
 * production origin; Vercel system variables cover preview deployments.
 */
export function siteUrl(): URL {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ];
  for (const value of candidates) {
    if (!value) continue;
    try {
      return new URL(new URL(value).origin);
    } catch {
      // ignore malformed values and try the next candidate
    }
  }
  return new URL("http://localhost:3000");
}

export function clampDescription(value: string | null | undefined, max = 160) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export type PageMetadataInput = {
  /** Path of the canonical URL, e.g. "/stories". */
  path: string;
  /** Page title; null for the homepage (uses the site default). */
  title: string | null;
  description?: string | null;
  image?: { url: string; alt: string; width?: number | null; height?: number | null };
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
};

/** One consistent metadata shape for every public route. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const description = clampDescription(input.description) ?? DEFAULT_DESCRIPTION;
  const fullTitle = input.title ? `${input.title} — ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`;
  const image = input.image
    ? {
        url: input.image.url,
        alt: input.image.alt,
        ...(input.image.width ? { width: input.image.width } : {}),
        ...(input.image.height ? { height: input.image.height } : {}),
      }
    : DEFAULT_OG_IMAGE;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: input.path },
    openGraph: {
      type: input.type ?? "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: input.path,
      title: fullTitle,
      description,
      images: [image],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.url],
    },
    ...(input.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

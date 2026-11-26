import type { MetadataRoute } from "next";
import { siteUrl } from "@/features/seo/metadata";
import { collectPublicSitemapEntries } from "@/features/seo/sitemap";

/** Published content changes without deploys, so the sitemap is rendered on request. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return collectPublicSitemapEntries(siteUrl());
}

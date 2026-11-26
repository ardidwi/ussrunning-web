import type { MetadataRoute } from "next";
import { siteUrl } from "@/features/seo/metadata";

/** Member, admin, auth and API surfaces are private and never indexed. */
const PRIVATE_PATHS = [
  "/admin",
  "/dashboard",
  "/api/",
  "/login",
  "/design-system",
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] },
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.origin,
  };
}

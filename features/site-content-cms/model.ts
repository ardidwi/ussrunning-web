import type { SiteKey, SlotPayloads } from "@/lib/site-content/site-types";

export const SITE_CONTENT_LABELS: Record<SiteKey, { title: string; description: string }> = {
  "homepage.hero": { title: "Homepage hero", description: "Primary homepage headline, CTA and hero media." },
  "homepage.membership": { title: "Membership section", description: "Membership copy, CTA and supporting image." },
  "homepage.manifesto": { title: "Movement manifesto", description: "Mission copy and homepage manifesto CTA." },
  "homepage.marquee": { title: "Homepage marquee", description: "Moving community message below the hero." },
  "homepage.featured": { title: "Featured content", description: "Curated Stories, Gallery, Partners and Event IDs." },
  "homepage.sections": { title: "Homepage section order", description: "Exact homepage section ordering." },
  "login.visual": { title: "Login visual", description: "Editorial visual and copy shown beside the login form." },
  "auth.login": { title: "Login copy", description: "Presentation copy only; authentication policy remains server-owned." },
  "auth.register": { title: "Registration copy", description: "Presentation copy only; account lifecycle remains server-owned." },
  "footer.global": { title: "Global footer", description: "Footer, newsletter, social and contact presentation." },
};

export function clonePayload<K extends SiteKey>(payload: SlotPayloads[K]): SlotPayloads[K] {
  return JSON.parse(JSON.stringify(payload)) as SlotPayloads[K];
}

export function splitLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function joinLines(value: readonly string[]) {
  return value.join("\n");
}

export function siteContentMessage(code: string) {
  switch (code) {
    case "SITE_CONTENT_CONFLICT": return "This content changed elsewhere. Reload the slot before saving again.";
    case "SITE_CONTENT_INVALID_PAYLOAD": return "Some fields are incomplete or exceed the allowed format.";
    case "SITE_CONTENT_INVALID_URL": return "Use a valid HTTPS URL or an approved internal USS path.";
    case "SITE_CONTENT_FORBIDDEN":
    case "INSUFFICIENT_PERMISSION": return "Your account cannot manage website content.";
    case "SITE_CONTENT_NOT_FOUND": return "This content slot has not been created yet.";
    default: return "Website content is temporarily unavailable. Please try again.";
  }
}

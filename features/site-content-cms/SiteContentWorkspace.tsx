import { SITE_DEFAULTS } from "@/lib/site-content/site-defaults";
import { SITE_KEYS, type ManagedSlot, type SiteKey } from "@/lib/site-content/site-types";
import { listManagedSiteContent } from "@/lib/site-content/site-actions";
import { SiteContentEditor } from "./SiteContentEditor";
import { SITE_CONTENT_LABELS, siteContentMessage } from "./model";
import { LinkButton } from "@/components/ui";

export async function SiteContentWorkspace() {
  const result = await listManagedSiteContent({ limit: 50 });
  if (!result.ok) {
    return (
      <div className="uss-member-panel" role="alert">
        <h2>WEBSITE CONTENT UNAVAILABLE.</h2>
        <p>{siteContentMessage(result.code)}</p>
        <LinkButton href="/admin" variant="secondary">Back to overview ↗</LinkButton>
      </div>
    );
  }

  const byKey = new Map(result.data.items.map((slot) => [slot.key, slot]));
  const items = SITE_KEYS.map((key) => ({
    key,
    label: SITE_CONTENT_LABELS[key],
    slot: (byKey.get(key) ?? null) as ManagedSlot | null,
    fallback: SITE_DEFAULTS[key],
  }));

  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / WEBSITE</p>
        <h1>WEBSITE CONTENT.</h1>
        <p>
          Edit approved presentation content without changing authentication policy,
          runtime configuration, permissions, or other operational rules.
        </p>
      </header>
      <SiteContentEditor items={items} />
    </>
  );
}

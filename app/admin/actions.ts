"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export type AdminActionState = {
  ok?: string;
  error?: string;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function updateCmsHero(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const pageSlug = value(formData, "pageSlug") || "home";
  const headline = value(formData, "headline");
  const description = value(formData, "description");
  const imageUrl = value(formData, "imageUrl");
  const eyebrow = value(formData, "eyebrow");
  const established = value(formData, "established");
  const kicker = value(formData, "kicker");
  const ctaLabel = value(formData, "ctaLabel");
  const ctaHref = value(formData, "ctaHref");

  if (!headline || !description || !imageUrl) {
    return { error: "Headline, description and image URL are required." };
  }

  const rows = await query<{ id: string }>(
    `SELECT id::text FROM public.cms_pages WHERE slug = $1 LIMIT 1`,
    [pageSlug]
  );
  const pageId = rows[0]?.id;

  if (!pageId) return { error: "CMS page was not found." };

  const content = {
    headline,
    description,
    imageUrl,
    eyebrow: eyebrow || undefined,
    established: established || undefined,
    kicker: kicker || undefined,
    ctaLabel: ctaLabel || undefined,
    ctaHref: ctaHref || undefined,
  };

  await query(
    `INSERT INTO public.cms_sections(page_id, section_key, section_type, content, sort_order, status, updated_by)
     VALUES($1,'hero','hero',$2::jsonb,10,'published',$3)
     ON CONFLICT(page_id, section_key)
     DO UPDATE SET
       content=EXCLUDED.content,
       status='published',
       updated_by=EXCLUDED.updated_by,
       updated_at=now()`,
    [pageId, JSON.stringify(content), user.id]
  );

  await writeAudit(user.id, "Updated hero content", "cms_page", pageSlug, {
    pageSlug,
  });

  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/admin");

  return { ok: "Published. The website now reads this hero from the database." };
}

export async function createMediaAsset(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const title = value(formData, "title");
  const publicUrl = value(formData, "publicUrl");
  const altText = value(formData, "altText");
  const kind = value(formData, "kind") || "image";

  if (!title || !publicUrl) {
    return { error: "Media title and URL are required." };
  }

  const objectKey = `external/${Date.now()}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

  const rows = await query<{ id: string }>(
    `INSERT INTO public.media_assets(title, object_key, public_url, alt_text, kind, created_by)
     VALUES($1,$2,$3,$4,$5,$6)
     RETURNING id::text`,
    [title, objectKey, publicUrl, altText || null, kind, user.id]
  );

  await writeAudit(
    user.id,
    "Added media asset",
    "media_asset",
    rows[0]?.id,
    { title }
  );

  revalidatePath("/admin");
  return { ok: "Media added to the USS library." };
}

export async function saveEvent(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const id = value(formData, "id");
  const title = value(formData, "title");
  const startAt = value(formData, "startAt");
  const location = value(formData, "location");
  const distance = value(formData, "distance");
  const capacityRaw = value(formData, "capacity");
  const registrationStatus = value(formData, "registrationStatus");
  const published = formData.get("published") === "on";

  if (!id || !title) return { error: "Event and title are required." };

  const capacity =
    capacityRaw === "" ? null : Math.max(0, Math.floor(Number(capacityRaw)));

  await query(
    `UPDATE public.events
     SET title=$2,
         start_at=CASE WHEN $3 = '' THEN NULL ELSE $3::timestamptz END,
         location_name=$4,
         distance_label=$5,
         capacity=$6,
         registration_status=$7,
         published=$8,
         updated_at=now()
     WHERE id=$1::uuid`,
    [
      id,
      title,
      startAt,
      location || null,
      distance || null,
      capacity,
      registrationStatus || "draft",
      published,
    ]
  );

  await writeAudit(user.id, "Updated event", "event", id, { title });
  revalidatePath("/");
  revalidatePath("/runs");
  revalidatePath("/admin");

  return { ok: "Event updated." };
}

export async function setStoryStatus(
  formData: FormData
) {
  const user = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status");

  if (!id || !["draft", "published", "archived"].includes(status)) return;

  await query(
    `UPDATE public.stories
     SET status=$2,
         published_at=CASE
           WHEN $2='published' THEN COALESCE(published_at,now())
           ELSE published_at
         END,
         updated_at=now()
     WHERE id=$1::uuid`,
    [id, status]
  );

  await writeAudit(user.id, `Story status → ${status}`, "story", id);
  revalidatePath("/");
  revalidatePath("/stories");
  revalidatePath("/admin");
}

export async function setMemberRole(formData: FormData) {
  const user = await requireAdmin();
  if (user.role !== "super_admin") return;

  const id = value(formData, "id");
  const role = value(formData, "role");
  if (!id || !["member", "admin", "super_admin"].includes(role)) return;

  await query(
    `UPDATE neon_auth."user"
     SET role=$2, "updatedAt"=now()
     WHERE id=$1::uuid`,
    [id, role]
  );

  await writeAudit(user.id, `Changed role → ${role}`, "user", id);
  revalidatePath("/admin");
}

export async function updateSiteSettings(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const instagram = value(formData, "instagram");
  const strava = value(formData, "strava");
  const contactEmail = value(formData, "contactEmail");

  await query(
    `INSERT INTO public.site_settings(key,value,updated_by)
     VALUES('socials',$1::jsonb,$2)
     ON CONFLICT(key)
     DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=now()`,
    [JSON.stringify({ instagram, strava, contactEmail }), user.id]
  );

  await writeAudit(user.id, "Updated site settings", "site_settings", "socials");
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: "Site settings saved." };
}

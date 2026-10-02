import { query } from "@/lib/db";

export type AdminOverview = {
  members: number;
  publishedEvents: number;
  openRegistrations: number;
  publishedStories: number;
  mediaAssets: number;
};

export type AdminEvent = {
  id: string;
  slug: string;
  title: string;
  start_at: string | null;
  location_name: string | null;
  distance_label: string | null;
  capacity: number | null;
  registration_status: string;
  published: boolean;
};

export type AdminStory = {
  id: string;
  slug: string;
  eyebrow: string | null;
  title: string;
  excerpt: string | null;
  status: string;
  published_at: string | null;
};

export type AdminMedia = {
  id: string;
  title: string;
  object_key: string;
  public_url: string | null;
  alt_text: string | null;
  kind: string;
  status: string;
  created_at: string;
};

export type AdminMember = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  member_code: string | null;
  mobile: string | null;
  city: string | null;
  joined_at: string | null;
};

export type AdminActivity = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  actor_name: string | null;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [members, events, registrations, stories, media] = await Promise.all([
    query<{ count: number }>(`SELECT count(*)::int AS count FROM public.user_profiles`),
    query<{ count: number }>(`SELECT count(*)::int AS count FROM public.events WHERE published = true`),
    query<{ count: number }>(`SELECT count(*)::int AS count FROM public.event_registrations WHERE status IN ('registered','waitlist')`),
    query<{ count: number }>(`SELECT count(*)::int AS count FROM public.stories WHERE status = 'published'`),
    query<{ count: number }>(`SELECT count(*)::int AS count FROM public.media_assets WHERE status = 'active'`),
  ]);

  return {
    members: members[0]?.count ?? 0,
    publishedEvents: events[0]?.count ?? 0,
    openRegistrations: registrations[0]?.count ?? 0,
    publishedStories: stories[0]?.count ?? 0,
    mediaAssets: media[0]?.count ?? 0,
  };
}

export async function getAdminEvents() {
  return query<AdminEvent>(
    `SELECT id, slug, title, start_at, location_name, distance_label, capacity, registration_status, published
     FROM public.events
     ORDER BY start_at NULLS LAST, created_at DESC`
  );
}

export async function getAdminStories() {
  return query<AdminStory>(
    `SELECT id, slug, eyebrow, title, excerpt, status, published_at
     FROM public.stories
     ORDER BY published_at DESC NULLS LAST, created_at DESC`
  );
}

export async function getAdminMedia() {
  return query<AdminMedia>(
    `SELECT id, title, object_key, public_url, alt_text, kind, status, created_at
     FROM public.media_assets
     ORDER BY created_at DESC
     LIMIT 60`
  );
}

export async function getAdminMembers() {
  return query<AdminMember>(
    `SELECT
       u.id::text AS id,
       u.name,
       u.email,
       u.role,
       p.member_code,
       p.mobile,
       p.city,
       p.joined_at::text
     FROM neon_auth."user" u
     LEFT JOIN public.user_profiles p ON p.auth_user_id = u.id
     ORDER BY COALESCE(p.joined_at, u."createdAt") DESC
     LIMIT 200`
  );
}

export async function getAdminActivity() {
  return query<AdminActivity>(
    `SELECT
       a.id::text,
       a.action,
       a.entity_type,
       a.entity_id,
       a.created_at::text,
       u.name AS actor_name
     FROM public.admin_activity a
     LEFT JOIN neon_auth."user" u ON u.id = a.auth_user_id
     ORDER BY a.created_at DESC
     LIMIT 50`
  );
}


export async function getMediaCollectionIds(slug: string) {
  const rows = await query<{ id: string }>(
    `SELECT m.id::text AS id
     FROM public.media_collection_items i
     JOIN public.media_collections c ON c.id=i.collection_id
     JOIN public.media_assets m ON m.id=i.media_id
     WHERE c.slug=$1
     ORDER BY i.sort_order`,
    [slug]
  );
  return rows.map((row) => row.id);
}

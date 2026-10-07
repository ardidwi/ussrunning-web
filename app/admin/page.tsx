import AdminWorkspace from "@/components/admin/AdminWorkspace";
import {
  getAdminActivity,
  getAdminEvents,
  getAdminMedia,
  getAdminMembers,
  getMediaCollectionIds,
  getAdminOverview,
  getAdminStories,
} from "@/lib/admin";
import { getHomeHero, getLoginHero } from "@/lib/content";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdmin();

  const [
    overview,
    homeHero,
    loginHero,
    events,
    stories,
    media,
    members,
    activity,
    homeGalleryIds,
    settingsRows,
  ] = await Promise.all([
    getAdminOverview(),
    getHomeHero(),
    getLoginHero(),
    getAdminEvents(),
    getAdminStories(),
    getAdminMedia(),
    getAdminMembers(),
    getAdminActivity(),
    getMediaCollectionIds("home-gallery"),
    query<{ value: unknown }>(
      `SELECT value FROM public.site_settings WHERE key='socials' LIMIT 1`
    ),
  ]);

  const rawSettings = settingsRows[0]?.value;
  const settings =
    rawSettings && typeof rawSettings === "object"
      ? (rawSettings as {
          instagram?: string;
          strava?: string;
          contactEmail?: string;
        })
      : {};

  return (
    <AdminWorkspace
      user={{
        name: user.name,
        email: user.email,
        role: user.role === "super_admin" ? "super_admin" : "admin",
      }}
      overview={overview}
      homeHero={homeHero}
      loginHero={loginHero}
      events={events}
      stories={stories}
      media={media}
      members={members}
      activity={activity}
      homeGalleryIds={homeGalleryIds}
      settings={settings}
    />
  );
}

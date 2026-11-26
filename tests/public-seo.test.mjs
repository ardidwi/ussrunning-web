import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { loader } from "./frontend-loader.mjs";

const event = (overrides = {}) => ({
  id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
  slug: "night-run",
  eventType: "community-run",
  title: "NIGHT RUN",
  summary: null,
  description: null,
  startsAt: "2026-12-05T12:00:00.000Z",
  endsAt: null,
  timezone: "Asia/Jakarta",
  venueName: "GBK",
  locationText: null,
  mapUrl: null,
  registrationOpensAt: null,
  registrationClosesAt: null,
  capacity: null,
  waitlistEnabled: false,
  status: "registration_open",
  ...overrides,
});

test("years render without thousands separators while counts keep them", () => {
  const { formatMetric, publicDate } = loader()("features/public-site/format.ts");
  assert.equal(formatMetric(2024, "year"), "2024");
  assert.equal(formatMetric(12500, "count"), "12,500");
  assert.equal(publicDate("2024-07-04T00:30:00.000Z"), "04 JUL 2024");
  assert.equal(publicDate("not-a-date"), "");
});

test("upcoming events exclude past, completed and cancelled records", () => {
  const { isUpcomingEvent } = loader({ "@/lib/events/event-actions": {} })("features/public-events/server.ts");
  const now = new Date("2026-12-01T00:00:00.000Z");
  assert.equal(isUpcomingEvent(event(), now), true);
  assert.equal(isUpcomingEvent(event({ startsAt: "2026-11-01T00:00:00.000Z" }), now), false);
  assert.equal(
    isUpcomingEvent(event({ startsAt: "2026-11-30T20:00:00.000Z", endsAt: "2026-12-01T02:00:00.000Z" }), now),
    true,
    "an event still in progress is upcoming",
  );
  assert.equal(isUpcomingEvent(event({ status: "completed" }), now), false);
  assert.equal(isUpcomingEvent(event({ status: "cancelled" }), now), false);
});

test("home and login share one bounded BE-07 read and never invent events", async () => {
  const calls = [];
  const items = [
    event({ id: "a", startsAt: "2026-11-01T00:00:00.000Z" }),
    event({ id: "b" }),
    event({ id: "c", startsAt: "2026-12-12T00:00:00.000Z" }),
  ];
  const load = (result) =>
    loader({
      "@/lib/events/event-actions": {
        getPublicEventList: async (input) => {
          calls.push(input);
          return result;
        },
      },
    })("features/public-events/server.ts").loadUpcomingPublicEvents;
  const ok = await load({ ok: true, data: { items, nextCursor: null } })(1, new Date("2026-12-01T00:00:00Z"));
  assert.deepEqual(ok, { ok: true, items: [items[1]] });
  assert.deepEqual(calls[0], { limit: 50 });
  const failed = await load({ ok: false, code: "EVENT_UNAVAILABLE" })(2);
  assert.deepEqual(failed, { ok: false, code: "EVENT_UNAVAILABLE" });
});

test("event card labels come from the lifecycle state and the event timezone", () => {
  const { eventStatusLabel, eventCardDate } = loader()("features/public-events/presentation.ts");
  assert.equal(eventStatusLabel("registration_open"), "RSVP OPEN");
  assert.equal(eventStatusLabel("published"), "COMING SOON");
  const date = eventCardDate("2026-12-05T23:30:00.000Z", "Asia/Jakarta");
  assert.deepEqual(date, { day: "06", month: "DEC", full: "06 DEC 2026", time: "06:30" });
  assert.equal(eventCardDate("2026-12-05T23:30:00.000Z", "Not/AZone").day, "06");
  assert.equal(eventCardDate("bad", "Asia/Jakarta").full, "DATE TBA");
});

test("public media is rendered only when delivery is available", () => {
  const { deliverableUrl, firstDeliverable } = loader()("features/public-site/media.ts");
  const ready = { id: "1", url: "https://cdn.test/a.jpg", deliveryAvailable: true };
  const blocked = { id: "2", url: "https://private.test/key", deliveryAvailable: false };
  assert.equal(deliverableUrl(ready), ready.url);
  assert.equal(deliverableUrl(blocked), null);
  assert.equal(deliverableUrl(null), null);
  assert.equal(firstDeliverable([blocked, ready], "2"), ready);
  assert.equal(firstDeliverable([blocked], null), null);
});

test("page metadata is canonical, absolute-titled and has share images", () => {
  const previous = process.env.APP_BASE_URL;
  process.env.APP_BASE_URL = "https://uss.example/some/path";
  try {
    const { pageMetadata, siteUrl, clampDescription, DEFAULT_OG_IMAGE } = loader()("features/seo/metadata.ts");
    assert.equal(siteUrl().toString(), "https://uss.example/");
    const meta = pageMetadata({ path: "/stories/a", title: "A Story", type: "article", image: { url: "https://cdn.test/c.jpg", alt: "Cover" } });
    assert.deepEqual(meta.title, { absolute: "A Story — USS Running" });
    assert.equal(meta.alternates.canonical, "/stories/a");
    assert.equal(meta.openGraph.type, "article");
    assert.equal(meta.openGraph.images[0].url, "https://cdn.test/c.jpg");
    assert.equal(meta.twitter.card, "summary_large_image");
    const fallback = pageMetadata({ path: "/", title: null });
    assert.equal(fallback.title.absolute, "USS Running — Community in Motion");
    assert.equal(fallback.openGraph.images[0], DEFAULT_OG_IMAGE);
    assert.equal(pageMetadata({ path: "/login", title: "Log in", noIndex: true }).robots.index, false);
    assert.equal(clampDescription("x".repeat(200)).length, 160);
    process.env.APP_BASE_URL = "not a url";
    assert.match(siteUrl().toString(), /^(https:\/\/|http:\/\/localhost)/);
  } finally {
    if (previous === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previous;
  }
});

test("sitemap lists published content, is bounded and survives a failing collection", async () => {
  let storyReads = 0;
  const { collectPublicSitemapEntries, STATIC_PUBLIC_PATHS } = loader({
    "@/lib/stories/story-actions": {
      listPublicStories: async () => {
        storyReads += 1;
        return { ok: true, data: { items: [{ slug: "day one", publishedAt: "2024-07-04T00:00:00Z" }], nextCursor: "next" } };
      },
    },
    "@/lib/events/event-actions": {
      getPublicEventList: async () => ({ ok: false, code: "EVENT_UNAVAILABLE" }),
    },
    "@/lib/gallery/gallery-actions": {
      listPublicGalleries: async () => ({ ok: true, data: { items: [{ slug: "race-week", publishedAt: "2026-01-01T00:00:00Z" }], nextCursor: null } }),
    },
  })("features/seo/sitemap.ts");
  const entries = await collectPublicSitemapEntries(new URL("https://uss.example"));
  const urls = entries.map((entry) => entry.url);
  assert.equal(storyReads, 10, "pagination is capped");
  assert.ok(urls.includes("https://uss.example/stories/day%20one"));
  assert.ok(urls.includes("https://uss.example/gallery/race-week"));
  assert.ok(urls.includes("https://uss.example/gallery"));
  assert.equal(urls.some((url) => url.includes("/runs/")), false);
  for (const path of STATIC_PUBLIC_PATHS) assert.ok(!/^\/(admin|dashboard|login|api)/.test(path));
});

test("proxy sends visitors without a session to sign in and leaves sessions to server guards", async () => {
  const { NEON_AUTH_SESSION_COOKIE_NAME } = await import("@neondatabase/auth/server");
  const { NextRequest } = createRequire(import.meta.url)("next/server");
  const { proxy, config } = loader()("proxy.ts");
  const anonymous = proxy(new NextRequest("https://uss.example/dashboard/profile?tab=a"));
  assert.equal(anonymous.status, 307);
  const target = new URL(anonymous.headers.get("location"));
  assert.equal(target.pathname, "/login");
  assert.equal(target.searchParams.get("returnTo"), "/dashboard/profile?tab=a");
  assert.equal(target.searchParams.has("reason"), false, "never claims the session expired");
  const signedIn = proxy(
    new NextRequest("https://uss.example/admin", { headers: { cookie: `${NEON_AUTH_SESSION_COOKIE_NAME}=token` } }),
  );
  assert.equal(signedIn.headers.get("location"), null);
  assert.deepEqual(config.matcher, ["/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*"]);
});

function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test("legacy public code is retired and public pages carry no demo data", () => {
  for (const file of [
    "lib/content.ts",
    "data/site.ts",
    "lib/cms.ts",
    "lib/admin.ts",
    "lib/audit.ts",
    "app/admin/actions.ts",
    "components/admin/AdminWorkspace.tsx",
    "components/cms/Workspace.tsx",
    "components/cms/DemoProvider.tsx",
    "components/cms/PublicContent.tsx",
    "lib/stories/story-starter.ts",
  ])
    assert.equal(existsSync(file), false, `${file} must stay retired`);
  const appSources = [...sources("app"), ...sources("components"), ...sources("features")].map((file) => [
    file,
    readFileSync(file, "utf8"),
  ]);
  for (const [file, text] of appSources) {
    assert.doesNotMatch(text, /@\/lib\/content|@\/data\/site|story-starter|DemoProvider|unsplash\.com/, file);
  }
  const home = readFileSync("app/page.tsx", "utf8");
  assert.doesNotMatch(home, /The CMS controls/);
  assert.match(home, /loadUpcomingPublicEvents/);
  assert.match(readFileSync("components/auth/AuthShell.tsx", "utf8"), /loadUpcomingPublicEvents/);
});

test("SEO routes exist and /events redirects to /runs", () => {
  for (const file of ["app/sitemap.ts", "app/robots.ts", "app/icon.tsx", "app/not-found.tsx", "app/brand/og/route.tsx", "app/gallery/page.tsx", "app/gallery/[slug]/page.tsx"])
    assert.equal(existsSync(file), true, file);
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /source: "\/events", destination: "\/runs", permanent: true/);
  assert.match(config, /source: "\/events\/:slug", destination: "\/runs\/:slug"/);
  for (const page of ["app/page.tsx", "app/stories/page.tsx", "app/stories/[slug]/page.tsx", "app/runs/page.tsx", "app/runs/[slug]/page.tsx", "app/gallery/page.tsx", "app/gallery/[slug]/page.tsx", "app/partners/page.tsx", "app/about/page.tsx"])
    assert.match(readFileSync(page, "utf8"), /pageMetadata\(/, page);
});

test("join, membership and privacy declare canonical page metadata", () => {
  for (const page of ["join", "membership", "privacy"]) {
    const code = readFileSync(`app/${page}/page.tsx`, "utf8");
    assert.match(code, /export const metadata: Metadata = pageMetadata\(\{/, page);
    assert.match(code, new RegExp(`path: "/${page}"`), page);
  }
});

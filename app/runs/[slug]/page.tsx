import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getPublicEventDetail } from "@/lib/events/event-actions";
import { loadRegistrationHistory } from "@/features/event-registration/api/server";
import { PublicEventDetail } from "@/features/event-registration/components/PublicEventDetail";
import { PublicUnavailable } from "@/features/public-site/PublicUnavailable";
import { JsonLd } from "@/features/seo/JsonLd";
import { pageMetadata, SITE_NAME, siteUrl } from "@/features/seo/metadata";
import { eventCardDate } from "@/features/public-events/presentation";

export const dynamic = "force-dynamic";

const readEvent = cache((slug: string) => getPublicEventDetail(slug));

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const path = `/runs/${encodeURIComponent(slug)}`;
  const result = await readEvent(slug);
  if (!result.ok) return pageMetadata({ path, title: "Run", noIndex: true });
  const event = result.data;
  const date = eventCardDate(event.startsAt, event.timezone);
  const place = event.venueName || event.locationText;
  return pageMetadata({
    path,
    title: event.title,
    description:
      event.summary ||
      [`${date.full} · ${date.time}`, place].filter(Boolean).join(" · ") ||
      undefined,
  });
}

const EVENT_STATUS_SCHEMA: Partial<Record<string, string>> = {
  cancelled: "https://schema.org/EventCancelled",
};

export default async function RunDetailPage({ params }: Params) {
  const { slug } = await params;
  const event = await readEvent(slug);

  if (!event.ok) {
    if (event.code === "EVENT_NOT_FOUND" || event.code === "EVENT_VALIDATION_ERROR") notFound();
    return (
      <main className="page-black">
        <SiteHeader />
        <PublicUnavailable
          kicker="USS RUNS"
          message="This run is temporarily unavailable. Please try again soon."
          backHref="/runs"
          backLabel="All runs"
        />
        <SiteFooter />
      </main>
    );
  }

  const place = event.data.venueName || event.data.locationText;
  return (
    <main className="page-black">
      <SiteHeader />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.data.title,
          description: event.data.summary ?? undefined,
          startDate: event.data.startsAt,
          endDate: event.data.endsAt ?? undefined,
          eventStatus: EVENT_STATUS_SCHEMA[event.data.status] ?? "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: place
            ? { "@type": "Place", name: place, address: event.data.locationText ?? place }
            : undefined,
          organizer: { "@type": "Organization", name: SITE_NAME, url: siteUrl().origin },
          url: new URL(`/runs/${encodeURIComponent(event.data.slug)}`, siteUrl()).toString(),
        }}
      />
      <PublicEventDetail
        event={event.data}
        registration={await loadRegistrationHistory(event.data.id)}
      />
      <SiteFooter />
    </main>
  );
}

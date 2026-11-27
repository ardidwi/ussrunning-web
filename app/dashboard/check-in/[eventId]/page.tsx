import { redirect } from "next/navigation";
import { checkInHref } from "@/features/check-in/model";

/** D2.10: legacy per-event scanner URL; the admin workspace re-validates the event and permission. */
export default async function LegacyScannerPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  redirect(checkInHref(eventId));
}

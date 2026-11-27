import { redirect } from "next/navigation";
import { checkInHref } from "@/features/check-in/model";

/** D2.10: the crew scanner lives in /admin; keep old links and bookmarks working. */
export default async function LegacyScannerEvents({ searchParams }: { searchParams: Promise<{ cursor?: string | string[] }> }) {
  const { cursor } = await searchParams;
  redirect(typeof cursor === "string" && cursor ? `${checkInHref()}&cursor=${encodeURIComponent(cursor)}` : checkInHref());
}

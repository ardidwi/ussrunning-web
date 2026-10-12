"use server";
import {
  getManagedEventDetail,
  getManagedEventList,
} from "@/lib/events/event-actions";
import { scanEventPass } from "@/lib/checkin/check-in-actions";
import type { ContextResult, ScannerResult } from "../model";
export async function readScannerContext(
  eventId: string,
): Promise<ContextResult> {
  const result = await getManagedEventDetail(eventId);
  if (!result.ok) return result;
  const { id, title, startsAt, endsAt, timezone, status } = result.data;
  return { ok: true, data: { id, title, startsAt, endsAt, timezone, status } };
}
export async function readScannerEvents(cursor: string | null = null) {
  const result = await getManagedEventList({ limit: 20, cursor });
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: {
      items: result.data.items.map(
        ({ id, title, startsAt, timezone, status }) => ({
          id,
          title,
          startsAt,
          timezone,
          status,
        }),
      ),
      nextCursor: result.data.nextCursor,
    },
  };
}
export async function submitCheckIn(
  eventId: string,
  value: string,
): Promise<ScannerResult> {
  return scanEventPass({ eventId, value });
}

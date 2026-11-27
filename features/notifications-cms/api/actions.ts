"use server";
import { revalidatePath } from "next/cache";
import { cancelManagedNotification, dispatchManagedNotification } from "@/lib/notifications/notification-actions";

/** Thin wrappers over the existing notification actions; authorization (events.manage) is enforced in the service. */
export async function resendNotification(input: { id: string; expectedVersion: number }) {
  const result = await dispatchManagedNotification({ id: input.id, expectedVersion: input.expectedVersion });
  revalidatePath("/admin");
  return result.ok ? { ok: true as const, code: result.data.code, status: result.data.notification.status } : result;
}

export async function cancelNotification(input: { id: string; expectedVersion: number }) {
  const result = await cancelManagedNotification({ id: input.id, expectedVersion: input.expectedVersion });
  if (result.ok) revalidatePath("/admin");
  return result.ok ? { ok: true as const, status: result.data.status } : result;
}

import "server-only";
import { cache } from "react";
import { getCurrentRegistrationHistory } from "@/lib/registrations/registration-actions";
export const loadRegistrationHistory = cache(async (eventId?: string) =>
  getCurrentRegistrationHistory({ limit: 20, ...(eventId ? { eventId } : {}) }),
);

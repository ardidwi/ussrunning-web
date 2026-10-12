import { readEventPass } from "@/features/event-pass/api/actions";
import { EventPassScreen } from "@/features/event-pass/components/EventPassScreen";
export const metadata = { title: "Event Pass — USS Running" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { id } = await params,
    { eventId = "" } = await searchParams;
  const reference = { eventId, registrationId: id };
  const initial = await readEventPass(reference);
  return (
    <EventPassScreen
      key={`${eventId}:${id}:${initial.ok ? initial.data.registration.version + (initial.data.pass.ok ? initial.data.pass.data.id : initial.data.pass.code) : initial.code}`}
      reference={reference}
      initial={initial}
    />
  );
}

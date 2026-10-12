import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import type { RegistrationDTO } from "@/lib/registrations/registration-types";
import { eventDate, registrationLabels } from "../model";
export function RegistrationList({
  items,
  actions,
}: {
  items: RegistrationDTO[];
  actions?: (item: RegistrationDTO) => React.ReactNode;
}) {
  if (!items.length)
    return (
      <EmptyState
        title="No registrations yet."
        description="Find a run and register with your USS account."
      />
    );
  return (
    <ul className="uss-registration-list">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <Link href={`/runs/${encodeURIComponent(item.event.slug)}`}>
              {item.event.title}
            </Link>
            <Badge
              tone={
                item.status === "confirmed"
                  ? "success"
                  : item.status === "waitlisted"
                    ? "warning"
                    : "info"
              }
            >
              {registrationLabels[item.status]}
            </Badge>
          </div>
          <dl>
            <div>
              <dt>Event</dt>
              <dd>
                <time dateTime={item.event.startsAt}>
                  {eventDate(item.event.startsAt, item.event.timezone)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Registered</dt>
              <dd>
                <time dateTime={item.registeredAt}>
                  {eventDate(item.registeredAt, item.event.timezone)}
                </time>
              </dd>
            </div>
            {item.cancelledAt && (
              <div>
                <dt>Cancelled</dt>
                <dd>
                  <time dateTime={item.cancelledAt}>
                    {eventDate(item.cancelledAt, item.event.timezone)}
                  </time>
                </dd>
              </div>
            )}
          </dl>
          {actions?.(item)}
        </li>
      ))}
    </ul>
  );
}

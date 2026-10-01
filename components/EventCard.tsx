import Link from "next/link";
import type { Run } from "@/data/site";

export default function EventCard({ run }: { run: Run }) {
  return (
    <Link href={"/runs/" + run.slug} className="event-card">
      <div className="event-image-wrap">
        <img src={run.image} alt="" className="event-image" />
        <div className="event-status">{run.status}</div>
      </div>
      <div className="event-card-topline">
        <span>{run.eyebrow}</span>
        <span>{run.date}</span>
      </div>
      <h3>{run.title}</h3>
      <div className="event-meta">
        <span>{run.time}</span>
        <span>{run.distance}</span>
        <span>{run.location}</span>
      </div>
    </Link>
  );
}

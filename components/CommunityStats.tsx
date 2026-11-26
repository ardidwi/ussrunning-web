import AnimatedCounter from "@/components/AnimatedCounter";

const metrics = [
  { value: 18, suffix: "", label: "RUNNERS / DAY ONE", kind: "count" },
  { value: 500, suffix: "+", label: "RUNNERS / DAY 365", kind: "count" },
  { value: 100, suffix: "+", label: "PEOPLE / CHEERING", kind: "count" },
  { value: 2024, suffix: "", label: "FIRST RUN / JULY", kind: "year" },
] as const;

export default function CommunityStats({ className = "" }: { className?: string }) {
  return (
    <section className={`stats-grid animated-stats ${className}`.trim()}>
      {metrics.map((metric) => (
        <div className="stat" key={metric.label}>
          <strong><AnimatedCounter value={metric.value} suffix={metric.suffix} kind={metric.kind} /></strong>
          <span>{metric.label}</span>
        </div>
      ))}
    </section>
  );
}

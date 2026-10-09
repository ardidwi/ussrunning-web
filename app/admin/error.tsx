"use client";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="uss-member-shell">
      <main className="uss-member-content">
        <ServiceFeedback
          code="HISTORY_UNAVAILABLE"
          returnTo="/admin"
          retry={reset}
        />
      </main>
    </div>
  );
}

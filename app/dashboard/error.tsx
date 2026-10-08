"use client";
import { Button, EmptyState } from "@/components/ui";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="uss-member-panel" role="alert">
      <h1>MY USS.</h1>
      <EmptyState
        title="We couldn't open MY USS."
        description="Please try again. Your saved details haven't been changed."
        action={
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}

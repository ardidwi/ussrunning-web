"use client";
import { Button, LinkButton } from "@/components/ui";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { passMessages } from "../model";
export function PassFeedback({
  code,
  retry,
  returnTo,
}: {
  code: string;
  retry?: () => void;
  returnTo?: string;
}) {
  const message = passMessages[code];
  if (!message)
    return <ServiceFeedback code={code} retry={retry} returnTo={returnTo} />;
  return (
    <div role="alert" className="uss-pass-feedback">
      <p>{message}</p>
      {[
        "REGISTRATION_NOT_FOUND",
        "REGISTRATION_VALIDATION_ERROR",
        "EVENT_PASS_VALIDATION_ERROR",
      ].includes(code) && (
        <LinkButton href="/dashboard/events" variant="text">
          Open registration history ↗
        </LinkButton>
      )}
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Refresh pass status
        </Button>
      )}
    </div>
  );
}

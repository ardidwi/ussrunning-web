"use client";
import { Button } from "@/components/ui";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { registrationMessages } from "../model";
export function RegistrationFeedback({
  code,
  retry,
  returnTo = "/dashboard/events",
}: {
  code: string;
  retry?: () => void;
  returnTo?: string;
}) {
  const message = registrationMessages[code];
  if (!message)
    return <ServiceFeedback code={code} retry={retry} returnTo={returnTo} />;
  return (
    <div className="uss-registration-feedback" role="alert">
      <p>{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Reload registration
        </Button>
      )}
    </div>
  );
}

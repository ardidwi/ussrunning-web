"use client";

import { useActionState, type ReactNode } from "react";
import { Button, FormActions } from "@/components/ui";
import type { AdminActionState } from "@/app/admin/actions";

export default function ActionFormStatus({
  action,
  children,
  className = "",
  submitLabel,
}: {
  action: (
    state: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>;
  children: ReactNode;
  className?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className={className}
      noValidate
      onSubmit={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      {children}
      {state.error ? (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="admin-form-success" role="status">
          {state.ok}
        </p>
      ) : null}
      <FormActions>
        <Button type="submit" loading={pending} loadingLabel="Saving…">
          {submitLabel} ↗
        </Button>
      </FormActions>
    </form>
  );
}

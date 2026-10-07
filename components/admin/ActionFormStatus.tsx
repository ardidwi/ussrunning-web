"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminActionState } from "@/app/admin/actions";

export default function ActionFormStatus({
  action,
  children,
  className = "",
  submitLabel,
}: {
  action: (
    state: AdminActionState,
    formData: FormData
  ) => Promise<AdminActionState>;
  children: ReactNode;
  className?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error ? <p className="admin-form-error">{state.error}</p> : null}
      {state.ok ? <p className="admin-form-success">{state.ok}</p> : null}
      <button type="submit" className="admin-save-button" disabled={pending}>
        {pending ? "SAVING..." : submitLabel} <span>↗</span>
      </button>
    </form>
  );
}

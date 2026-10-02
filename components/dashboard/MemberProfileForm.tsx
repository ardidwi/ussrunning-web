"use client";

import { useActionState } from "react";
import {
  updateMemberProfile,
  type MemberActionState,
} from "@/app/dashboard/actions";

const initialState: MemberActionState = {};

export default function MemberProfileForm({
  profile,
}: {
  profile: {
    first_name: string | null;
    last_name: string | null;
    mobile: string | null;
    city: string | null;
    instagram: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateMemberProfile,
    initialState
  );

  return (
    <form action={formAction} className="member-profile-form">
      <div className="member-form-grid">
        <label>
          <span>FIRST NAME</span>
          <input name="firstName" defaultValue={profile.first_name || ""} required />
        </label>
        <label>
          <span>LAST NAME</span>
          <input name="lastName" defaultValue={profile.last_name || ""} />
        </label>
        <label>
          <span>MOBILE</span>
          <input name="mobile" defaultValue={profile.mobile || ""} />
        </label>
        <label>
          <span>CITY</span>
          <input name="city" defaultValue={profile.city || ""} />
        </label>
        <label className="member-form-wide">
          <span>INSTAGRAM</span>
          <input name="instagram" defaultValue={profile.instagram || ""} placeholder="@username" />
        </label>
      </div>

      {state.error ? <p className="dashboard-form-error">{state.error}</p> : null}
      {state.ok ? <p className="dashboard-form-success">{state.ok}</p> : null}

      <button type="submit" className="dashboard-primary-button" disabled={pending}>
        {pending ? "SAVING..." : "SAVE PROFILE"} <b>↗</b>
      </button>
    </form>
  );
}

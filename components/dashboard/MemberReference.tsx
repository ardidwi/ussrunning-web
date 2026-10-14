"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import type {
  MemberProfile,
  MemberResult,
  ProfileAdapter,
} from "@/lib/member/contract";
import MemberDashboardShell from "./MemberDashboardShell";
import MemberOverview from "./MemberOverview";
import MemberProfileForm from "./MemberProfileForm";
import MemberFeedback from "./MemberFeedback";
import MemberLoading from "./MemberLoading";
// Fictional fixtures only; production cannot activate this module or adapter.
const fixture: MemberProfile = {
  values: {
    fullName: "Preview Runner",
    phone: "",
    city: "",
    instagram: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  },
  memberId: "USS-PREVIEW",
  revision: "preview-1",
  completion: {
    percentage: 40,
    missingFields: [
      "phone",
      "city",
      "emergencyContactName",
      "emergencyContactPhone",
    ],
  },
  policy: {
    required: ["fullName"],
    maxLengths: {
      fullName: 120,
      phone: 40,
      city: 120,
      instagram: 100,
      emergencyContactName: 120,
      emergencyContactPhone: 40,
    },
    minimumPhoneDigits: 8,
    maximumPhoneDigits: 15,
  },
};
export default function MemberReference({
  view = "overview",
  scenario = "active",
}: {
  view?: string;
  scenario?: string;
}) {
  const [requests, setRequests] = useState(0);
  if (process.env.NODE_ENV !== "development") return null;
  const profile: MemberProfile =
    scenario === "complete"
      ? {
          ...fixture,
          values: {
            fullName: "Preview Runner",
            phone: "+628123456789",
            city: "Jakarta",
            instagram: "@preview",
            emergencyContactName: "Fictional Contact",
            emergencyContactPhone: "+628123456780",
          },
          completion: { percentage: 100, missingFields: [] },
        }
      : scenario === "long"
        ? {
            ...fixture,
            values: {
              ...fixture.values,
              fullName:
                "A very long fictional runner name for testing wrapping and small screen member identity presentation",
            },
          }
        : fixture;
  const codes: Record<string, MemberResult> = {
    pending: { state: "error", code: "EMAIL_NOT_VERIFIED" },
    suspended: { state: "error", code: "ACCOUNT_SUSPENDED" },
    deactivated: { state: "error", code: "ACCOUNT_DEACTIVATED" },
    expired: { state: "error", code: "UNAUTHENTICATED" },
    unavailable: { state: "error", code: "PROFILE_UNAVAILABLE" },
    failure: { state: "error", code: "NETWORK_ERROR" },
  };
  const adapter: ProfileAdapter = async (values, _revision, details) => {
    if (process.env.NODE_ENV !== "development")
      return { state: "error", code: "PROFILE_UNAVAILABLE" };
    setRequests((count) => count + 1);
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (scenario === "save-failure")
      throw new Error("Development network failure");
    if (scenario === "stale")
      return { state: "error", code: "PROFILE_CONFLICT" };
    if (scenario === "malformed")
      return { state: "ready", profile: {} } as MemberResult;
    if (scenario === "server-validation")
      return {
        state: "error",
        code: "VALIDATION_ERROR",
        fields: { city: "Raw server message must not appear" },
      };
    if (scenario === "save-expired")
      return { state: "error", code: "UNAUTHENTICATED" };
    // Completion remains fixture-issued, not calculated by the form.
    return {
      state: "ready",
      profile: {
        ...profile,
        values,
        details: details ? { ...details, privacyAccepted: details.privacyAccepted || details.privacyConsent === true, privacyConsent: undefined } : undefined,
        revision: "preview-2",
        completion: {
          percentage: 70,
          missingFields: ["emergencyContactName", "emergencyContactPhone"],
        },
      },
    };
  };
  return (
    <MemberDashboardShell
      activePath={view === "profile" ? "/dashboard/profile" : "/dashboard"}
    >
      <p className="uss-reference-disclosure" role="note">
        Development reference. Fictional member data; no accounts or profile
        records are read or saved.
      </p>
      <output aria-label="Development request count">
        Requests: {requests}
      </output>
      {scenario === "loading" ? (
        <MemberLoading profile={view === "profile"} />
      ) : codes[scenario] ? (
        <MemberFeedback
          code={
            (codes[scenario] as { state: "error"; code: "NETWORK_ERROR" }).code
          }
          retry={() => window.location.reload()}
        />
      ) : view === "profile" ? (
        <MemberProfileForm profile={profile} adapter={adapter} reloadAdapter={async () => ({state:"ready",profile:{...profile,revision:"preview-latest",values:{...profile.values,city:"Latest fixture city"}}})} />
      ) : (
        <MemberOverview result={{ state: "ready", profile }} />
      )}
      <Button variant="text" onClick={() => window.location.reload()}>
        Reset development reference
      </Button>
    </MemberDashboardShell>
  );
}

"use client";
import AdminWorkspace from "@/components/admin/AdminWorkspace";
import MemberProfileForm from "@/components/dashboard/MemberProfileForm";

const hero = {
  headline: "COMMUNITY IN MOTION.",
  description: "Development visual reference only.",
  imageUrl: "/uss-logo.png",
};
export default function WorkspaceReference({
  member = false,
}: {
  member?: boolean;
}) {
  return (
    <div onSubmitCapture={(event) => event.preventDefault()}>
      <p className="uss-reference-disclosure" role="note">
        Development visual reference only. Fictional data; submissions are
        disabled.
      </p>
      {member ? (
        <main className="member-dashboard">
          <section className="member-dashboard-panel">
            <div className="member-panel-head">
              <span className="kicker">MY USS / PROFILE</span>
              <h2>YOUR DETAILS.</h2>
            </div>
            <MemberProfileForm
              profile={{
                first_name: "Preview",
                last_name: "Runner",
                mobile: "+628123456789",
                city: "Jakarta",
                instagram: "@preview",
                emergency_contact_name: "Demo Contact",
                emergency_contact_mobile: "+628123456780",
              }}
            />
          </section>
        </main>
      ) : (
        <AdminWorkspace
          user={{
            name: "Demo Admin",
            email: "preview@example.com",
            role: "admin",
          }}
          overview={{
            members: 0,
            publishedEvents: 0,
            openRegistrations: 0,
            publishedStories: 0,
            mediaAssets: 0,
          }}
          homeHero={hero}
          loginHero={hero}
          events={[
            {
              id: "preview-event",
              slug: "preview-run",
              title: "Development run preview",
              start_at: "2026-10-08T00:00:00Z",
              location_name: "Jakarta",
              distance_label: "5K",
              capacity: 30,
              registration_status: "draft",
              published: false,
            },
          ]}
          stories={[]}
          media={[]}
          members={[]}
          activity={[]}
          homeGalleryIds={[]}
          settings={{ contactEmail: "preview@example.com" }}
        />
      )}
    </div>
  );
}

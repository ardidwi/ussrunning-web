"use client";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

const hero = {
  headline: "COMMUNITY IN MOTION.",
  description: "Development visual reference only.",
  imageUrl: "/uss-logo.png",
};
export default function WorkspaceReference() {
  return (
    <div onSubmitCapture={(event) => event.preventDefault()}>
      <p className="uss-reference-disclosure" role="note">
        Development visual reference only. Fictional data; submissions are
        disabled.
      </p>
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
    </div>
  );
}

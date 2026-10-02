"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ActionFormStatus from "@/components/admin/ActionFormStatus";
import {
  createMediaAsset,
  saveEvent,
  setMemberRole,
  setStoryStatus,
  updateCmsHero,
  updateSiteSettings,
} from "@/app/admin/actions";
import type {
  AdminActivity,
  AdminEvent,
  AdminMedia,
  AdminMember,
  AdminOverview,
  AdminStory,
} from "@/lib/admin";
import type { CmsHero } from "@/lib/content";

type Tab =
  | "overview"
  | "content"
  | "events"
  | "stories"
  | "media"
  | "members"
  | "activity"
  | "settings";

const tabs: { id: Tab; label: string; eyebrow: string }[] = [
  { id: "overview", label: "Overview", eyebrow: "01" },
  { id: "content", label: "Website", eyebrow: "02" },
  { id: "events", label: "Runs", eyebrow: "03" },
  { id: "stories", label: "Stories", eyebrow: "04" },
  { id: "media", label: "Media", eyebrow: "05" },
  { id: "members", label: "Members", eyebrow: "06" },
  { id: "activity", label: "Activity", eyebrow: "07" },
  { id: "settings", label: "Settings", eyebrow: "08" },
];

function fmtDate(value: string | null) {
  if (!value) return "TBA";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function FormField({
  label,
  name,
  defaultValue,
  type = "text",
  wide = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "admin-field admin-field-wide" : "admin-field"}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="admin-field admin-field-wide">
      <span>{label}</span>
      <textarea name={name} rows={5} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

export default function AdminWorkspace({
  user,
  overview,
  homeHero,
  loginHero,
  events,
  stories,
  media,
  members,
  activity,
  settings,
}: {
  user: { name: string; email: string; role: "admin" | "super_admin" };
  overview: AdminOverview;
  homeHero: CmsHero;
  loginHero: CmsHero;
  events: AdminEvent[];
  stories: AdminStory[];
  media: AdminMedia[];
  members: AdminMember[];
  activity: AdminActivity[];
  settings: { instagram?: string; strava?: string; contactEmail?: string };
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");

  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        `${member.name} ${member.email} ${member.member_code || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [members, search]
  );

  return (
    <main className="uss-admin-shell">
      <aside className="uss-admin-sidebar">
        <Link href="/" className="uss-admin-brand">
          <img src="/uss-logo.png" alt="USS" />
          <span>CONTROL ROOM</span>
        </Link>

        <nav aria-label="USS CMS navigation">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={tab === item.id ? "is-active" : ""}
            >
              <small>{item.eyebrow}</small>
              <strong>{item.label}</strong>
              <span>↗</span>
            </button>
          ))}
        </nav>

        <div className="uss-admin-sidebar-foot">
          <div>
            <span>{user.role === "super_admin" ? "SUPER ADMIN" : "ADMIN"}</span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <Link href="/">VIEW LIVE SITE ↗</Link>
        </div>
      </aside>

      <section className="uss-admin-main">
        <header className="uss-admin-topbar">
          <div>
            <span>USS RUNNING / BACKEND</span>
            <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
          </div>
          <div className="uss-admin-system-state">
            <i />
            <span>NEON CONNECTED</span>
            <b>BACKEND V1</b>
          </div>
        </header>

        {tab === "overview" ? (
          <div className="admin-view">
            <section className="admin-hero-panel">
              <span className="kicker">USS CONTROL ROOM</span>
              <h2>RUN THE<br />COMMUNITY.</h2>
              <p>
                One backend for members, runs, stories, media and the public website.
                Changes here are stored in Neon and can appear without a code deploy.
              </p>
            </section>

            <section className="admin-metric-grid">
              <article><span>MEMBERS</span><strong>{overview.members}</strong><small>USS IDs</small></article>
              <article><span>LIVE RUNS</span><strong>{overview.publishedEvents}</strong><small>published</small></article>
              <article><span>REGISTRATIONS</span><strong>{overview.openRegistrations}</strong><small>active / waitlist</small></article>
              <article><span>STORIES</span><strong>{overview.publishedStories}</strong><small>published</small></article>
              <article><span>MEDIA</span><strong>{overview.mediaAssets}</strong><small>assets</small></article>
            </section>

            <section className="admin-split-grid">
              <article className="admin-dark-card">
                <span className="kicker">QUICK ACCESS</span>
                <h3>CHANGE THE SITE,<br />NOT THE CODE.</h3>
                <p>
                  Hero copy, imagery, runs and stories now have database-backed controls.
                </p>
                <button onClick={() => setTab("content")}>EDIT WEBSITE ↗</button>
              </article>

              <article className="admin-light-card">
                <span className="kicker">NEXT STEP</span>
                <h3>USE REAL USS MEDIA.</h3>
                <p>
                  Add official image URLs to the media library now. Direct file upload
                  will use the already-provisioned Neon Storage bucket once storage
                  credentials are exposed to the runtime.
                </p>
                <button onClick={() => setTab("media")}>OPEN MEDIA ↗</button>
              </article>
            </section>
          </div>
        ) : null}

        {tab === "content" ? (
          <div className="admin-view">
            <section className="admin-section-head">
              <div>
                <span className="kicker">PUBLIC WEBSITE</span>
                <h2>EDIT WHAT<br />PEOPLE SEE.</h2>
              </div>
              <p>
                Homepage and login hero content are database-backed. Publish here and
                the frontend reads the latest value.
              </p>
            </section>

            <div className="admin-content-grid">
              <ActionFormStatus action={updateCmsHero} className="admin-editor-card" submitLabel="PUBLISH HOME HERO">
                <input type="hidden" name="pageSlug" value="home" />
                <div className="admin-editor-head">
                  <span>HOME / HERO</span>
                  <b>LIVE</b>
                </div>
                <div className="admin-form-grid">
                  <FormField label="LOCATION / EYEBROW" name="eyebrow" defaultValue={homeHero.eyebrow} />
                  <FormField label="ESTABLISHED" name="established" defaultValue={homeHero.established} />
                  <TextAreaField label="HEADLINE" name="headline" defaultValue={homeHero.headline} />
                  <TextAreaField label="DESCRIPTION" name="description" defaultValue={homeHero.description} />
                  <FormField label="IMAGE URL" name="imageUrl" defaultValue={homeHero.imageUrl} wide />
                  <FormField label="CTA LABEL" name="ctaLabel" defaultValue={homeHero.ctaLabel} />
                  <FormField label="CTA LINK" name="ctaHref" defaultValue={homeHero.ctaHref} />
                </div>
                <div className="admin-image-preview">
                  <img src={homeHero.imageUrl} alt="" />
                  <span>HOME HERO PREVIEW</span>
                </div>
              </ActionFormStatus>

              <ActionFormStatus action={updateCmsHero} className="admin-editor-card" submitLabel="PUBLISH LOGIN HERO">
                <input type="hidden" name="pageSlug" value="login" />
                <div className="admin-editor-head">
                  <span>LOGIN / HERO</span>
                  <b>LIVE</b>
                </div>
                <div className="admin-form-grid">
                  <FormField label="KICKER" name="kicker" defaultValue={loginHero.kicker} />
                  <TextAreaField label="HEADLINE" name="headline" defaultValue={loginHero.headline} />
                  <TextAreaField label="DESCRIPTION" name="description" defaultValue={loginHero.description} />
                  <FormField label="BACKGROUND IMAGE URL" name="imageUrl" defaultValue={loginHero.imageUrl} wide />
                </div>
                <div className="admin-image-preview">
                  <img src={loginHero.imageUrl} alt="" />
                  <span>LOGIN BACKGROUND PREVIEW</span>
                </div>
              </ActionFormStatus>
            </div>
          </div>
        ) : null}

        {tab === "events" ? (
          <div className="admin-view">
            <section className="admin-section-head">
              <div>
                <span className="kicker">RUN MANAGEMENT</span>
                <h2>RUNS.<br />LIVE DATA.</h2>
              </div>
              <p>
                Capacity, status and publishing are stored in Neon. Registration data
                is linked to member accounts.
              </p>
            </section>

            <div className="admin-stack">
              {events.map((event) => (
                <ActionFormStatus key={event.id} action={saveEvent} className="admin-event-row" submitLabel="SAVE RUN">
                  <input type="hidden" name="id" value={event.id} />
                  <div className="admin-event-summary">
                    <span>{event.slug.toUpperCase()}</span>
                    <h3>{event.title}</h3>
                    <small>{fmtDate(event.start_at)}</small>
                  </div>
                  <div className="admin-form-grid">
                    <FormField label="TITLE" name="title" defaultValue={event.title} />
                    <FormField label="START AT" name="startAt" type="datetime-local" defaultValue={event.start_at ? new Date(event.start_at).toISOString().slice(0,16) : ""} />
                    <FormField label="LOCATION" name="location" defaultValue={event.location_name} />
                    <FormField label="DISTANCE" name="distance" defaultValue={event.distance_label} />
                    <FormField label="CAPACITY" name="capacity" type="number" defaultValue={event.capacity} />
                    <label className="admin-field">
                      <span>REGISTRATION</span>
                      <select name="registrationStatus" defaultValue={event.registration_status}>
                        <option value="draft">Draft</option>
                        <option value="coming_soon">Coming Soon</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="sold_out">Sold Out</option>
                      </select>
                    </label>
                    <label className="admin-toggle">
                      <input type="checkbox" name="published" defaultChecked={event.published} />
                      <span>PUBLISHED</span>
                    </label>
                  </div>
                </ActionFormStatus>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "stories" ? (
          <div className="admin-view">
            <section className="admin-section-head">
              <div>
                <span className="kicker">USS JOURNAL</span>
                <h2>STORIES.<br />PUBLISH WITH INTENT.</h2>
              </div>
              <p>Control editorial visibility from one place.</p>
            </section>

            <div className="admin-table">
              <div className="admin-table-head">
                <span>STORY</span><span>STATUS</span><span>PUBLISHED</span><span>ACTION</span>
              </div>
              {stories.map((story) => (
                <div className="admin-table-row" key={story.id}>
                  <div>
                    <strong>{story.title}</strong>
                    <small>{story.eyebrow || story.slug}</small>
                  </div>
                  <span className={`admin-status admin-status-${story.status}`}>{story.status}</span>
                  <span>{fmtDate(story.published_at)}</span>
                  <form action={setStoryStatus}>
                    <input type="hidden" name="id" value={story.id} />
                    <select name="status" defaultValue={story.status}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button>UPDATE</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "media" ? (
          <div className="admin-view">
            <section className="admin-section-head">
              <div>
                <span className="kicker">MEDIA LIBRARY</span>
                <h2>REAL ASSETS.<br />ONE LIBRARY.</h2>
              </div>
              <p>
                Store references for hero, gallery, event and story visuals. Existing
                Unsplash assets are clearly identifiable and can be replaced with
                official USS photography.
              </p>
            </section>

            <ActionFormStatus action={createMediaAsset} className="admin-media-add" submitLabel="ADD TO LIBRARY">
              <div className="admin-form-grid">
                <FormField label="TITLE" name="title" />
                <FormField label="IMAGE URL" name="publicUrl" wide />
                <FormField label="ALT TEXT" name="altText" wide />
                <label className="admin-field">
                  <span>TYPE</span>
                  <select name="kind" defaultValue="image">
                    <option value="image">Image</option>
                    <option value="logo">Logo</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                  </select>
                </label>
              </div>
            </ActionFormStatus>

            <div className="admin-media-grid">
              {media.map((asset) => (
                <article key={asset.id} className="admin-media-card">
                  <div>
                    {asset.public_url && asset.kind !== "document" ? (
                      <img src={asset.public_url} alt={asset.alt_text || ""} />
                    ) : (
                      <span className="admin-media-placeholder">{asset.kind.toUpperCase()}</span>
                    )}
                  </div>
                  <span>{asset.kind} / {asset.status}</span>
                  <strong>{asset.title}</strong>
                  <small>{asset.object_key}</small>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "members" ? (
          <div className="admin-view">
            <section className="admin-section-head">
              <div>
                <span className="kicker">MEMBER DIRECTORY</span>
                <h2>PEOPLE<br />BEHIND THE ID.</h2>
              </div>
              <p>
                Member identity and role data comes from Managed Neon Auth plus USS profiles.
              </p>
            </section>

            <input
              className="admin-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or USS ID..."
            />

            <div className="admin-table admin-member-table">
              <div className="admin-table-head">
                <span>MEMBER</span><span>USS ID</span><span>CITY</span><span>ROLE</span>
              </div>
              {filteredMembers.map((member) => (
                <div className="admin-table-row" key={member.id}>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.email}</small>
                  </div>
                  <span>{member.member_code || "PROFILE PENDING"}</span>
                  <span>{member.city || "—"}</span>
                  {user.role === "super_admin" ? (
                    <form action={setMemberRole}>
                      <input type="hidden" name="id" value={member.id} />
                      <select name="role" defaultValue={member.role || "member"}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                      <button>SAVE</button>
                    </form>
                  ) : (
                    <span>{member.role || "member"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "activity" ? (
          <div className="admin-view">
            <section className="admin-section-head">
              <div>
                <span className="kicker">AUDIT TRAIL</span>
                <h2>WHAT<br />CHANGED.</h2>
              </div>
              <p>Recent backend actions from admins and super admins.</p>
            </section>

            <div className="admin-activity-list">
              {activity.length ? activity.map((item) => (
                <article key={item.id}>
                  <span>{fmtDate(item.created_at)}</span>
                  <strong>{item.action}</strong>
                  <small>{item.actor_name || "SYSTEM"} · {item.entity_type || "general"}</small>
                </article>
              )) : (
                <p>No admin activity recorded yet.</p>
              )}
            </div>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="admin-view">
            <section className="admin-section-head">
              <div>
                <span className="kicker">GENERAL SETTINGS</span>
                <h2>ONE SOURCE<br />OF TRUTH.</h2>
              </div>
              <p>Keep public links and contact points editable without touching code.</p>
            </section>

            <ActionFormStatus action={updateSiteSettings} className="admin-editor-card admin-settings-card" submitLabel="SAVE SETTINGS">
              <div className="admin-form-grid">
                <FormField label="INSTAGRAM URL" name="instagram" defaultValue={settings.instagram} wide />
                <FormField label="STRAVA URL" name="strava" defaultValue={settings.strava} wide />
                <FormField label="CONTACT EMAIL" name="contactEmail" type="email" defaultValue={settings.contactEmail || "hello@ussrunning.com"} />
              </div>
            </ActionFormStatus>
          </div>
        ) : null}
      </section>
    </main>
  );
}

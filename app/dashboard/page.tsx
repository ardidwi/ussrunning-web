import Link from "next/link";
import { Barcode, DownloadBarcode } from "@/components/cms/Controls";
import MemberProfileForm from "@/components/dashboard/MemberProfileForm";
import { cancelRegistration, registerForEvent, signOut } from "@/app/dashboard/actions";
import { query } from "@/lib/db";
import { ensureProfile, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Registration = {
  id: string;
  status: string;
  pass_code: string;
  registered_at: string;
  checked_in_at: string | null;
  event_id: string;
  slug: string;
  title: string;
  start_at: string | null;
  location_name: string | null;
  distance_label: string | null;
};

type UpcomingEvent = {
  id: string;
  slug: string;
  title: string;
  start_at: string | null;
  location_name: string | null;
  distance_label: string | null;
  registration_status: string;
  image: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "TBA";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);

  const [registrations, upcoming] = await Promise.all([
    query<Registration>(
      `SELECT
         r.id::text,
         r.status,
         r.pass_code,
         r.registered_at::text,
         r.checked_in_at::text,
         e.id::text AS event_id,
         e.slug,
         e.title,
         e.start_at::text,
         e.location_name,
         e.distance_label
       FROM public.event_registrations r
       JOIN public.events e ON e.id = r.event_id
       WHERE r.auth_user_id = $1::uuid
       ORDER BY e.start_at DESC NULLS LAST`,
      [user.id]
    ),
    query<UpcomingEvent>(
      `SELECT
         e.id::text,
         e.slug,
         e.title,
         e.start_at::text,
         e.location_name,
         e.distance_label,
         e.registration_status,
         m.public_url AS image
       FROM public.events e
       LEFT JOIN public.media_assets m ON m.id=e.cover_media_id
       WHERE e.published=true
         AND e.registration_status IN ('open','coming_soon')
         AND NOT EXISTS (
           SELECT 1 FROM public.event_registrations r
           WHERE r.event_id=e.id
             AND r.auth_user_id=$1::uuid
             AND r.status <> 'cancelled'
         )
       ORDER BY e.start_at NULLS LAST
       LIMIT 4`,
      [user.id]
    ),
  ]);

  const activeRegistrations = registrations.filter((item) =>
    ["registered", "waitlist", "checked_in"].includes(item.status)
  );

  return (
    <main className="member-dashboard">
      <header className="member-dashboard-header">
        <Link href="/" className="member-dashboard-logo">
          <img src="/uss-logo.png" alt="USS" />
        </Link>

        <div className="member-dashboard-header-copy">
          <span>MY USS / MEMBER</span>
          <strong>{profile?.member_code || "USS ID"}</strong>
        </div>

        <div className="member-dashboard-header-actions">
          {user.role !== "member" ? <Link href="/admin">CMS ↗</Link> : null}
          <Link href="/">LIVE SITE ↗</Link>
          <form action={signOut}><button type="submit">LOG OUT</button></form>
        </div>
      </header>

      <section className="member-dashboard-hero">
        <div>
          <span className="kicker">WELCOME BACK</span>
          <h1>{(profile?.first_name || user.name).toUpperCase()}.<br />KEEP MOVING.</h1>
        </div>
        <p>
          One USS ID for community runs, passes and your participation history.
          Membership stays free.
        </p>
      </section>

      <section className="member-dashboard-stats">
        <article>
          <span>USS ID</span>
          <strong>{profile?.member_code || "PENDING"}</strong>
          <small>member identity</small>
        </article>
        <article>
          <span>ACTIVE RUNS</span>
          <strong>{activeRegistrations.length}</strong>
          <small>registered / waitlist</small>
        </article>
        <article>
          <span>CHECK-INS</span>
          <strong>{registrations.filter((item) => item.checked_in_at).length}</strong>
          <small>community history</small>
        </article>
        <article>
          <span>ROLE</span>
          <strong>{user.role.replace("_", " ").toUpperCase()}</strong>
          <small>account access</small>
        </article>
      </section>

      <section className="member-dashboard-grid">
        <article className="member-id-card">
          <div className="member-id-card-top">
            <span>USS RUNNING / JAKARTA</span>
            <b>MEMBER ID</b>
          </div>
          <img src="/uss-logo.png" alt="USS" />
          <h2>{profile?.member_code || "USS-ID"}</h2>
          <p>{user.name}</p>
          {profile?.member_code ? (
            <>
              <Barcode value={profile.member_code} />
              <DownloadBarcode value={profile.member_code} />
            </>
          ) : null}
          <small>Use this ID for member-facing USS experiences. Event passes remain event-specific.</small>
        </article>

        <article className="member-dashboard-panel member-profile-panel">
          <div className="member-panel-head">
            <span className="kicker">PROFILE</span>
            <h2>YOUR DETAILS.</h2>
          </div>
          <MemberProfileForm
            profile={{
              first_name: profile?.first_name || user.name,
              last_name: profile?.last_name || "",
              mobile: profile?.mobile || "",
              city: profile?.city || "",
              instagram: profile?.instagram || "",
            }}
          />
        </article>
      </section>

      <section className="member-dashboard-section">
        <div className="member-section-head">
          <div>
            <span className="kicker">YOUR RUNS</span>
            <h2>SHOW UP.<br />KEEP THE HISTORY.</h2>
          </div>
          <Link href="/runs">EXPLORE ALL RUNS ↗</Link>
        </div>

        <div className="member-registration-list">
          {registrations.length ? registrations.map((item) => (
            <article key={item.id}>
              <div>
                <span>{item.status.toUpperCase()}</span>
                <h3>{item.title}</h3>
                <p>{formatDate(item.start_at)} · {item.location_name || "JAKARTA"} · {item.distance_label || "COMMUNITY RUN"}</p>
              </div>
              <div className="member-pass-code">
                <small>RUN PASS</small>
                <strong>{item.pass_code}</strong>
              </div>
              {item.status !== "cancelled" && item.status !== "checked_in" ? (
                <form action={cancelRegistration}>
                  <input type="hidden" name="registrationId" value={item.id} />
                  <button type="submit">CANCEL</button>
                </form>
              ) : null}
            </article>
          )) : (
            <div className="member-empty-state">
              <span>NO RUNS YET</span>
              <h3>YOUR NEXT START LINE<br />IS STILL OPEN.</h3>
              <Link href="/runs">FIND A RUN ↗</Link>
            </div>
          )}
        </div>
      </section>

      <section className="member-dashboard-section member-next-section">
        <div className="member-section-head">
          <div>
            <span className="kicker">NEXT UP</span>
            <h2>RUN WITH<br />THE CREW.</h2>
          </div>
        </div>

        <div className="member-next-grid">
          {upcoming.map((event) => (
            <article key={event.id}>
              <div className="member-next-image">
                {event.image ? <img src={event.image} alt="" /> : null}
                <span>{event.registration_status.replace("_", " ").toUpperCase()}</span>
              </div>
              <div className="member-next-copy">
                <h3>{event.title}</h3>
                <p>{formatDate(event.start_at)} · {event.location_name || "JAKARTA"}</p>
                {event.registration_status === "open" ? (
                  <form action={registerForEvent}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <button type="submit">RSVP WITH USS ID ↗</button>
                  </form>
                ) : (
                  <Link href={"/runs/" + event.slug}>VIEW RUN ↗</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

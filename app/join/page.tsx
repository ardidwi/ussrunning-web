import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="join-shell">
      <Link href="/" className="join-brand">
        <img src="/uss-logo.png" alt="USS" />
      </Link>

      <section className="join-intro">
        <span className="kicker">USS MEMBERSHIP / FREE</span>
        <h1>JOIN THE<br />CREW.</h1>
        <p>
          One free USS ID for community runs, RSVPs, run passes and your
          participation history.
        </p>
        <div className="join-price">
          <strong>IDR 0</strong>
          <span>NO SUBSCRIPTION / NO PAID TIER</span>
        </div>
      </section>

      <section className="join-form-panel">
        <div className="join-form-head">
          <span className="kicker">CREATE YOUR USS ID</span>
          <span>01 / ACCOUNT</span>
        </div>

        <form action="/dashboard" className="join-form">
          <div className="join-form-grid">
            <label>FIRST NAME<input name="firstName" required /></label>
            <label>LAST NAME<input name="lastName" /></label>
            <label>EMAIL<input name="email" type="email" placeholder="you@email.com" required /></label>
            <label>MOBILE NUMBER<input name="mobile" type="tel" placeholder="+62..." required /></label>
            <label>CITY<input name="city" defaultValue="Jakarta" required /></label>
            <label>INSTAGRAM <span>(OPTIONAL)</span><input name="instagram" placeholder="@username" /></label>
            <label>PASSWORD<input name="password" type="password" minLength={8} required /></label>
            <label>CONFIRM PASSWORD<input name="confirmPassword" type="password" minLength={8} required /></label>
          </div>

          <div className="consent-stack">
            <label className="consent-check">
              <input type="checkbox" required />
              <span>
                I have read and understood the <Link href="/privacy" target="_blank">Privacy Policy</Link> and
                <Link href="/terms" target="_blank"> Terms of Use</Link>, and I agree to the processing of my personal data
                for USS membership, event registration, run passes and community administration.
              </span>
            </label>

            <label className="consent-check consent-optional">
              <input type="checkbox" />
              <span>
                I would also like to receive USS Running community news, event updates and selected announcements by email.
                I can unsubscribe at any time.
              </span>
            </label>
          </div>

          <button className="button button-dark full-button join-submit" type="submit">CREATE FREE USS ID</button>
          <small>
            ALREADY A MEMBER? <Link href="/login">LOG IN ↗</Link>
          </small>
        </form>
      </section>
    </main>
  );
}

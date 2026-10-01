import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <Link href="/" className="auth-brand auth-brand-image">
        <img src="/uss-logo.png" alt="USS" />
      </Link>

      <div className="auth-card">
        <span className="kicker">MY USS / FREE COMMUNITY MEMBERSHIP</span>
        <h1>WELCOME<br />BACK.</h1>
        <p>
          Sign in to your USS ID to see your next run, run pass and community history.
          Membership is free.
        </p>

        <form action="/dashboard" className="auth-form">
          <label>EMAIL<input type="email" placeholder="you@email.com" required /></label>
          <label>PASSWORD<input type="password" placeholder="••••••••" required /></label>
          <button className="button button-dark full-button" type="submit">LOG IN</button>
        </form>

        <div className="auth-separator"><span>OR</span></div>
        <Link className="button auth-preview-button full-button" href="/dashboard">PREVIEW MY USS</Link>
        <small>NO USS ID YET? <Link href="/membership">JOIN FREE ↗</Link></small>
      </div>
    </main>
  );
}

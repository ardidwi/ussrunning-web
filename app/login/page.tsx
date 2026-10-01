import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <Link href="/" className="auth-brand">USS®<span>RUNNING</span></Link>
      <div className="auth-card">
        <span className="kicker">MEMBER ACCESS</span>
        <h1>WELCOME<br />BACK.</h1>
        <p>This MVP uses a preview login. Authentication will be connected after the product direction is approved.</p>
        <form action="/dashboard" className="auth-form">
          <label>EMAIL<input type="email" placeholder="you@email.com" required /></label>
          <label>PASSWORD<input type="password" placeholder="••••••••" required /></label>
          <button className="button button-light full-button" type="submit">LOG IN</button>
        </form>
        <div className="auth-separator"><span>OR</span></div>
        <Link className="button button-outline full-button" href="/dashboard">PREVIEW MEMBER DASHBOARD</Link>
        <small>NO USS ID YET? <Link href="/membership">CREATE ONE ↗</Link></small>
      </div>
    </main>
  );
}

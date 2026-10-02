import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="join-shell">
      <Link href="/" className="join-brand">
        <img src="/uss-logo.png" alt="USS" />
      </Link>

      <section className="join-intro">
        <span className="kicker">USS MEMBERSHIP / FREE</span>
        <h1>
          JOIN THE
          <br />
          CREW.
        </h1>
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

        <div className="cms-login-note">
          <strong>Pendaftaran akun belum aktif</strong>
          <p>
            Akun permanen tersedia setelah backend terhubung. Untuk sekarang,
            coba akun Member demo dengan ID dan barcode.
          </p>
          <Link href="/dashboard" className="button button-dark">
            PREVIEW MEMBER
          </Link>
        </div>
      </section>
    </main>
  );
}

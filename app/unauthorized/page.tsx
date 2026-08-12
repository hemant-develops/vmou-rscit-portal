import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="app-shell">
      <section className="empty-state unauthorized-panel">
        <h1>Unauthorized</h1>
        <p>This account is signed in, but it does not match the configured administrator email and role.</p>
        <Link className="primary-btn" href="/sign-in">
          Sign in with admin account
        </Link>
      </section>
    </main>
  );
}

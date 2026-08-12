import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="login-shell clerk-login-shell">
      <section className="clerk-login-panel">
        <div className="clerk-login-copy">
          <span>Admin access</span>
          <h1>Sign in to manage VMOU RS-CIT results</h1>
          <p>Only the configured administrator email with the admin role can open the portal or ingestion workflows.</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "clerk-root",
              cardBox: "clerk-card",
              card: "clerk-card-inner",
              headerTitle: "clerk-title",
              headerSubtitle: "clerk-subtitle",
              formButtonPrimary: "clerk-primary",
              footerActionLink: "clerk-link"
            }
          }}
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/"
        />
      </section>
    </main>
  );
}

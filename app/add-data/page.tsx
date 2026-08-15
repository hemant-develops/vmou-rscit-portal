import { redirect } from "next/navigation";
import { AddDataPortal } from "@/components/add-data-portal";
import { getCurrentClerkSession } from "@/lib/clerk-session";

export default async function AddDataPage() {
  const session = await getCurrentClerkSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="app-shell">
      <section className="summary-band">
        <div>
          <h1>Add data</h1>
          <p>Import result files here. The search page stays clean until you need this upload workflow.</p>
        </div>
      </section>
      <AddDataPortal />
    </main>
  );
}

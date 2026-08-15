import { redirect } from "next/navigation";
import { EventsPortal } from "@/components/events-portal";
import { getCurrentClerkSession } from "@/lib/clerk-session";

export default async function EventsPage() {
  const session = await getCurrentClerkSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="app-shell">
      <section className="summary-band">
        <div>
          <h1>Events</h1>
          <p>View exam events now. Event data management can be added here afterwards.</p>
        </div>
      </section>
      <EventsPortal />
    </main>
  );
}

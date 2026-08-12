import { EventsPortal } from "@/components/events-portal";

export default function EventsPage() {
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

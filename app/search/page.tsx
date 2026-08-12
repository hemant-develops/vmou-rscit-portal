import { SearchPortal } from "@/components/search-portal";

export default function SearchPage() {
  return (
    <main className="app-shell">
      <section className="summary-band">
        <div>
          <h1>Search learners</h1>
          <p>Name and DOB searches run across all exam events. Select an event when you want a scholar-number search for one event only.</p>
        </div>
      </section>
      <SearchPortal />
    </main>
  );
}

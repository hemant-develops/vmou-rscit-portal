import Link from "next/link";

export default function HomePage() {
  return (
    <main className="app-shell">
      <section className="home-hero">
        <div>
          <span>VMOU RS-CIT Results</span>
          <h1>Learner records, exam attempts, and imports in one place</h1>
          <p>
            Search all events by learner details, narrow scholar-number lookups by exam event, and add new result files from a dedicated import page.
          </p>
          <div className="home-actions">
            <Link className="primary-btn" href="/search">
              Search Learners
            </Link>
            <Link className="ghost-link-btn" href="/add-data">
              Add Data
            </Link>
          </div>
        </div>
      </section>
      <section className="home-grid">
        <Link className="home-tile" href="/search">
          <span>Search</span>
          <strong>Find learners across all exam events or inside one selected event.</strong>
        </Link>
        <Link className="home-tile" href="/add-data">
          <span>Add Data</span>
          <strong>Import Access, Excel, CSV, DBF, and PDF result files.</strong>
        </Link>
        <Link className="home-tile" href="/events">
          <span>Events</span>
          <strong>Review available exam events. Data tools can be added here next.</strong>
        </Link>
      </section>
    </main>
  );
}

import { AddDataPortal } from "@/components/add-data-portal";

export default function AddDataPage() {
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

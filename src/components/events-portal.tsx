"use client";

import { useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/client-api";

type ExamEvent = {
  id: number;
  label: string;
  year: number | null;
  month: number | null;
  attempts?: number;
  learners?: number;
  resultCounts?: ResultCounts;
  passPercentage?: number;
  withMarks?: number;
  averageMarks?: number | null;
  lastUpdated?: string | null;
  appeared?: number;
  districts?: DistrictSummary[];
};

type DistrictSummary = {
  district: string;
  attempts: number;
  appeared: number;
  pass: number;
  fail: number;
  passPercentage: number;
};

type ResultCounts = {
  PASS: number;
  FAIL: number;
  ABSENT: number;
  UFM: number;
  RLW: number;
  OTHER: number;
};

type EventsSummary = {
  events: number;
  attempts: number;
  appeared: number;
  learners: number;
  withMarks: number;
  resultCounts: ResultCounts;
  passPercentage: number;
};

const emptyCounts: ResultCounts = {
  PASS: 0,
  FAIL: 0,
  ABSENT: 0,
  UFM: 0,
  RLW: 0,
  OTHER: 0
};

export function EventsPortal() {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [, setSummary] = useState<EventsSummary | null>(null);
  const [status, setStatus] = useState("Loading exam events...");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then(readJsonResponse)
      .then((data) => {
        const rows = (data.events ?? []) as ExamEvent[];
        setEvents(rows);
        setSummary((data.summary ?? null) as EventsSummary | null);
        setStatus(
          rows.length
            ? `${rows.length} exam event${rows.length === 1 ? "" : "s"} loaded from the database.`
            : "No exam events loaded yet."
        );
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load events."));
  }, []);

  return (
    <>
      <div className="search-meta">{status}</div>

      <section className="events-list wide" aria-label="Exam event progress">
        {events.length ? (
          events.map((event) => {
            const selected = selectedEventId === event.id;

            return (
              <article className={`event-progress-card ${selected ? "selected" : ""}`} key={event.id}>
                <button
                  aria-expanded={selected}
                  className="event-progress-button"
                  onClick={() => setSelectedEventId(selected ? null : event.id)}
                  type="button"
                >
                  <span className="event-progress-heading">
                    <span>
                      <strong>{event.label}</strong>
                      <small>
                        {event.year ? `Year ${event.year}` : "Year not recorded"}
                        {event.month ? ` - Month ${event.month}` : ""}
                        {event.lastUpdated ? ` - Updated ${formatDate(event.lastUpdated)}` : ""}
                      </small>
                    </span>
                    <b>{formatPercent(event.passPercentage ?? 0)}%</b>
                  </span>
                  <span className="event-progress-track" aria-hidden="true">
                    <span style={{ width: `${clampPercent(event.passPercentage ?? 0)}%` }} />
                  </span>
                  <span className="event-progress-footer">
                    <span>{formatNumber(event.appeared ?? 0)} appeared</span>
                    <span>{formatNumber(event.resultCounts?.PASS ?? 0)} pass</span>
                    <span>{formatNumber(event.resultCounts?.FAIL ?? 0)} fail</span>
                  </span>
                </button>

                {selected ? <EventDetails event={event} /> : null}
              </article>
            );
          })
        ) : (
          <div className="empty-state">No events found. Import result files from Add Data to populate this list.</div>
        )}
      </section>
    </>
  );
}

function EventDetails({ event }: { event: ExamEvent }) {
  const counts = event.resultCounts ?? emptyCounts;

  return (
    <div className="event-detail-panel">
      <section className="event-summary-grid" aria-label={`${event.label} totals`}>
        <MetricCard label="Total learner" value={formatNumber(event.learners ?? 0)} />
        <MetricCard label="Total records" value={formatNumber(event.attempts ?? 0)} />
        <MetricCard label="Appeared" value={formatNumber(event.appeared ?? 0)} />
        <MetricCard label="Pass learner" value={formatNumber(counts.PASS)} />
        <MetricCard label="Fail learner" value={formatNumber(counts.FAIL)} />
        <MetricCard label="Absent" value={formatNumber(counts.ABSENT)} />
        <MetricCard label="UFM" value={formatNumber(counts.UFM)} />
        <MetricCard label="RLW" value={formatNumber(counts.RLW)} />
        <MetricCard label="Other" value={formatNumber(counts.OTHER)} />
        <MetricCard label="Avg marks" value={event.averageMarks === null || event.averageMarks === undefined ? "-" : formatNumber(event.averageMarks)} />
      </section>

      <section aria-label={`${event.label} district pass percentage`}>
        <div className="district-heading">
          <h2>District wise pass percentage</h2>
          <span>{formatNumber(event.districts?.length ?? 0)} districts</span>
        </div>
        <div className="district-table">
          {(event.districts ?? []).length ? (
            event.districts?.map((district) => (
              <div className="district-row" key={district.district}>
                <div>
                  <strong>{toTitleCase(district.district)}</strong>
                  <span>
                    {formatNumber(district.pass)} pass / {formatNumber(district.appeared)} appeared
                  </span>
                </div>
                <div className="district-rate">
                  <b>{formatPercent(district.passPercentage)}%</b>
                  <span className="district-track" aria-hidden="true">
                    <span style={{ width: `${clampPercent(district.passPercentage)}%` }} />
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">District data is not recorded for this event yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

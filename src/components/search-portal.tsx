"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readJsonResponse } from "@/lib/client-api";

type ExamEvent = {
  id: number;
  label: string;
};

type Attempt = {
  id: number;
  event: string;
  result: string | null;
  internal: number | null;
  theory: number | null;
  total: number | null;
  roll: string | null;
  examCentre: string | null;
  mobile: string | null;
  itgkCode: string | null;
  itgk: string | null;
  spCentre: string | null;
  barcode: string | null;
  bookletSeries: string | null;
  sourceFile: string | null;
  sourceTable: string | null;
};

type LearnerSummary = {
  status: "PASS" | "FAIL";
  passCount: number;
  failCount: number;
  bestScore: number | null;
  bestPassScore: number | null;
  bestEvent: string | null;
  bestPassEvent: string | null;
};

type Learner = {
  id: string;
  learnerKey: string;
  name: string;
  father: string | null;
  dob: string | null;
  latest: Attempt | null;
  attempts: Attempt[];
  summary: LearnerSummary;
};

export function SearchPortal() {
  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [query, setQuery] = useState("");
  const [eventId, setEventId] = useState("");
  const [result, setResult] = useState("All");
  const [dob, setDob] = useState("");
  const [learners, setLearners] = useState<Learner[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState("Search by scholar number, learner code, name, father name, DOB, exam event, or result.");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const bestMarks = useMemo(
    () => learners.reduce((high, learner) => Math.max(high, learner.latest?.total ?? 0), 0),
    [learners]
  );

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then(readJsonResponse)
      .then((data) => {
        setEvents(data.events ?? []);
        if (data.warning) {
          setStatus(data.warning);
        }
      })
      .catch((error) => setStatus(error.message));
  }, []);

  async function runSearch(offset = 0) {
    const isNextPage = offset > 0;
    const params = new URLSearchParams({
      q: query,
      result,
      dob
    });

    if (eventId) {
      params.set("eventId", eventId);
    }

    if (offset) {
      params.set("offset", String(offset));
    }

    if (!query.trim() && !eventId && result === "All" && !dob.trim()) {
      setLearners([]);
      setHasMore(false);
      setStatus("Enter a search value or select an exam event, result, or date of birth.");
      return;
    }

    if (isNextPage) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        setStatus(data.error ?? "Search failed");
        if (!isNextPage) {
          setLearners([]);
          setHasMore(false);
        }
        return;
      }

      const rows = data.learners ?? [];
      setLearners((current) => isNextPage ? [...current, ...rows] : rows);
      setHasMore(Boolean(data.hasMore));
      setStatus(
        rows.length
          ? `${isNextPage ? "More results loaded" : "Search completed"} in ${(data.elapsedMs / 1000).toFixed(2)} seconds${eventId ? " for the selected exam event" : " across all exam events"}.`
          : "No matching learner found."
      );
    } catch (error) {
      if (!isNextPage) {
        setLearners([]);
        setHasMore(false);
      }
      setStatus(error instanceof Error ? error.message : "Search failed");
    } finally {
      if (isNextPage) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }

  return (
    <>
      <section className="search-panel" id="search">
        <label className="field wide">
          <span>Learner name, father name, or scholar number</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void runSearch();
            }}
            placeholder="Search by scholar number, learner code, name, or father name"
          />
        </label>
        <label className="field">
          <span>Exam event</span>
          <select
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
              setResult("All");
              setLearners([]);
              setHasMore(false);
              setStatus(
                event.target.value
                  ? "Exam event selected. Search now to show all learners for this event, or add more filters."
                  : "Event cleared. Search will run across all exam events."
              );
            }}
          >
           <option value="">All exam events</option>
{events.map((event) => (
  <option key={event.id} value={event.id}>
    {event.label?.includes("GMT") || event.label?.includes("T00:00") 
      ? new Date(event.label).toLocaleDateString("en-US", { month: "long", year: "numeric" }) 
      : event.label}
  </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Result</span>
          <select value={result} onChange={(event) => setResult(event.target.value)}>
            <option value="All">Any result</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="ABSENT">ABSENT</option>
            <option value="UFM">UFM</option>
            <option value="RLW">RLW</option>
          </select>
        </label>
        <label className="field">
          <span>Date of birth</span>
          <input value={dob} onChange={(event) => setDob(event.target.value)} placeholder="DD-MM-YYYY" />
        </label>
        <div className="actions">
          <button
            className="ghost-btn"
            type="button"
            onClick={() => {
              setQuery("");
              setEventId("");
              setResult("All");
              setDob("");
              setLearners([]);
              setHasMore(false);
              setStatus("Search by scholar number, learner code, name, father name, DOB, exam event, or result.");
            }}
          >
            Clear
          </button>
          <button className="primary-btn search-btn" type="button" onClick={() => void runSearch()} disabled={isLoading}>
            {isLoading ? <span className="loader" aria-hidden="true" /> : null}
            {isLoading ? "Searching" : "Search"}
          </button>
        </div>
      </section>

      <div className="search-meta">{status}</div>

      <section className="content-grid">
        <div>
          <div className="section-heading">
            <h2>Search results</h2>
            <span>{learners.length ? `${learners.length} learners` : "Blank until upload"}</span>
          </div>
          <div className="records-list">
            {learners.length ? (
              learners.map((learner) => (
                <Link
                  className="record-card"
                  href={`/learners/${learner.learnerKey}`}
                  key={learner.id}
                >
                  <div>
                    <div className="record-title-row">
                      <h3>{learner.name || "Unnamed learner"}</h3>
                    </div>
                    <p>
                      Scholar {learner.learnerKey}
                      {learner.dob ? ` - DOB ${learner.dob}` : ""}
                    </p>
                    <p>
                      Father: <strong className="font-bold">{learner.father || "Not recorded"}</strong>
                    </p>
                    <div className="result-details">
                      <span>Roll: {learner.latest?.roll ?? "-"}</span>
                      <span>ITGK: {learner.latest?.itgkCode ?? "-"}</span>
                      <span>SP: {learner.latest?.spCentre ?? "-"}</span>
                      <span>Internal: {learner.latest?.internal ?? "-"}</span>
                      <span>Theory: {learner.latest?.theory ?? "-"}</span>
                      <span>Total: {learner.latest?.total ?? "-"}</span>
                    </div>
                  </div>
                  <div className="record-side">
                    <span className={`badge ${(learner.latest?.result ?? "").toLowerCase()}`}>
                      {learner.latest?.result ?? "RESULT"}
                    </span>
                    <span className="marks">{learner.summary.bestScore ?? "-"}</span>
                    <span className="mini-stat">{learner.attempts.length} attempt{learner.attempts.length === 1 ? "" : "s"}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-state">No user data yet. Upload result files, then search to show real learner records.</div>
            )}
          </div>
          {learners.length && hasMore ? (
            <div className="mt-4 flex justify-center">
              <button className="ghost-btn" type="button" onClick={() => void runSearch(learners.length)} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading" : "Load more"}
              </button>
            </div>
          ) : null}
        </div>

        <aside className="stats-panel" aria-live="polite">
          <div>
            <span>Loaded events</span>
            <strong>{events.length}</strong>
          </div>
          <div>
            <span>Current results</span>
            <strong>{learners.length}</strong>
          </div>
          <div>
            <span>Best marks in search</span>
            <strong>{bestMarks || "-"}</strong>
          </div>
        </aside>
      </section>
    </>
  );
}

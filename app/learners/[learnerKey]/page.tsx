import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessLearner } from "@/lib/access-fallback";
import { getLearner } from "@/lib/db/queries";

type LearnerPageProps = {
  params: Promise<{
    learnerKey: string;
  }>;
};

export default async function LearnerPage({ params }: LearnerPageProps) {
  const { learnerKey } = await params;
  const learner = process.env.DATABASE_URL
    ? await getLearner(learnerKey).catch(() => getAccessLearner(learnerKey))
    : await getAccessLearner(learnerKey);

  if (!learner) {
    notFound();
  }

  return (
    <main className="detail-shell">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link className="back-link" href="/" aria-label="Back to search form">
          <span aria-hidden="true">←</span>
          Back to search
        </Link>
        <span>{learner.name}</span>
      </nav>

      <section className="learner-hero">
        <div className="avatar large">{initials(learner.name)}</div>
        <div>
          <div className="hero-title-row">
            <h1>{learner.name}</h1>
            <span className={`status-dot ${learner.summary.status.toLowerCase()}`}>
              {learner.summary.status}
            </span>
          </div>
          <p>{learner.learnerKey}</p>
          <p>
            Father: <strong className="font-bold">{learner.father || "Not recorded"}</strong>
            {learner.dob ? ` - Born ${learner.dob}` : ""}
            {learner.latest?.itgk ? ` - ${learner.latest.itgk}` : ""}
          </p>
          <div className="learner-metrics">
            <span>{learner.attempts.length} attempt{learner.attempts.length === 1 ? "" : "s"}</span>
            <span>Pass {learner.summary.passCount}</span>
            <span>{learner.summary.failCount} fail result{learner.summary.failCount === 1 ? "" : "s"}</span>
            <span>
              {learner.summary.bestScore === null
                ? "Marks not recorded"
                : `Best ${learner.summary.bestScore} marks${learner.summary.bestEvent ? ` in ${learner.summary.bestEvent}` : ""}`}
            </span>
          </div>
        </div>
      </section>

      <section className="attempts-stack">
        {learner.attempts.map((attempt) => (
          <article className="attempt-card full" key={attempt.id}>
            <div className="attempt-title">
              <h2>{attempt.event}</h2>
              <span className={`badge ${(attempt.result ?? "").toLowerCase()}`}>{attempt.result ?? "RESULT"}</span>
            </div>
            <div className="score-row">
              <span>
                Internal <strong>{attempt.internal ?? "-"}/30</strong>
              </span>
              <span>
                Practical <strong>{attempt.internal ?? "-"}/30</strong>
              </span>
              <span>
                Theory <strong>{attempt.theory ?? "-"}/70</strong>
              </span>
              <span>
                Total <strong>{attempt.total ?? "-"}/100</strong>
              </span>
            </div>
            <div className="detail-grid three">
              <Detail label="Roll number" value={attempt.roll} />
              <Detail label="Exam centre" value={attempt.examCentre} />
              <Detail label="ITGK" value={attempt.itgk} />
              <Detail label="ITGK code" value={attempt.itgkCode} />
              <Detail label="SP centre" value={attempt.spCentre} />
              <Detail label="Mobile" value={attempt.mobile} />
              <Detail label="Booklet series" value={attempt.bookletSeries} />
              <Detail label="Barcode" value={attempt.barcode} />
              <Detail label="Source table" value={attempt.sourceTable} />
            </div>
            <p className="source-note">Source: {attempt.sourceFile ?? "Not recorded"}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value ?? "Not recorded"}</strong>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

# VMOU RSCIT Learner Portal

**Fourteen years of RS-CIT exam results — 10.1 million records, searchable by Scholar Number in under 15 ms.**

[![Live](https://img.shields.io/badge/live-vmou--rscit--portal.duckdns.org-2ea44f)](https://vmou-rscit-portal.duckdns.org)
![Records](https://img.shields.io/badge/records-10%2C138%2C607-blue)
![Learners](https://img.shields.io/badge/learners-8%2C209%2C302-blue)
![Events](https://img.shields.io/badge/exam%20events-61-blue)
![Coverage](https://img.shields.io/badge/coverage-2012–2026-blue)

Vardhman Mahaveer Open University, Kota, has run the RS-CIT computer-literacy
certification across Rajasthan since 2009. Every sitting's results were filed as
whatever software was to hand that year — Microsoft Access, Excel, FoxPro, and
for the oldest years, printed PDFs. Answering *"did this person pass, and when?"*
meant knowing which of 129,469 files to open.

This turns that into a search box.

---

## Pick your section

This one file serves four different readers. Jump to yours — the sections do not
overlap, and none of them assumes you have read the others.

| If you are… | Go to | You will find |
| --- | --- | --- |
| 👤 **Using the portal** | [For users](#-for-users) | How to find a learner, what the screens mean |
| 📊 **Funding or assessing it** | [For stakeholders](#-for-stakeholders) | What it cost, what it saves, what it runs on |
| 💻 **Working on the code** | [For developers](#-for-developers) | Architecture, setup, the decisions and why |
| 🤖 **An AI agent** | [For AI agents](#-for-ai-agents) | Ground rules, invariants, where the traps are |

---

<a name="-for-users"></a>
## 👤 For users

*You have an admin login and need to find someone's result.*

### Finding a learner

Go to **https://vmou-rscit-portal.duckdns.org** and sign in. The search box takes four
kinds of input:

| You have | Type it | What happens |
| --- | --- | --- |
| **Scholar Number** | `117250828025657789` | Instant exact match — every exam that learner ever sat |
| **Learner Code** | same | Same thing. Older records call it a Scholar Number; newer ones a Learner Code — they are one number |
| **A name** | `RAKESH DHAKAR` | Every learner whose name contains those words |
| **A name and a father's name** | `RAKESH RAJENDRA` | Only learners called Rakesh whose father is Rajendra |

**Adding words narrows the search.** Every word you type has to appear somewhere
in the learner's name *or* their father's. So if `RAKESH` gives too many, add the
father's name. If you get nothing back, remove a word.

### Narrowing it further

Three filters sit under the search box:

- **Exam event** — a specific sitting, like "March 2026"
- **Result** — PASS, FAIL, ABSENT, UFM (unfair means), RLW (result withheld)
- **Date of birth** — type it however you like: `25-08-1998`, `1998-08-25` or
  `25/08/1998` all work. This is the best way to tell apart two learners with the
  same name.

> **About one record in eight has no date of birth.** Older sittings did not
> always record it. If a learner you know exists disappears when you add a date,
> that is why — clear the date and search by name.

**Roll numbers** only work once you have picked an exam event. They restart at
100001 every sitting, so on their own they match hundreds of unrelated people.

### Reading a learner's page

Clicking a result opens everything known about that person:

- **Their attempts, newest first.** Someone who re-sat the exam has one card per
  sitting, so you can see they failed in March and passed in August.
- **Marks** shown against what they are out of — internal /30, theory /70,
  total /100.
- **Where they studied** — their ITGK (training centre), its district, and the
  exam centre they sat at.
- **The source file** each record came from, at the bottom of every card. If a
  result looks wrong, that tells you which of VMOU's original files to check.
- **Their photo**, for the March 2026 sitting. Everyone else shows initials —
  earlier sittings have no photographs.

### Browsing whole sittings

**Events** lists every exam by year with its pass rate. Opening one gives
district-by-district figures and a **Download CSV** button — the full sitting as
a spreadsheet, in the same column layout regardless of which year it is from.

### If something looks wrong

Every record carries the file it came from. Note the Scholar Number and that
filename and send both — that is enough to trace it back to VMOU's original
export.

---

<a name="-for-stakeholders"></a>
## 📊 For stakeholders

*You are deciding whether this was worth building, or what it costs to keep.*

### The problem

VMOU held fourteen years of RS-CIT results as 129,469 files across 18 GB — Access
databases, Excel workbooks, FoxPro tables, and printed PDFs. Finding one
learner's result meant knowing which file to open and having software that could
read a format from 2013. Verifying a certificate, answering an RTI request, or
confirming a pass for an employer took hours and depended on one person's
familiarity with the folder structure.

### What was delivered

| | |
| --- | --- |
| **Records searchable** | 10,138,607 |
| **Distinct learners** | 8,209,302 |
| **Exam events** | 61 sittings, October 2012 → March 2026 |
| **Oldest data recovered** | 2009, extracted from printed PDFs |
| **Search time** | 9–15 ms by Scholar Number |
| **Data lost in conversion** | 113 rows of 17.7 million — 0.0006 % |

The 113 unusable rows were already broken in the source files: no learner code,
no name, or a repeated header row. Every one is listed by name in the audit
output.

### Time to build

A solo developer, working from a folder of files with no documentation:

| Phase | Effort | What dominates it |
| --- | --- | --- |
| **Understanding the data** | 3–5 days | Six unrelated file formats, column names that changed five times, and no key that spans all years. Most of the risk lives here |
| **Ingest pipeline** | 5–7 days | Readers for each format, resolving one sitting from a dozen spellings, deciding which of six copies of an exam wins |
| **Loading and verifying** | 2–3 days | Mostly waiting; the checking is what takes attention |
| **The web application** | 5–7 days | Search, learner history, event browsing, CSV export, upload |
| **AWS deployment** | 1–2 days | EC2, RDS, 6 GB transfer, domain, TLS, authentication |
| **Documentation** | 1–2 days | Decision log, runbook, this file |
| **Total** | **17–26 days** | Roughly **four to five weeks** for one person |

The honest caveat: the data understanding phase is the one that varies most. A
different archive with cleaner conventions could halve it; a messier one could
double it.

### Running costs

Deployed in AWS Mumbai (`ap-south-1`):

| Service | Specification | Free tier (12 months) | After |
| --- | --- | --- | --- |
| EC2 `t3.micro` | 2 vCPU, 1 GB RAM, 30 GB | ₹0 | ~₹700/mo |
| RDS `db.t4g.micro` | PostgreSQL 17, 30 GB | ₹0 | ~₹1,100/mo |
| Storage | 60 GB gp3 total | partly | ~₹430/mo |
| Public IPv4 | 1 Elastic IP | ₹0 | ~₹300/mo |
| Clerk | Authentication | Free to 10,000 users | ₹0 |
| Let's Encrypt | TLS certificate | ₹0 | ₹0 |
| Domain | subdomain of an existing one | ₹0 | ₹0 |
| **Total** | | **₹0** | **~₹2,500/mo** (~$30) |

Figures are indicative for `ap-south-1` and exclude data transfer, which for this
traffic is negligible.

**The one decision worth revisiting:** the database runs on the smallest instance
available. It handles the load well — a learner lookup is 9 ms — but a name
search takes ~290 ms because the search index does not fit in 1 GB of memory.
Moving to `db.t4g.small` (~₹2,200/mo) would fix that. Worth doing when concurrent
users become common, not before.

### What it is safe to say publicly

- Results are **admin-only**. There is no public lookup. Every page and every API
  route checks authorisation at the point it reads data.
- Learner records are **personal data** — names, dates of birth, mobile numbers,
  photographs. Access is restricted to named accounts with an explicit admin
  role.
- The archive **never leaves controlled infrastructure**. Source files stay on
  the machine that ingests them; the 4 GB of learner photographs are never
  uploaded anywhere.

### Where the risk sits

| Risk | Standing |
| --- | --- |
| Data loss during conversion | Measured at 0.0006 %, every case itemised |
| Wrong result shown | Every record traces to its source file; revised exports beat originals by design |
| Single server, no redundancy | Real. Acceptable for an internal lookup tool; would need work before public use |
| Backups | **Not yet configured** — see below |

**Backups are the outstanding gap.** RDS automated backups should be enabled with
7-day retention (about ₹250/mo). Everything else can be rebuilt from the source
archive; the database cannot, without repeating the whole ingest.

---

<a name="-for-developers"></a>
## 💻 For developers

*You are going to change this code.*

> **Read [`docs/INGEST.md`](docs/INGEST.md) before touching anything that reads,
> maps or merges exam data.** It is the decision log: which column names mean the
> same thing across fourteen years, how a sitting is resolved, which copy of an
> exam wins, what was deliberately dropped — and the reasoning for each, so you
> can change a decision rather than rediscover it.

### Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19 | Server components keep 10 M rows server-side |
| Language | TypeScript, strict | |
| Database | PostgreSQL 17 + `pg_trgm` | Trigram indexes make `ilike '%…%'` viable at 10 M rows |
| ORM | Drizzle | Schema is the migration source; `drizzle-kit push` |
| Auth | Clerk | `publicMetadata.role = "admin"` |
| Styling | Tailwind v4 | |
| Ingest | tsx CLI + `mdbtools`, SheetJS, `pdfjs-dist` | One format reader each |
| Hosting | EC2 + RDS behind nginx | Vercel cannot run the ingest — see below |

About 6,500 lines of TypeScript across the app and the ingest.

### How it is arranged

**The local Postgres is the source of truth.** It holds every exam event. The
source files are 18 GB of Access databases and the loaded result is 6 GB, far
past a free-tier hosted database.

**A deployment is a copy.** Either the whole archive on your own infrastructure
(EC2 + RDS, as now) or a published subset for a demo (`npm run publish:live`).

Two features exist only off Vercel, because both need a filesystem and the
`mdbtools` / `unzip` binaries:

- **`/upload`** — adding an exam event. The parsers shell out to `mdb-export`,
  and one sitting is a 500 MB Access file: an order of magnitude past what a
  serverless function can receive.
- **Learner photos** — 191,319 PNGs, about 4 GB.

The gate is the `VERCEL` environment variable, not `NODE_ENV`, so a local
`next build && next start` keeps both. **Off Vercel the app reads
`INGEST_DATABASE_URL`, not `DATABASE_URL`** — this catches everyone once.

### Setup

There is one database, shared by every environment, so there is nothing to seed
and no second copy to keep in step. It is not on the public internet — it holds
eight million people's names, dates of birth and phone numbers — so a developer
machine reaches it by forwarding a local port to it over SSH.

```bash
brew install mdbtools libpq
```

Once, to write your `.env.local`. It reads the connection string off the server,
so the password never passes through your terminal or your shell history:

```bash
./scripts/use-remote-db.sh ubuntu@your-server
```

Then, in its own terminal, whenever you are working:

```bash
./scripts/db-tunnel.sh
```

```bash
npm run dev
```

Schema changes are generated into `drizzle/` and committed, then applied by the
deploy. To change the schema: edit `src/lib/db/schema.ts`, run `npm run
db:generate`, read the SQL it produced, and commit it.

```bash
npm run db:migrate -- --dry    # what would run, without running it
```

### Loading data

Look before you load — this reports every table, what it is, which sitting it
resolves to, how each column maps, and anything unreadable, without writing:

```bash
npm run ingest -- inspect full-data --include-pdf
```

```bash
npm run ingest -- archive full-data --include-pdf
```

```bash
npm run ingest -- summary && npm run ingest -- verify
```

Loading the same file twice is safe: records merge on (learner, exam event).

| Command | Purpose |
| --- | --- |
| `inspect <path>` | Report the plan without writing |
| `load <path>` | Load one file, folder or zip |
| `archive <dir>` | Load a whole archive, revisions last |
| `summary` | Per-event counts and pass rates |
| `verify` | Rows read against rows kept, and anything dropped |
| `refresh` | Recompute the counts the portal displays |
| `reset --force` | Empty the database |

| Flag | Purpose |
| --- | --- |
| `--source <substring>` | Only matching tables/sheets |
| `--map HEADER=field` | Override a column mapping |
| `--exam-event <label>` | Event for rows that carry none |
| `--keep-unmapped` | Carry unrecognised columns into `extra` |
| `--include-pdf` | Also read the 2009–2012 PDF result books |
| `--dry-run` | Map and count without writing |
| `--json <file>` | Write the plan as JSON |

### Formats

| Format | Read by |
| --- | --- |
| `.accdb`, `.mdb` | `mdb-export`, streamed — a 500 MB file never lands in memory |
| `.xlsx`, `.xls`, `.xlsm` | SheetJS, including legacy BIFF |
| `.dbf` | SheetJS (dBase / FoxPro) |
| `.csv` | `csv-parse`, streamed |
| `.pdf` | `pdfjs-dist`, columns rebuilt from text positions |
| `.zip` | Expanded in place, including nested archives |

### Data model

```
exam_events ──< results >── source_files
                  │
            archive_stats (one row)
```

- **`exam_events`** — one row per sitting, keyed on (year, month). The archive
  writes the same sitting a dozen ways; they all resolve here.
- **`results`** — one row per learner per event. Unique on
  `(learner_key, exam_event_id)`.
- **`source_files`** — which file produced which record, at what precedence.
- **`archive_stats`** — totals the ingest maintains, because
  `count(distinct learner_key)` over 10 M rows takes seconds.

`learner_key` is the scholar number where a source has one and the learner code
otherwise. **They are the same number** — the column was renamed in 2020.

Phase is a column, not part of the event: a sitting runs in one or two phases and
a learner sits exactly one.

### Which copy of an exam wins

For one sitting the archive may hold the original export, a `_Backup`, a DBF
dump, pass-only extracts, and a `REVISED_` version from weeks later. Sources load
lowest precedence first — subset, backup, primary, revision, correction — and a
row only overwrites one that ranks no higher, so re-running in a different order
converges on the same answer.

**Blank values never overwrite.** A ten-column pass-only extract must not erase a
seventy-column record.

### Search, and why the indexes are shaped that way

| Query | Index | Measured |
| --- | --- | --- |
| Scholar Number | `results_learner_key_idx` | 9 ms |
| Name, one or more words | `results_person_trgm_idx` | 51–149 ms |
| Word + date of birth | both | 33 ms |
| Date of birth alone | `results_dob_idx` | 9 ms |
| Event page | `results_event_id_idx` | pages off the index, no sort |

`results_person_trgm_idx` is one GIN index over
`name || ' ' || coalesce(father_name, '')`, not two indexes with an OR. Multi-word
search becomes an AND of `ilike` over one expression, which the planner serves
from a single index. Two indexes with an OR measured **six times slower**
(839 ms against 149 ms).

An expression index only serves queries written **exactly** the same way — the
`PERSON` constant in `src/lib/queries.ts` must stay in step with the schema.

### Testing

```bash
npm run test:rules
```

Not unit tests so much as an executable statement of what the archive means:
every case is a real value from a real file, and every expected answer is a
decision recorded in `docs/INGEST.md`. Change an interpretation and this is where
it shows.

### Deployment

**Pushing to `main` is the deploy.** A timer on the instance checks GitHub every
two minutes and, when `main` has moved, installs dependencies if the lockfile
changed, applies outstanding migrations, builds, restarts and then checks the
site actually answers. A failed build or a service that does not come back is
rolled back to the previous commit automatically.

```bash
ssh ubuntu@your-server journalctl -u vmou-deploy -n 50
```

Migrations run *before* the new code starts, so a page never queries a column
that does not exist yet. They are not rolled back on failure — reversing a schema
change unattended is far more dangerous than leaving the database one migration
ahead of the code.

Setting the instance up from nothing: **[`docs/DEPLOY-EC2.md`](docs/DEPLOY-EC2.md)**.

```bash
./scripts/update-clerk-keys.sh    # rotate Clerk keys safely
```

### Traps, all of which cost real time

1. **`INGEST_DATABASE_URL` wins over `DATABASE_URL` everywhere.** Setting only
   the latter on a machine that has both configured will quietly use the wrong
   one.
2. **drizzle-kit's own commands fail silently.** `push` exits 0 when it has
   failed; `migrate` exits 1 while printing nothing at all — no error, no file,
   no statement. Neither is in the deploy path. `generate` is fine, and
   `scripts/migrate.ts` does the applying.
3. **A tunnelled connection needs `DATABASE_SSL_SERVERNAME`.** It dials
   `localhost`, which would mean no TLS — which RDS refuses — and the
   certificate names the real host, so verification fails on the name. Passing
   `servername` alone does nothing: node-postgres overwrites it from the
   connection host. `checkServerIdentity` is what takes effect.
4. **node-postgres connects lazily.** A misconfigured database surfaces on the
   first query, not at startup — and every page a signed-out visitor sees
   redirects before touching it. The app can look completely healthy while unable
   to read a row.
5. **`next build` needs more than 1 GB.** On a `t3.micro` it is OOM-killed with no
   message. Add swap.
6. **Excel and DBF are read whole; Access is streamed.** A 500 MB `.accdb` is
   fine on 1 GB of RAM; an 87 MB `.xlsx` is not.

---

<a name="-for-ai-agents"></a>
## 🤖 For AI agents

*You are modifying this repository.*

### Before anything else

1. **`AGENTS.md`** — Next.js 16 differs from your training data. Read
   `node_modules/next/dist/docs/` for the API you are about to use.
2. **`docs/INGEST.md`** — mandatory before touching ingest, mapping or merge
   logic. Every rule there is a judgement call with a recorded reason and a
   stated alternative. Do not re-derive them; do not silently change them.
3. **`npm run test:rules`** — must pass. It encodes the interpretations in
   `docs/INGEST.md`.

### Invariants — breaking these corrupts data

| Invariant | Where | Consequence if broken |
| --- | --- | --- |
| `learner_key` = scholar number ?? learner code | `scripts/lib/loader.ts` | Learners split or merge wrongly |
| Unique on `(learner_key, exam_event_id)` | `src/lib/db/schema.ts` | Duplicate or lost attempts |
| Blank values never overwrite on merge | `buildMerge()` | Extracts erase full records |
| Higher `source_rank` wins | `buildMerge()` | Superseded results resurface |
| Dates read identically in ingest and search | `src/lib/dates.ts` | Filters silently match nothing |
| `PERSON` expression matches the index | `queries.ts` ↔ `schema.ts` | Search falls back to a full scan |
| Every data read checks the admin role | every page and route | Personal data exposed |

### Where things are

```
src/lib/queries.ts        every database read the portal makes
src/lib/dates.ts          date parsing, shared with the ingest
src/lib/search-terms.ts   query tokenising (pure; no database import)
src/lib/local.ts          the VERCEL gate for upload and photos
src/lib/db/schema.ts      three tables + stats; the migration source
src/lib/db/ssl.ts         TLS by host, not by vendor
scripts/lib/archive-plan.ts   what each file is, and which copy wins
scripts/lib/exam-events.ts    a dozen date spellings → (year, month)
scripts/lib/canonical-fields.ts  the column-rename map
scripts/lib/sources.ts    one reader per format
scripts/lib/loader.ts     COPY into staging, then merge
```

### Rules for this codebase

- **Measure before optimising, and put the number in the commit message.** The
  index decisions here are all backed by timings, and several first attempts were
  wrong by a factor of six.
- **Never guess an exam event.** A row that cannot be resolved is skipped and
  counted, never filed under a neighbouring sitting.
- **Never widen a search silently.** Every token must match; adding a word
  narrows.
- **`extra` (jsonb) is the escape hatch** for source columns with no canonical
  home. Use it rather than dropping data.
- **Do not add OMR internals** (M1–M35, answer keys, scan paths) to the schema.
  They triple row size and are only useful against the original file.

### Verifying a change

```bash
npm run test:rules && npx tsc --noEmit && npx eslint src scripts && npm run build
```

For anything touching ingest, also:

```bash
npm run ingest -- inspect full-data --include-pdf --json /tmp/plan.json
```

and diff `/tmp/plan.json` against the previous plan. A change in classification,
event resolution or column mapping shows up there before it reaches the database.

---

## Licence and contact

Private repository. Learner data is personal data under Indian law — do not copy
the archive, the database, or any export off controlled infrastructure.

- Repository: https://github.com/ajay-develops/vmou-rscit
- Live: https://vmou-rscit-portal.duckdns.org

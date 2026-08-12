# VMOU Next.js Setup

## 1. Install dependencies

```powershell
pnpm install
```

## 2. Configure environment

Copy `.env.example` to `.env.local` and set:

```text
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vmou_rscit
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

In Clerk, set admin users with:

```json
{
  "role": "admin"
}
```

under `publicMetadata`.

## 3. Create PostgreSQL tables

```powershell
pnpm db:generate
pnpm db:migrate
```

The repository includes an initial migration in `drizzle/`. Run `db:generate`
again only after changing `src/lib/db/schema.ts`.

## 4. Import result files

Command line ingest:

```powershell
pnpm ingest -- D:\vmou\full-data
```

Or sign in as admin and use the upload panel in the web app.

Supported import readers:

- `.mdb`, `.accdb` through `mdb-tables` and `mdb-export`
- `.xlsx`, `.xls`, `.xlsm`, `.csv`, `.dbf` through SheetJS
- `.pdf` through `pdfjs-dist`

For Access imports, install `mdbtools` first and confirm these commands work:

```powershell
mdb-tables --help
mdb-export --help
```

## 5. Run locally

```powershell
pnpm dev
```

Open:

```text
http://127.0.0.1:3000
```

Scholar Number and Learner Code are stored as `learner_key`. Result attempts are
unique by `learner_key + exam_event_id`, so a learner can have multiple attempts
without duplicate rows for the same exam event.

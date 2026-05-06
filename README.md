# DealerFlow

Dealership-focused Next.js app: **CSV inventory**, **bulk media uploads** to Supabase Storage, **weekly scheduler** with captions and drag-and-drop, and a **leaderboard** with manual engagement tracking.

Built with Next.js App Router (`src/app/` + `src/app/(dashboard)/` for authenticated shell routes), Tailwind CSS, `@supabase/ssr`, and optional server-side FFmpeg for video normalization.

---

## Prerequisites

- Node.js 20+ (CI uses Node 22)
- A Supabase project (PostgreSQL + Storage bucket `bike-media`)
- FFmpeg available on the server if you rely on `/api/media/process-video` transcoding (`ffmpeg-static` is bundled where possible).

---

## Environment

Copy [.env.local.example](/.env.local.example) to `.env.local`.

| Variable | Purpose |
|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable anon key |
| Optional time zone | `NEXT_PUBLIC_DEALER_TZ` |
| Auth / middleware | `NEXT_PUBLIC_REQUIRE_AUTH` (default requires login unless set to `false`) |
| Local UI escape hatch | `NEXT_PUBLIC_SKIP_LOGIN=1` skips login redirects (**never ship public with permissive RLS**) |

Until URL + key exist, middleware does not redirect; the homepage shows an onboarding checklist (`SetupChecklistCard`).

---

## Database

SQL migrations live in [`supabase/migrations/`](/supabase/migrations/). Apply in chronological order (`supabase db push` from the CLI, or paste into the Supabase SQL editor).

- **Initial permissive MVP RLS**: `20260424120000_init.sql` — permissive anon policies for demos.
- **Production-style lockdown**: [`20260432400000_authenticated_only_rls.sql`](/supabase/migrations/20260432400000_authenticated_only_rls.sql) — restricts `bikes`, `media`, `posts`, and writes to authenticated sessions; Storage reads stay public on `bike-media`, writes require auth.

Recommended order:

1. Create tables with init + follow-on migrations through your current head.
2. In Supabase **Authentication**, add a dealer user (**email/password** works with the bundled `/login` page).
3. Apply `20260432400000_authenticated_only_rls.sql` once you’re ready — **anonymous clients will no longer read/write**.

---

## Sign-in (`/login`)

Uses Supabase Email + Password (`signInWithPassword`). The `/auth/callback` route completes OAuth/PKCE or magic-link flows if you enable them later.

- **Sidebar** (desktop) and **bottom navigation** (mobile) include **Sign out**.

---

## CSV sync behavior

`/import/csv` upserts all **available** rows from your file keyed by SKU. Any SKU already stored that is missing from this file’s in-stock rows is **`status → sold`** (not deleted), so posts and media keep referential integrity. See UX copy next to the uploader.

---

## Scheduler workflows

Edit captions in the post dialog; use **Copy caption & hero URL** for manual Meta posting.

**Mark as posted** sets `posts.status = 'posted'` and `posted_at` so leaderboard engagement matches real publishes.

---

## Scripts

```bash
npm run dev       # Dev server
npm run build     # Production build (set env as in CI below)
npm run start     # Start production server
npm run lint      # ESLint
npm run test      # Vitest (scheduling cooldown, schedule grid invariants, CSV parsing)
npm run test:watch
```

GitHub Actions (`.github/workflows/ci.yml`): `npm ci`, `lint`, `test`, `build` with placeholder Supabase env and `NEXT_PUBLIC_SKIP_LOGIN=1` so the build succeeds without secrets.

---

## Security notes

- The **anon** key is still public — production safety depends on **RLS + auth**, not obscurity.
- `POST /api/media/process-video` requires a logged-in session unless `NEXT_PUBLIC_SKIP_LOGIN=1` (parity with middleware escape hatch).

---

## License

Private / internal — adjust as appropriate for your org.

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
| Automated CSV ingest (optional) | `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `INV_CSV_SYNC_URL`; profile via `INV_CSV_PROFILE` (`default` or `mbws`) |
| Caption templates | `NEXT_PUBLIC_CAPTION_TEMPLATE` (`fb_feed_simple`, `ig_feed_simple`, `ig_reel_caption`) and optional `NEXT_PUBLIC_DEFAULT_CAPTION_CTA` |

Until URL + key exist, middleware does not redirect; the homepage shows an onboarding checklist (`SetupChecklistCard`).

---

## M-BWS (Room 58) inventory + caption discipline

Room 58’s marketing platform (**M-BWS**) is cited for exports and integrations; **public API specifics are vendor-dependent**, so Phase 0 is still partly operational:

- **Confirm export shape** from Room 58: stable column headers (`Stock Number` → SKU), recurring CSV (email, SFTP, or HTTPS URL), and whether photo URLs ship in-column (future ingest).
- **Lock a caption contract** with your principals: headline style, hashtag limits, forbidden phrases/claims, currency format, Milwaukee vs West Bend tagging, legal footer. The app mirrors that contract in typed templates (`src/lib/caption/`) and ESLint-checked UI hints in the scheduler dialog.

Keeping inventory accurate and copy compliant beats betting the roadmap on undocumented vendor APIs upfront.

---

## Database

SQL migrations live in [`supabase/migrations/`](/supabase/migrations/). Apply in chronological order (`supabase db push` from the CLI, or paste into the Supabase SQL editor).

- **Initial permissive MVP RLS**: `20260424120000_init.sql` — permissive anon policies for demos.
- **Production-style lockdown**: [`20260432400000_authenticated_only_rls.sql`](/supabase/migrations/20260432400000_authenticated_only_rls.sql) — restricts `bikes`, `media`, `posts`, and writes to authenticated sessions; Storage reads stay public on `bike-media`, writes require auth.
- **Elite ingest + diversification**: [`20260433000000_elite_inventory_caption_audit.sql`](/supabase/migrations/20260433000000_elite_inventory_caption_audit.sql) — adds nullable `model_family`, `product_category` on `bikes` and **`csv_import_runs`** audit rows (readable by authenticated users; cron uses the service-role client).

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

`/import/csv` upserts all **available** rows from your file keyed by SKU. Any SKU already stored that is missing from this file’s in-stock rows is **`status → sold`** (not deleted), so posts and media keep referential integrity.

- **Profiles** choose header aliases (`default` vs **`mbws` / Room 58 style** — same mappings today so you can split later).
- Optional columns **`Model Family`** / **`Vehicle Type`** map to diversification fields (`bikes.model_family`, `bikes.product_category`).
- **`csv_import_runs`** captures every sync (manual or cron): counts, outcome, optional error messages.

Scheduled pulls: deploy with [`vercel.json`](/vercel.json) (daily hit to [`/api/cron/inventory-sync`](/src/app/api/cron/inventory-sync/route.ts)); the handler verifies `Authorization: Bearer $CRON_SECRET`, downloads `INV_CSV_SYNC_URL`, and upserts with `SUPABASE_SERVICE_ROLE_KEY`.

---

## Scheduler workflows

Generate week respects existing **14-day per-bike** spacing **and** skips placing two bikes that share the same trimmed `model_family` on **the same weekday column** whenever that field is set (fill may leave empty slots rather than collide).

Edit captions in the post dialog — inline lint matches the chosen `NEXT_PUBLIC_CAPTION_TEMPLATE`; **Export week (JSON)** downloads captions plus hero URLs and slot metadata for copying into Meta. Use **Copy caption & hero URL** for a single-slot clipboard payload.

**Mark as posted** sets `posts.status = 'posted'` and `posted_at` so leaderboard engagement matches real publishes.

Bike detail (`/bikes/[id]`) previews the active template so copy matches what new slots start from.

---

## Scripts

```bash
npm run dev       # Dev server
npm run build     # Production build (set env as in CI below)
npm run start     # Start production server
npm run lint      # ESLint
npm run test      # Vitest (scheduling, diversification, captions, CSV)
npm run test:watch
```

GitHub Actions (`.github/workflows/ci.yml`): `npm ci`, `lint`, `test`, `build` with placeholder Supabase env and `NEXT_PUBLIC_SKIP_LOGIN=1` so the build succeeds without secrets.

---

## Security notes

- The **anon** key is still public — production safety depends on **RLS + auth**, not obscurity.
- `POST /api/media/process-video` requires a logged-in session unless `NEXT_PUBLIC_SKIP_LOGIN=1` (parity with middleware escape hatch).
- **`SUPABASE_SERVICE_ROLE_KEY`** bypasses row-level security — restrict to servers and cron. **`GET /api/cron/inventory-sync`** expects `Authorization: Bearer $CRON_SECRET`. Treat **`INV_CSV_SYNC_URL`** as a secret-capable endpoint (signed URL or firewall), not client-side config.

---

## License

Private / internal — adjust as appropriate for your org.

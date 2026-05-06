import Link from "next/link";
import { tryPublicSupabaseConfig } from "@/lib/supabase/env";

/** Shown when Supabase URL/key are missing to guide first-run setup */
export function SetupChecklistCard() {
  const hasSupabase = Boolean(tryPublicSupabaseConfig());

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm md:p-5"
      aria-labelledby="setup-checklist-heading"
    >
      <h2
        id="setup-checklist-heading"
        className="text-base font-semibold leading-snug text-amber-950"
      >
        First-time setup
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-950/90">
        Follow these steps locally or on your host until the dashboard loads data.
      </p>
      <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-relaxed text-amber-950/90">
        <li>
          <span className="font-medium text-amber-950">Environment:</span> copy{" "}
          <code className="rounded bg-amber-100/80 px-1">.env.local.example</code> to{" "}
          <code className="rounded bg-amber-100/80 px-1">.env.local</code> and paste{" "}
          <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and a
          publishable (anon) key from Supabase Project Settings → API.
        </li>
        <li>
          <span className="font-medium text-amber-950">Database:</span> run migrations in{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">supabase/migrations/</code>{" "}
          (Supabase CLI <code className="text-xs">db push</code> or paste into the SQL Editor in
          order). The file{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">
            20260432400000_authenticated_only_rls.sql
          </code>{" "}
          tightens Row Level Security; apply it once you&apos;re ready to require sign-in (see
          Supabase{" "}
          <Link
            href="https://supabase.com/docs/guides/auth/passwords"
            className="font-medium underline decoration-amber-800/35"
          >
            email auth
          </Link>
          ).
        </li>
        <li>
          <span className="font-medium text-amber-950">Dealer login:</span> in Supabase, create an
          auth user (email + password). Then{" "}
          <Link href="/login" className="font-medium underline decoration-amber-800/35">
            sign in
          </Link>{" "}
          here. For local UI debugging only,{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">NEXT_PUBLIC_SKIP_LOGIN=1</code>{" "}
          skips login redirects (never use on the public internet with permissive RLS).
        </li>
        <li>
          <span className="font-medium text-amber-950">CSV &amp; media:</span> use{" "}
          <Link href="/import/csv" className="font-medium underline decoration-amber-800/35">
            Import CSV
          </Link>{" "}
          and ensure the Storage bucket{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs">bike-media</code> exists (created
          by the init migration).
        </li>
      </ol>
      {!hasSupabase ? (
        <p className="mt-4 text-xs leading-relaxed text-amber-900/85">
          This checklist appears when env is incomplete; once credentials are loaded, rerun the
          app to continue on the dashboard.
        </p>
      ) : null}
    </section>
  );
}

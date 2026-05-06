-- Scheduling tags + CSV import audit (single-tenant; authenticated reads/writes).

alter table public.bikes
  add column if not exists model_family text,
  add column if not exists product_category text;

create index if not exists bikes_model_family_idx on public.bikes (model_family);
create index if not exists bikes_product_category_idx on public.bikes (product_category);

create table if not exists public.csv_import_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('manual', 'cron')),
  profile text,
  ok boolean not null,
  imported int,
  marked_sold int,
  row_count_available int,
  error_message text
);

create index if not exists csv_import_runs_created_idx on public.csv_import_runs (created_at desc);

alter table public.csv_import_runs enable row level security;

create policy "csv_import_runs_select_authenticated"
  on public.csv_import_runs for select to authenticated
  using (true);

create policy "csv_import_runs_insert_authenticated"
  on public.csv_import_runs for insert to authenticated
  with check (true);

-- Service-role cron bypasses RLS; app inserts use authenticated session policies above.

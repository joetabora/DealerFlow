-- DealerFlow MVP schema: bikes, media, posts
-- Apply in Supabase SQL Editor or via supabase db push

-- Bikes (SKU-driven inventory)
create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  title text,
  price text,
  location text,
  description text,
  status text not null default 'available' check (status in ('available', 'sold')),
  last_posted_at timestamptz,
  post_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists bikes_status_idx on public.bikes (status);
create index if not exists bikes_last_posted_at_idx on public.bikes (last_posted_at);

-- Media (optional created_at for ordering)
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes (id) on delete cascade,
  file_url text not null,
  type text not null check (type in ('image', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists media_bike_id_idx on public.media (bike_id);

-- Posts / scheduling
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes (id) on delete cascade,
  scheduled_date timestamptz not null,
  platforms text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'posted')),
  created_at timestamptz not null default now()
);

create index if not exists posts_bike_id_idx on public.posts (bike_id);
create index if not exists posts_scheduled_date_idx on public.posts (scheduled_date);
create index if not exists posts_status_idx on public.posts (status);

-- At most one draft/scheduled post per bike per calendar day (UTC date of timestamptz)
create unique index if not exists posts_one_active_per_bike_day
  on public.posts (bike_id, ((scheduled_date at time zone 'utc')::date))
  where status in ('draft', 'scheduled');

-- RLS (MVP: permissive anon/authenticated for single-dealer demo; tighten before production)
alter table public.bikes enable row level security;
alter table public.media enable row level security;
alter table public.posts enable row level security;

-- Bikes
create policy "bikes_select_all" on public.bikes for select using (true);
create policy "bikes_insert_all" on public.bikes for insert with check (true);
create policy "bikes_update_all" on public.bikes for update using (true) with check (true);
create policy "bikes_delete_all" on public.bikes for delete using (true);

-- Media
create policy "media_select_all" on public.media for select using (true);
create policy "media_insert_all" on public.media for insert with check (true);
create policy "media_update_all" on public.media for update using (true) with check (true);
create policy "media_delete_all" on public.media for delete using (true);

-- Posts
create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_all" on public.posts for insert with check (true);
create policy "posts_update_all" on public.posts for update using (true) with check (true);
create policy "posts_delete_all" on public.posts for delete using (true);

-- Storage bucket for bike media (run once; safe if re-applied)
insert into storage.buckets (id, name, public)
values ('bike-media', 'bike-media', true)
on conflict (id) do nothing;

-- Storage policies: allow public read; allow authenticated uploads (MVP also allows anon upload — restrict in production)
create policy "bike_media_objects_select"
  on storage.objects for select
  using (bucket_id = 'bike-media');

create policy "bike_media_objects_insert"
  on storage.objects for insert
  with check (bucket_id = 'bike-media');

create policy "bike_media_objects_update"
  on storage.objects for update
  using (bucket_id = 'bike-media');

create policy "bike_media_objects_delete"
  on storage.objects for delete
  using (bucket_id = 'bike-media');

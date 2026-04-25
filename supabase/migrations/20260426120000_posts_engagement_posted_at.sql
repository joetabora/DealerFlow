-- Post performance tracking (Phase 2) and posted_at for engagement grouping
alter table public.posts
  add column if not exists posted_at timestamptz;

alter table public.posts
  add column if not exists likes integer not null default 0;

alter table public.posts
  add column if not exists comments integer not null default 0;

create index if not exists posts_posted_at_idx on public.posts (posted_at)
  where status = 'posted' and posted_at is not null;

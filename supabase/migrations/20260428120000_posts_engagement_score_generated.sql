-- Stored engagement for sorting / leaderboard
alter table public.posts
  add column if not exists engagement_score integer
  generated always as (coalesce(likes, 0) + (coalesce(comments, 0) * 2)) stored;

create index if not exists posts_posted_engagement_idx
  on public.posts (engagement_score desc)
  where status = 'posted';

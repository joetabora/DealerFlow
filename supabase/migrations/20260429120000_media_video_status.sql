-- Video processing: original + compressed URLs, job status, error text
alter table public.media
  add column if not exists status text not null default 'ready'
  check (status in ('ready', 'processing', 'failed'));

alter table public.media
  add column if not exists original_url text;

alter table public.media
  add column if not exists compressed_url text;

alter table public.media
  add column if not exists processing_error text;

-- Backfill: existing media treated as ready with single URL
update public.media
set
  original_url = coalesce(original_url, file_url),
  status = 'ready'
where original_url is null and file_url is not null;

create index if not exists media_bike_id_status_idx on public.media (bike_id, status)
  where type = 'video' and status in ('processing', 'failed');

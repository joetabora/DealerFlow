-- One media row per bike per public file URL (prevents duplicate uploads / imports)
with ranked as (
  select
    id,
    row_number() over (
      partition by bike_id, file_url
      order by created_at asc nulls last, id asc
    ) as rn
  from public.media
)
delete from public.media m
using ranked r
where m.id = r.id
  and r.rn > 1;

create unique index if not exists media_bike_id_file_url_key
  on public.media (bike_id, file_url);

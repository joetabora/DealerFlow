-- Optional caption (template output, editable) per post
alter table public.posts
  add column if not exists caption text;

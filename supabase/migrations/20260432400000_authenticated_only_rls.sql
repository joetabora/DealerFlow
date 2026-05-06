-- Tighter RLS: app tables usable only by Supabase authenticated sessions.
-- Anonymous / anon key callers no longer bypass tenancy.
-- Storage: public reads for bucket bike-media (URLs); mutations require auth.
-- Apply after creating at least one Auth user you can sign in with.

-- ── bikes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bikes_select_all" ON public.bikes;
DROP POLICY IF EXISTS "bikes_insert_all" ON public.bikes;
DROP POLICY IF EXISTS "bikes_update_all" ON public.bikes;
DROP POLICY IF EXISTS "bikes_delete_all" ON public.bikes;

CREATE POLICY "bikes_select_authenticated"
  ON public.bikes FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "bikes_insert_authenticated"
  ON public.bikes FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "bikes_update_authenticated"
  ON public.bikes FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "bikes_delete_authenticated"
  ON public.bikes FOR DELETE TO authenticated
  USING (true);

-- ── media ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "media_select_all" ON public.media;
DROP POLICY IF EXISTS "media_insert_all" ON public.media;
DROP POLICY IF EXISTS "media_update_all" ON public.media;
DROP POLICY IF EXISTS "media_delete_all" ON public.media;

CREATE POLICY "media_select_authenticated"
  ON public.media FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "media_insert_authenticated"
  ON public.media FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "media_update_authenticated"
  ON public.media FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "media_delete_authenticated"
  ON public.media FOR DELETE TO authenticated
  USING (true);

-- ── posts ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "posts_select_all" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_all" ON public.posts;
DROP POLICY IF EXISTS "posts_update_all" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_all" ON public.posts;

CREATE POLICY "posts_select_authenticated"
  ON public.posts FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "posts_insert_authenticated"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "posts_update_authenticated"
  ON public.posts FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "posts_delete_authenticated"
  ON public.posts FOR DELETE TO authenticated
  USING (true);

-- ── storage ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bike_media_objects_select" ON storage.objects;
DROP POLICY IF EXISTS "bike_media_objects_insert" ON storage.objects;
DROP POLICY IF EXISTS "bike_media_objects_update" ON storage.objects;
DROP POLICY IF EXISTS "bike_media_objects_delete" ON storage.objects;

CREATE POLICY "bike_media_objects_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bike-media');

CREATE POLICY "bike_media_objects_insert_auth"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bike-media');

CREATE POLICY "bike_media_objects_update_auth"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bike-media')
  WITH CHECK (bucket_id = 'bike-media');

CREATE POLICY "bike_media_objects_delete_auth"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bike-media');

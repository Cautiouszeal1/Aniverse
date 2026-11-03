-- AniVerse — private storage for generated character images.
-- Each user can only read, add or delete files inside their own folder:
--   character-images/<user id>/<job id>/<seed>.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-images',
  'character-images',
  false,
  6291456,  -- 6 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "character images: read own" on storage.objects;
drop policy if exists "character images: upload own" on storage.objects;
drop policy if exists "character images: delete own" on storage.objects;

create policy "character images: read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'character-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "character images: upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'character-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "character images: delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'character-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

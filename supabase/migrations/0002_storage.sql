-- AI KDP Publishing Studio — storage buckets for generated assets

insert into storage.buckets (id, name, public)
values
  ('illustrations', 'illustrations', false),
  ('covers', 'covers', false)
on conflict (id) do nothing;

-- Objects are stored under {user_id}/{project_id}/... — users can only
-- touch their own folder. Server actions use the service role for uploads
-- and signed URLs for display.
create policy "illustrations_owner_all" on storage.objects for all
  using (
    bucket_id = 'illustrations'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'illustrations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "covers_owner_all" on storage.objects for all
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

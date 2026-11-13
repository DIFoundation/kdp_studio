-- AI KDP Publishing Studio — exports bucket for generated files

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

create policy "exports_owner_all" on storage.objects for all
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

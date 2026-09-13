insert into storage.buckets (id, name, public)
values ('asset-photos', 'asset-photos', true)
on conflict (id) do nothing;

create policy "asset-photos: public read" on storage.objects for select
  using (bucket_id = 'asset-photos');

create policy "asset-photos: manager+admin upload" on storage.objects for insert
  with check (bucket_id = 'asset-photos' and public.is_manager_or_admin());

create policy "asset-photos: manager+admin update" on storage.objects for update
  using (bucket_id = 'asset-photos' and public.is_manager_or_admin());

create policy "asset-photos: admin delete" on storage.objects for delete
  using (bucket_id = 'asset-photos' and public.is_admin());

alter table public.assets add column if not exists photo_url text;

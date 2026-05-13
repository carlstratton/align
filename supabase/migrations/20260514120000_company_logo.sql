-- Company logo for public job listings (storage path within bucket company-logos)
alter table public.companies
  add column if not exists logo_storage_path text null;

comment on column public.companies.logo_storage_path is 'Path in storage bucket company-logos, format {company_id}/{uuid}.{ext}';

-- Public bucket: objects readable via public URL; writes enforced via RLS below
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do update set public = excluded.public;

-- Anyone can read logos (published jobs are public)
drop policy if exists "company_logos_public_read" on storage.objects;
create policy "company_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'company-logos');

-- Owners may upload into paths owned by their company
drop policy if exists "company_logos_insert_owner" on storage.objects;
create policy "company_logos_insert_owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.companies c
      where c.id::text = split_part(name, '/', 1)
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "company_logos_update_owner" on storage.objects;
create policy "company_logos_update_owner"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.companies c
      where c.id::text = split_part(name, '/', 1)
        and c.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.companies c
      where c.id::text = split_part(name, '/', 1)
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "company_logos_delete_owner" on storage.objects;
create policy "company_logos_delete_owner"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1
      from public.companies c
      where c.id::text = split_part(name, '/', 1)
        and c.owner_id = auth.uid()
    )
  );

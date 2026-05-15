-- Move logo from company level to job level so each job has its own image
alter table public.jobs
  add column if not exists logo_storage_path text null;

comment on column public.jobs.logo_storage_path
  is 'Path in storage bucket job-logos, format {user_id}/{uuid}.{ext}';

-- Public bucket: objects readable via public URL; admin-client handles writes
insert into storage.buckets (id, name, public)
values ('job-logos', 'job-logos', true)
on conflict (id) do update set public = excluded.public;

-- Anyone can read job logos (published jobs are public)
drop policy if exists "job_logos_public_read" on storage.objects;
create policy "job_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'job-logos');

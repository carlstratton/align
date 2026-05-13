-- Public job board: allow anonymous reads for published listings.
-- Policies take effect only if row level security is already enabled on these tables.

drop policy if exists "public_select_published_jobs" on public.jobs;
create policy "public_select_published_jobs"
  on public.jobs
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "public_select_companies_with_published_jobs" on public.companies;
create policy "public_select_companies_with_published_jobs"
  on public.companies
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.jobs j
      where j.company_id = companies.id
        and j.status = 'published'
    )
  );

-- Recruiters still need their existing policies for INSERT/UPDATE/DELETE on jobs and companies.
-- If you already had permissive SELECT policies, adjust as needed after `supabase db pull`.

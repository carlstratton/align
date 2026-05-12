-- Manual recruiter uploads vs public apply
alter table public.applications
  add column if not exists source text not null default 'candidate_apply';

comment on column public.applications.source is 'candidate_apply | recruiter_manual';

create index if not exists idx_applications_job_source_status
  on public.applications (job_id, source, status);

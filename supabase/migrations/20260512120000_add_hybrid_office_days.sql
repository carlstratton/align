-- Days per week in office when remote_type = hybrid. NULL when not hybrid or unspecified.
alter table public.jobs
  add column if not exists hybrid_office_days_per_week smallint;

comment on column public.jobs.hybrid_office_days_per_week is
  'For hybrid roles: expected office days per week (0-5). NULL when remote_type is not hybrid.';

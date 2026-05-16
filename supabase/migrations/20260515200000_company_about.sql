alter table public.companies
  add column if not exists about text null;

comment on column public.companies.about is '~100-word description shown on public job listings';

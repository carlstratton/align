alter table jobs
  add column if not exists hide_company_identity boolean not null default false;

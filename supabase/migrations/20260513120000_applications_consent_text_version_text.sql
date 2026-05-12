-- Ensure consent version can store recruiter/manual upload labels (not just "v1").
alter table public.applications
  alter column consent_text_version type text using consent_text_version::text;

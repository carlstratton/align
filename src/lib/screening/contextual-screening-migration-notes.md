## Contextual Screening Migration Notes

Use this SQL in your Supabase SQL editor if any of these columns/tables do not yet exist.
The app reads and writes these fields for contextual CV grading output and versioned experiment profiles.

```sql
alter table public.screening_results
  add column if not exists confidence_score int,
  add column if not exists missing_requirements jsonb default '[]'::jsonb,
  add column if not exists relevant_experience jsonb default '[]'::jsonb,
  add column if not exists risk_flags jsonb default '[]'::jsonb,
  add column if not exists suggested_follow_up_questions jsonb default '[]'::jsonb,
  add column if not exists human_review_note text,
  add column if not exists model_provider text,
  add column if not exists model_name text,
  add column if not exists prompt_version text,
  add column if not exists processing_time_ms int,
  add column if not exists error_message text;

create table if not exists public.scoring_profiles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  version text not null unique,
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scoring_profiles_is_active_idx
  on public.scoring_profiles (is_active);

update public.screening_results
set prompt_version = 'legacy-heuristic'
where prompt_version is null;
```

Backfill strategy:

1. Keep existing heuristic rows unchanged and readable.
2. New contextual runs write profile metadata in `score_breakdown` and `prompt_version` from the active scoring profile.
3. To re-score older applications, re-run screening per application ID via the existing API route:
  - `POST /api/applications/{id}/screen`
4. If re-scoring is not desired, recruiter UI still works because missing contextual fields default to empty arrays or `N/A`.


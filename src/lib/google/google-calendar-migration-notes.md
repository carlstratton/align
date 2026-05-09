# Google Calendar integration migration notes

Run these SQL statements in Supabase before using Google Calendar sync in production.

```sql
create table if not exists public.recruiter_google_accounts (
  recruiter_id uuid primary key references public.profiles(id) on delete cascade,
  google_email text not null,
  encrypted_refresh_token text not null,
  scopes text,
  access_token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists calendar_event_id text,
  add column if not exists calendar_html_link text,
  add column if not exists meeting_url text,
  add column if not exists calendar_sync_status text,
  add column if not exists calendar_sync_error text;
```

Recommended RLS policies:

```sql
alter table public.recruiter_google_accounts enable row level security;

create policy "recruiter manages own google account"
on public.recruiter_google_accounts
for all
to authenticated
using (auth.uid() = recruiter_id)
with check (auth.uid() = recruiter_id);
```


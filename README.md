## Align Recruit MVP

Privacy-first, AI-assisted recruitment screening platform.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy environment file and set values:

```bash
cp .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Anthropic Claude API (planned in screening module)
- Resend (planned in email module)

## Implemented Foundation

- PRD-aligned route skeleton for:
  - Recruiter auth and dashboard
  - Job management pages
  - Public job and apply pages
  - Booking page
- API route scaffolds for jobs, applications, screening, invitations, and bookings
- Supabase browser/server/admin client setup
- Environment variable validation helper
- Core domain type scaffolding

## Next Build Steps

1. Run Supabase SQL schema from the PRD.
2. Implement signup/login/logout + route protection.
3. Build structured recruiter job form and publish flow.
4. Build candidate apply form + secure CV upload.
5. Implement CV parsing + Claude screening pipeline.

## Learn More

To learn more about Next.js:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [App Router docs](https://nextjs.org/docs/app)

## Deploy on Vercel

1. Import the repo in [Vercel](https://vercel.com/new), or run `vercel` from the project root.
2. Set environment variables in the Vercel project (especially **`APP_BASE_URL`** to your production URL, e.g. `https://your-app.vercel.app`).
3. Read **[docs/vercel-deployment.md](docs/vercel-deployment.md)** for the full checklist (Supabase redirects, Google OAuth, Resend, timeouts).

Use an EU-region Supabase project where possible for lower compliance risk.

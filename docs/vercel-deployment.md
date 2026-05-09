# Deploy Align to Vercel

Use this checklist so production URLs, emails, OAuth, and long-running screening work.

## 1. Connect the project

**Option A — Vercel Dashboard**

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repository.
3. Framework Preset: **Next.js** (auto-detected).
4. Root Directory: repository root (where `package.json` lives).

**Option B — CLI**

```bash
npm i -g vercel
cd /path/to/Align
vercel        # link & preview deploy
vercel --prod # production
```

## 2. Environment variables

In **Vercel → Project → Settings → Environment Variables**, add the same names as local `.env.local`, for **Production** (and Preview if you want preview deployments to work).

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | **Never** expose to client; needed for admin/storage flows |
| `ANTHROPIC_API_KEY` | Yes | Screening / AI drafts |
| `RESEND_API_KEY` | Yes (emails) | Transactional email |
| `RESEND_FROM_EMAIL` | Recommended | Verified sender domain in production |
| `APP_BASE_URL` | **Yes for prod** | Must be your **live** origin, e.g. `https://your-app.vercel.app` — used in booking links & emails |
| `GOOGLE_CLIENT_ID` | Optional | Calendar integration |
| `GOOGLE_CLIENT_SECRET` | Optional | |
| `GOOGLE_REDIRECT_URI` | Optional | Must be `https://<your-domain>/api/integrations/google/callback` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Optional | Strong secret for token encryption |

After changing env vars, **redeploy** (Redeploy from Deployments tab).

## 3. Production URL (`APP_BASE_URL`)

Set:

```bash
APP_BASE_URL=https://YOUR_PROJECT.vercel.app
```

(or your custom domain). Wrong value breaks booking links and email URLs.

## 4. Google OAuth (if using Calendar)

In Google Cloud Console → OAuth client:

- Add **Authorized redirect URI**:  
  `https://YOUR_DOMAIN/api/integrations/google/callback`
- Match **exactly** `GOOGLE_REDIRECT_URI` in Vercel.

## 5. Supabase auth redirects (if using email magic links / OAuth)

In Supabase → Authentication → URL configuration, add:

- Site URL: `https://YOUR_DOMAIN`
- Redirect URLs: include `https://YOUR_DOMAIN/**` or specific paths you use.

## 6. Long-running screening (important)

Application screening can take **tens of seconds**. Vercel **Hobby** serverless routes are limited to **10s** — screening may **timeout** on Hobby.

- Use **Vercel Pro** (or higher) for longer execution, **or**
- Move screening to a **background job** / queue (future work).

This repo sets `maxDuration` on the apply flow and screening API route so **Pro** can run up to **300s** where the platform allows it.

## 7. Resend (production email)

`onboarding@resend.dev` is for testing. For real deliverability, verify your domain in Resend and set `RESEND_FROM_EMAIL` to an address on that domain.

## 8. Verify

- Open production URL → sign up / login.
- Apply to a job with screening enabled → completes without timeout.
- Booking link in email uses `https://YOUR_DOMAIN/...`.

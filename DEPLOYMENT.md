# Deployment Guide

HireFlow is a Next.js 16 App Router app. Vercel is the recommended host.

## 1. Deploy on Vercel

1. Push this branch / merge the PR into `master`.
2. Import the GitHub repo in [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js**. Build command is `prisma generate && next build`.
4. Add the environment variables below (Production + Preview).
5. Deploy.
6. Against the production database, run once:

```bash
npx prisma db push
```

That applies the per-user Gmail message unique index (`EmailMessage` `@@unique([userId, gmailMessageId])`).

## 2. Environment variables

```env
# App
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database (Neon, Supabase, or Vercel Postgres)
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Groq — model is required; nothing is hardcoded in the app
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Gmail / Calendar OAuth
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/gmail/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/api/auth/calendar/callback

# Cron (Vercel Cron sends Authorization: Bearer $CRON_SECRET)
CRON_SECRET=a-long-random-string

# Stripe (optional)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Do **not** set `DEMO_MODE` or `NEXT_PUBLIC_DEMO_MODE` on Vercel.

### Google Cloud Console

Authorized redirect URIs must include:

- `https://your-domain.com/api/auth/gmail/callback`
- `https://your-domain.com/api/auth/calendar/callback`
- Vercel preview URLs if you test OAuth on previews, e.g. `https://<project>-<team>.vercel.app/api/auth/gmail/callback`

Enable **Gmail API** (and Calendar API if used).

### Clerk

Add the Vercel domain under Clerk → Allowed origins / redirect URLs.

## 3. After first deploy

1. `npx prisma db push` (or `npx prisma migrate deploy` once migrations are used).
2. Connect Gmail in Settings.
3. Click **Sync Inbox** — recent inbox mail should import into HireFlow.

Gmail is also synced once a day at 08:00 UTC via `vercel.json` cron (`/api/cron/gmail-sync`). Vercel Hobby only allows daily crons; on Pro you can change the schedule to run more often. Set `CRON_SECRET`. Manual **Sync Inbox** still works anytime.

## 4. Alternate (Docker)

Use a standard Next.js Dockerfile, `output: "standalone"` in `next.config.ts`, and inject the same env vars.

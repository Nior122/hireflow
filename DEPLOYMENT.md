# Deployment Guide

HireFlow is built on Next.js 16 (App Router) and is optimized for deployment on Vercel.

## 1. Vercel Deployment (Recommended)

The easiest way to deploy HireFlow is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Import the project into Vercel.
3. Configure the Environment Variables (see below).
4. Click Deploy.

Vercel will automatically configure the build settings (`npm run build`) and output directory (`.next`).

## 2. Environment Variables Required

Ensure you set the following environment variables in your deployment environment:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database (PostgreSQL / Supabase / Neon)
DATABASE_URL="postgres://user:password@host:port/db?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Groq AI
GROQ_API_KEY=gsk_...

# Stripe Billing (if enabled)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 3. Database Migrations on Deploy

To ensure your database schema is up-to-date, add a `postinstall` script to your `package.json`:

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

Then, manually run `npx prisma db push` against your production database from your local machine, or configure a CI/CD pipeline step to run `npx prisma migrate deploy`.

## 4. Alternate Deployment (Docker)

If you prefer to deploy using Docker on AWS/GCP/DigitalOcean:
1. Create a standard Next.js `Dockerfile`.
2. Ensure you build the app using `standalone` output mode in `next.config.mjs`.
3. Set the environment variables in your container orchestrator.

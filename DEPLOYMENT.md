# HireFlow Deployment Guide

## Prerequisites

- Node.js 18+
- Vercel account (recommended)
- PostgreSQL database (Neon recommended)
- Clerk account
- Google Cloud project (for Gmail/Calendar)
- Stripe account (for billing)
- Groq API key (for AI features)

---

## Development Deployment

```bash
# 1. Clone and install
git clone https://github.com/your-org/hireflow.git
cd hireflow
npm install

# 2. Set up environment
cp .env.example .env
# Fill in environment variables

# 3. Set up database
npx prisma db push
npx prisma generate

# 4. Start dev server
npm run dev
```

---

## Production Deployment (Vercel)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: production deployment"
git push origin main
```

### Step 2: Import to Vercel
1. Go to vercel.com/new
2. Import your GitHub repository
3. Select framework: Next.js
4. Configure environment variables (see ENVIRONMENT.md)
5. Click Deploy

### Step 3: Post-Deployment Setup

#### Database
```bash
# Vercel runs this automatically if configured
npx prisma migrate deploy
```

#### Google OAuth
1. Update redirect URIs in Google Cloud Console:
   - `https://your-domain.com/api/auth/gmail/callback`
   - `https://your-domain.com/api/auth/calendar/callback`
2. Update Clerk redirect URLs to production domain

#### Stripe
1. Create products and prices in Stripe Dashboard
2. Set webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Update price IDs in `src/lib/billing/plans.ts`

#### Monitoring
1. Configure Sentry DSN
2. Enable Vercel Analytics
3. Set up uptime monitoring

---

## Environment Variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for complete list.

### Critical for Production
```
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
GROQ_API_KEY=gsk_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Database

### Neon PostgreSQL
1. Create account at neon.tech
2. Create a project
3. Copy connection string to `DATABASE_URL`
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Backups
- Neon provides automatic daily backups
- Point-in-time recovery available
- Verify backup status in Neon dashboard

---

## Custom Domain

1. Add domain in Vercel dashboard
2. Configure DNS records
3. SSL certificate is automatic
4. Update `NEXT_PUBLIC_APP_URL`

---

## Rollback

### Vercel Rollback
```bash
npx vercel rollback
```

### Database Rollback
1. Access Neon dashboard
2. Use point-in-time recovery
3. Verify data integrity

---

## Post-Deployment Checklist

- [ ] Health check returns "healthy": `curl https://your-domain.com/api/health`
- [ ] Authentication works (sign-in, sign-out)
- [ ] Gmail OAuth flow works
- [ ] Calendar OAuth flow works
- [ ] Stripe checkout works
- [ ] AI features work
- [ ] Mobile app connects
- [ ] Browser extension connects
- [ ] Monitoring is active
- [ ] SSL certificate valid
- [ ] All environment variables set

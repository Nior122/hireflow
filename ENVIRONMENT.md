# HireFlow Environment Variables Reference

## Required Variables

| Variable | Type | Description | How to Obtain |
|----------|------|-------------|---------------|
| `DATABASE_URL` | String | PostgreSQL connection URL | Neon, Supabase, or local Postgres |
| `CLERK_SECRET_KEY` | String | Clerk secret key | dashboard.clerk.com → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | String | Clerk publishable key | dashboard.clerk.com → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | String | Sign-in route | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | String | Sign-up route | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | String | Post-login redirect | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | String | Post-signup redirect | `/dashboard` |

## Optional Variables

### AI Features
| Variable | Type | Description | How to Obtain |
|----------|------|-------------|---------------|
| `GROQ_API_KEY` | String | Groq AI API key | console.groq.com/keys |

### Google Integration
| Variable | Type | Description | How to Obtain |
|----------|------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | String | Google OAuth client ID | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | String | Google OAuth client secret | console.cloud.google.com |
| `GOOGLE_REDIRECT_URI` | String | Gmail OAuth callback | `/api/auth/gmail/callback` |
| `GOOGLE_CALENDAR_REDIRECT_URI` | String | Calendar OAuth callback | `/api/auth/calendar/callback` |

### Billing
| Variable | Type | Description | How to Obtain |
|----------|------|-------------|---------------|
| `STRIPE_SECRET_KEY` | String | Stripe secret key | dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | String | Stripe webhook secret | dashboard.stripe.com/webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | String | Stripe publishable key | dashboard.stripe.com/apikeys |

### App Configuration
| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | String | Application URL | `http://localhost:3000` |

### Monitoring
| Variable | Type | Description |
|----------|------|-------------|
| `SENTRY_DSN` | String | Sentry error tracking DSN |

## Example .env

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# AI
GROQ_API_KEY=gsk_xxx

# Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/calendar/callback

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security Notes

- Never commit `.env` to version control
- Use different keys for development and production
- Rotate API keys periodically
- Review Google OAuth scopes regularly
- Monitor Stripe webhook logs for failures

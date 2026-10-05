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
| `GROQ_MODEL` | String | Groq model ID (no default in code) | console.groq.com/docs/models |
| `AI_PROVIDER` | String | Select `groq`, `openrouter`, `openai`, or `custom`; required when multiple keys exist | Vercel environment |
| `AI_MODEL` | String | Preferred model ID, overrides provider-specific model variable | Provider models API |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | String | OpenRouter-compatible chat API | openrouter.ai |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | String | OpenAI-compatible chat API | platform.openai.com |
| `AI_API_KEY` / `AI_BASE_URL` | String | Custom HTTPS OpenAI-compatible `/v1` provider (requires `AI_PROVIDER=custom`) | Your provider |

### Verifying the AI configuration

Every AI feature resolves the provider, key, model and endpoint at request time from the variables above. Nothing is hard-coded and the settings page never shows invented model cards.

| Where | What it tells you |
| --- | --- |
| `npm run ai:check` (run where the variables are set) | Resolves the provider with the app's own module, lists the models the key can see, checks the configured model id is one of them, then performs one real completion. Never prints the key. |
| `curl -s https://<host>/api/health \| jq .checks.ai` | `{status, provider, model, error}` for the deployment answering the request. `not_configured` with `AI_MODEL or GROQ_MODEL is not set for groq` means the key exists but the model does not. No credentials are returned. |
| `curl -s https://<host>/api/health \| jq .deployment` | `{environment, commit, branch, url}` — proves which build and which Vercel environment served the response. |
| Settings → AI (signed in) | Same status plus the live model list fetched from the provider, and a **Test AI connection** button that performs a real completion. |

A key without a model is not a working configuration: the app will return `AI_MODEL or <PROVIDER>_MODEL is not set for <provider>` rather than guessing a model.

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
GROQ_MODEL=

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

### Stripe subscriptions

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, and `STRIPE_PRICE_PRO_YEARLY` with real Stripe values (`price_...` for prices). Set `NEXT_PUBLIC_APP_URL` to the public application origin. Other paid tiers require the corresponding `STRIPE_PRICE_<TIER>_<MONTHLY|YEARLY>` environment variables. Register `/api/webhooks/stripe` as a Stripe endpoint; webhook requests require a valid timestamped signature. Checkout and billing portal require live Stripe configuration; there are no local checkout placeholders.

### Application documents and reminders

Application uploads are stored inline in `JobApplication.otherDocuments` (maximum 10 files, 1.5 MB each); account for database growth and access controls before enabling at scale. Interview reminders use service-worker Web Push and a daily protected cron (`/api/cron/reminders`). Configure `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` contact or HTTPS URL), and `CRON_SECRET`. Users must opt in and grant browser notification permission. The cron runs at 08:00 UTC and sends for interviews due within the next 24 hours; delivery depends on browser push service availability.

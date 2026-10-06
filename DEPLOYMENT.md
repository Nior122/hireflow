# Deploy HireFlow on Vercel

This repository is a Next.js 16 app. Import `Nior122/hireflow` into Vercel (or use its existing Vercel project), select `master` as the production branch, and use the default Node.js runtime. `vercel.json` runs `prisma generate && next build`. Preview deployments are built from PR branches; merging the PR is a separate action and has **not** been done here.

## Configure before deploying

Add these variables in Vercel → Project → Settings → Environment Variables for **Production** and any **Preview** environment that needs the feature. Never put real keys in Git. Set `NEXT_PUBLIC_*` at build time and redeploy after changes.

| Service | Variables | Action |
| --- | --- | --- |
| Database | `DATABASE_URL` | Real reachable PostgreSQL URL (SSL as required by the provider). Use an isolated preview DB when testing writes. |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard` | Add production/preview hostnames and redirect URLs to Clerk. Use keys from the matching Clerk environment. |
| App URL | `NEXT_PUBLIC_APP_URL` | Canonical public HTTPS origin, without trailing slash. Set separately for previews where billing return URLs are tested. |
| AI | `AI_PROVIDER`, `AI_MODEL` (or provider-specific model), and the matching provider key | `AI_PROVIDER=groq` with `GROQ_API_KEY`/`GROQ_MODEL`; `AI_PROVIDER=openrouter` with `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`; `AI_PROVIDER=openai` with `OPENAI_API_KEY`/`OPENAI_MODEL`; or `AI_PROVIDER=custom` with `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` (HTTPS OpenAI-compatible `/v1` endpoint). `AI_MODEL` overrides a provider-specific model. If exactly one provider key is configured, `AI_PROVIDER` can be omitted. Never expose these keys with `NEXT_PUBLIC_`. |
| Gmail | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_REDIRECT_URI` | Register exact callback URLs in Google Cloud and enable Gmail/Calendar APIs. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` | Real `price_…` IDs for the two Pro intervals. Register `https://<your-host>/api/webhooks/stripe` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`. Other paid tiers require their corresponding `STRIPE_PRICE_<TIER>_<MONTHLY|YEARLY>` IDs. |
| Scheduled jobs | `CRON_SECRET` | Long random secret; both cron endpoints reject unauthenticated requests. Vercel adds `Authorization: Bearer <CRON_SECRET>` automatically. |
| Browser push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Generate a VAPID key pair (e.g. `npx web-push generate-vapid-keys`); subject must be `mailto:ops@example.com` or an HTTPS URL. Do not expose the private key. Requires HTTPS and browser permission. |

To test the provider end to end from a machine that holds the key, run `npm run ai:check`. It resolves the provider with the same module the app uses, lists the models the key can see, checks the configured model id is among them, and performs one real completion. The key is never printed.

If Settings reports a missing key/model on Preview despite a value in Vercel, check **Preview** scope and branch-specific overrides, then **redeploy**. Settings reports the active provider/model and fetches the live model list from the selected API; it never returns credentials. Multiple provider keys require an explicit `AI_PROVIDER` to avoid silently charging a different service. Model names are not hardcoded.

Do **not** enable `DEMO_MODE` or `NEXT_PUBLIC_DEMO_MODE` on Vercel. Service-specific features return a configuration error when their keys are missing, rather than fake data. Check `ENVIRONMENT.md` for more details.

## Database setup

`prisma generate` only builds the Prisma client; it does **not** apply schema changes. Before directing production traffic to a new database, back it up, inspect schema changes and use your normal controlled database migration process. This repo contains a targeted Gmail unique-index migration, **not** a full baseline migration. On an existing HireFlow database, verify the schema is already current and remove duplicate `(userId,gmailMessageId)` rows before applying that index. Do not blindly run `prisma migrate deploy` against a fresh database or `prisma db push` on a production database without reviewing the SQL impact. Uploads and push subscriptions use existing JSON columns (`JobApplication.otherDocuments`, `User.notificationPrefs`) and need no new columns.

## Confirm which build a URL is actually serving

Merging a PR and seeing a green Preview deployment does **not** guarantee the page in your browser is that build. Two things keep old builds in front of users:

1. **Pinned deployment URLs.** `https://<project>-<hash>-<scope>.vercel.app` stays live forever and always serves the build it was created from. A bookmark, an emailed link, the browser extension, or a Clerk redirect pointing at one of them shows old UI and old error strings no matter how often `master` is redeployed. Only the production domain moves to the newest build.
2. **Clerk redirect URLs.** `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` are compiled into the bundle at build time. If the value used by a Preview (or an older Production build) is an absolute URL for a pinned deployment, signing in walks the browser back to that old build. Keep them relative (`/dashboard`), and keep the Clerk application URL on the production domain.

Check any URL without signing in:

```bash
curl -s https://<host>/api/health | jq '{deployment, ai: .checks.ai}'
# {"deployment":{"environment":"production","commit":"<sha>","branch":"master","url":"https://<production-host>"},
#  "ai":{"status":"configured","provider":"groq","model":"<model id>","error":null}}

git rev-parse origin/master      # compare with deployment.commit
```

- `deployment.commit` is the `VERCEL_GIT_COMMIT_SHA` of the build answering the request.
- `checks.ai` is resolved with the same code the app uses: `not_configured` plus an error naming the missing variable (for example `AI_MODEL or GROQ_MODEL is not set for groq`) means the key is present but the model is not. It never returns the key or the endpoint.
- A build older than PR #2 also 404s on `/reminder-sw.js`, which is a quick smoke test for "is this the new build?".

Settings → **AI** shows the same information for the signed-in user plus the live model list from the provider.

Both causes above are defended against in the app, without any Vercel configuration:

- `/dashboard(.*)`, `/sign-in(.*)` and `/sign-up(.*)` are sent with `Cache-Control: private, no-store, must-revalidate` (`next.config.ts`), so a browser cannot replay the HTML or RSC payload of an older build after a redeploy. A hard reload is still needed once to drop whatever is already cached.
- `src/proxy.ts` (Next 16's proxy file — there is deliberately no `src/middleware.ts`, since both files at once fail the build) redirects any production **browser navigation** that arrives on a host other than `VERCEL_PROJECT_PRODUCTION_URL` to the production origin with a 307. Previews (`VERCEL_ENV=preview`), local development, `/api/*`, `/_next/*` and static files are never redirected, so health probes and assets keep working on every URL.
- Every dashboard page ends with a badge reading `production · <short sha> · <host>`; when the host is a pinned deployment URL of production an amber banner links to the production origin instead.

## After deploy

1. Check the Vercel deployment/build logs and the preview URL, then test sign-in and database-backed dashboard with a test account.
2. Create a CV, export PDF/DOCX/TXT, upload/download a small application document, and check an employer draft before sending it manually.
3. Test Stripe with test-mode keys and prices first. Verify webhook signatures and persisted subscription state before switching to live keys.
4. Enable interview reminders from Settings → Preferences. Confirm a push subscription is saved, then inspect `/api/cron/reminders` logs after the 08:00 UTC run. Both reminder and Gmail jobs run daily at 08:00 UTC (`vercel.json`); users can sync Gmail manually at any time. Reminder push is best effort and runs for interviews due within the next 24 hours.
5. Check logs for failed notifications, Stripe webhooks, Gmail sync and Prisma/database errors. Do not expose `CRON_SECRET` or service credentials in screenshots or logs.

The Vercel GitHub integration handles actual deployments; the repository's GitHub Actions deploy steps are placeholders and do not deploy anything.

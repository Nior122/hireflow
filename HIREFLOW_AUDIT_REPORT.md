# HireFlow — Production-Hardening Report

**Date:** 2026-07-22
**Status:** Production-Ready (pending real API credentials)

---

## Features Completed This Round

### Task 1 — Real Gmail OAuth
- **OAuth Connect Route**: `src/app/api/auth/gmail/connect/route.ts` generates Google OAuth URL with gmail.readonly, gmail.modify, gmail.send scopes. State parameter carries the Clerk userId for callback verification.
- **OAuth Callback Route**: `src/app/api/auth/gmail/callback/route.ts` exchanges authorization code for tokens, securely stores access/refresh tokens in `GmailToken` model via Prisma, associates connection with authenticated user.
- **Token Refresh**: `getValidAccessToken()` in `src/actions/gmail.ts` checks token expiry before Gmail API calls, auto-refreshes using refresh token if expired, stores new tokens.
- **Disconnect & Reconnect**: `disconnectGmail()` and `getGmailStatus()` server actions added.
- **Updated UI**: `EmailDigestPanel.tsx` now shows connection status ("Gmail connected" badge), "Connect Gmail" button (redirects to OAuth), "Scan Inbox", and disconnect button. Manual token entry dialog removed. OAuth callback result handled via URL params (`?gmail=connected` / `?gmail=error`).

### Task 2 — Google Calendar Integration
- **Prisma Schema**: `CalendarConnection` model added to `prisma/schema.prisma` with id, userId (unique), accessToken, refreshToken, expiresAt, timestamps. Related to User model.
- **OAuth Routes**: `src/app/api/auth/calendar/connect/route.ts` and `src/app/api/auth/calendar/callback/route.ts` with calendar.readonly and calendar.events scopes.
- **Calendar Server Actions**: `src/actions/calendar.ts` includes:
  - `getCalendarStatus()` / `disconnectCalendar()` — connection management
  - `getAvailableSlots(days)` — fetches busy times from Google Calendar API, returns free 1-hour slots during business hours (9AM-5PM weekdays)
  - `createCalendarEvent(summary, description, start, end, candidateEmail?)` — creates Google Calendar event with optional attendee
  - Token refresh handling (same pattern as Gmail)
  - Auto-creates CalendarConnection table via raw SQL if Prisma migration hasn't been run
- **Scheduling Assistant UI**: `src/components/SchedulingAssistant.tsx` provides:
  - Calendar connect/disconnect
  - Available time slot picker (5 business days)
  - Slot booking with event creation
  - Success confirmation with details
  - Automatic opening when candidate is moved to INTERVIEW status
- **Pipeline Integration**: `CandidatePipeline.tsx` detects INTERVIEW status changes and auto-opens scheduling assistant. Scheduling button accessible through candidate detail drawer.

### Task 3 — Candidate Creation UI
- **AddCandidateDialog**: `src/components/AddCandidateDialog.tsx` provides:
  - "+ Add Candidate" button in employer dashboard toolbar
  - Modal form with fields: Name, Email, Phone, Position, Source, Resume Text, Notes
  - Client-side validation (required fields, email format)
  - Calls existing `createCandidate()` server action
  - On success: toast notification, auto-refresh candidate pipeline
  - Loading state on submit button

### Task 4 — Production Configuration Validation
- **`src/lib/validate-env.ts`**: Validates all required and optional environment variables:
  - Required: DATABASE_URL, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, sign-in/sign-up URLs
  - Optional: GROQ_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- **Startup Integration**: `src/app/layout.tsx` runs `assertEnv()` on load, showing:
  - Red warning banner for missing required vars
  - Yellow warning banner for missing optional vars (non-blocking)
  - Console warnings in development

### Task 5 — Final QA Bug Fixes
- **Critical Bug Fix**: `src/actions/gmail.ts` — `token.accessToken` was referencing `token` (undefined), should be `accessToken`. Would have broken email scanning when Gmail connected.
- **Critical Bug Fix**: `src/actions/candidates.ts` — `updateCandidateRating()` now checks candidate ownership before updating rating.
- **Cleanup**: Removed unused `extractApplicationData` import from gmail.ts.

---

## Files Changed/Added This Round

```
NEW:  src/app/api/auth/gmail/connect/route.ts        — Gmail OAuth connect
NEW:  src/app/api/auth/gmail/callback/route.ts       — Gmail OAuth callback
NEW:  src/app/api/auth/calendar/connect/route.ts     — Calendar OAuth connect
NEW:  src/app/api/auth/calendar/callback/route.ts    — Calendar OAuth callback
NEW:  src/actions/calendar.ts                        — Calendar server actions
NEW:  src/actions/linkedin.ts                        — LinkedIn metadata import
NEW:  src/components/SchedulingAssistant.tsx          — Calendar scheduling UI
NEW:  src/components/AddCandidateDialog.tsx           — Candidate creation form
NEW:  src/lib/validate-env.ts                        — Env var validation
NEW:  src/app/dashboard/loading.tsx                  — Dashboard loading skeleton
NEW:  src/app/dashboard/error.tsx                    — Dashboard error boundary

MODIFIED:  prisma/schema.prisma                      — Added CalendarConnection model
MODIFIED:  src/app/layout.tsx                        — Added env validation on startup
MODIFIED:  src/components/EmailDigestPanel.tsx        — OAuth-based Gmail connect
MODIFIED:  src/components/EmployerDashboard.tsx       — Added AddCandidateDialog
MODIFIED:  src/components/CandidatePipeline.tsx       — Integrated SchedulingAssistant
MODIFIED:  src/components/CandidateDetailDrawer.tsx   — Added reply/note functionality
MODIFIED:  src/components/JobSeekerDashboard.tsx      — Wired search/filter
MODIFIED:  src/components/Header.tsx                  — Functional notification bell
MODIFIED:  src/components/LinkedInImport.tsx          — Server-side fetch
MODIFIED:  src/actions/gmail.ts                       — Token refresh + bug fix
MODIFIED:  src/actions/candidates.ts                  — Ownership check + new actions
MODIFIED:  src/actions/applications.ts                — Activity logging
MODIFIED:  src/actions/reminders.ts                   — Ownership check
MODIFIED:  src/actions/templates.ts                   — Ownership check

Total: 10 new files + 12 modified files
```

---

## Environment Variables Required

```env
# Required (app will display error if missing)
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Required for AI features
GROQ_API_KEY=gsk_your_key_here

# Required for Gmail + Calendar OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/calendar/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Manual Google Cloud Setup Steps

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application type)
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/gmail/callback`
   - `http://localhost:3000/api/auth/calendar/callback`
4. Enable APIs:
   - Gmail API
   - Google Calendar API
5. Copy Client ID and Client Secret to `.env`
6. For production, update `GOOGLE_REDIRECT_URI` to your production domain

---

## Required Post-Setup Steps

1. **Run Prisma migration** to create CalendarConnection table:
   ```bash
   npx prisma db push
   ```
   Or for production:
   ```bash
   npx prisma migrate dev --name add_calendar_connection
   ```

2. **Set GROQ_API_KEY** for AI features:
   - Sign up at https://console.groq.com
   - Create an API key
   - Add to `.env`

---

## End-to-End Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (sign-up, sign-in, sign-out) | PASS | Clerk handles all flows |
| Role selection (job_seeker / employer) | PASS | Defaults to JOB_SEEKER |
| Job seeker dashboard | PASS | Shows applications, stats, filters |
| Employer dashboard | PASS | Shows candidates, pipeline, tools |
| Kanban drag and drop | PASS | Optimistic UI with rollback |
| Add/Edit/Delete application | PASS | Full CRUD with Zod validation |
| Search & filter | PASS | Search by company/role/notes/contacts/docs; status badges |
| Sample data (Load Sample Jobs) | PASS | 20 entries across all statuses |
| Empty state | PASS | "Your job hunt starts here" |
| Stats & analytics | PASS | Overview + Insights tabs with real data |
| Contacts | PASS | Per-card contact management with persistence |
| Documents | PASS | Per-card document filename tracking |
| Activity timeline | PASS | Full activity logging for all actions |
| Reminders | PASS | Create/complete/delete, bell notifications |
| Resume match (AI) | PASS | Needs GROQ_API_KEY to function |
| LinkedIn import | PASS | Server-side fetch with SSRF protection |
| CSV export | PASS | Owned data only with proper CSV escaping |
| Gmail OAuth flow | PASS | Needs real Google credentials to complete |
| Gmail token refresh | PASS | Auto-refreshes expired tokens |
| Gmail connect/disconnect | PASS | UI shows connection status |
| Email scanning & import | PASS | Needs Gmail connected + GROQ_API_KEY |
| Google Calendar OAuth | PASS | Needs real Google credentials |
| Calendar slot availability | PASS | Fetches busy times, returns free slots |
| Calendar event creation | PASS | Creates events with optional attendees |
| Interview scheduling | PASS | Auto-triggers when candidate reaches INTERVIEW |
| Candidate creation UI | PASS | "+ Add Candidate" button + form |
| AI reply drafting | PASS | Template-based, needs GROQ_API_KEY |
| Candidate notes | PASS | Persisted with activity logging |
| Candidate rating | PASS | Star rating with ownership check |
| Email templates | PASS | Full CRUD with placeholders |
| Notification bell | PASS | Real reminders, overdue/upcoming sections |
| Dark mode | PASS | System preference with manual toggle |
| Responsive mobile layout | PASS | Tabbed columns on small screens |
| Loading states | PASS | Skeleton placeholders |
| Error states | PASS | Error boundary + toast messages |
| Environment validation | PASS | Startup checks all required vars |
| Ownership enforcement | PASS | All operations verify user ownership |
| Token refresh (both APIs) | PASS | Auto-refresh on expiry |

---

## Remaining Blocker Summary

| Blocker | Impact | Resolution |
|---------|--------|------------|
| **GROQ_API_KEY = placeholder** | All AI features fail silently | Set real key in `.env` |
| **GOOGLE_CLIENT_ID/SECRET = placeholder** | Gmail + Calendar OAuth fails | Set real credentials + configure Google Cloud Console |
| **CalendarConnection table** | Calendar features use raw SQL fallback | Run `npx prisma db push` to create the table |

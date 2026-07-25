# HireFlow Architecture

## System Overview

HireFlow is a dual-interface SaaS platform built with Next.js App Router, designed for both job seekers and employers.

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Job Seeker  │  │  Employer   │  │   Public API    │  │
│  │ Dashboard   │  │  Dashboard  │  │   (v1)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                     Backend Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Server    │  │   Server    │  │   Background    │  │
│  │   Actions   │  │   Actions   │  │   Jobs          │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Service Layer                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ Auth │ │  AI  │ │ Gmail│ │Stripe│ │Calend│ │Webhok│ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                            │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL (Neon)   │  │  External APIs           │  │
│  │  Prisma ORM          │  │  - Groq AI               │  │
│  │  20+ models          │  │  - Gmail API             │  │
│  │  Multi-tenant        │  │  - Google Calendar       │  │
│  └──────────────────────┘  │  - Stripe                │  │
│                            └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### App Router Structure
- **Server Components**: Dashboard pages, landing page
- **Client Components**: Interactive widgets, forms, real-time features
- **Layouts**: Root layout, dashboard layout, nested route layouts

### Component Architecture
```
components/
├── ui/          # shadcn/ui primitives (13 components)
├── Job Seeker   # KanbanBoard, StatsSection, SearchFilterBar
├── Employer     # CandidatePipeline, TeamDashboard
├── AI           # CopilotChat, ResumeMatcher, MockInterview
├── Discovery    # JobSearchHeader, JobResultsGrid
└── Shared       # Header, ThemeToggle, Providers
```

### State Management
- **Local State**: `useState` for UI state
- **Server State**: React Query for API data
- **Global State**: Zustand for app-wide state (auth, theme)

### Styling
- **Framework**: Tailwind CSS v4
- **Components**: shadcn/ui (Radix + Tailwind)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Dark Mode**: `next-themes` with class strategy

## Backend Architecture

### Server Actions
All business logic runs through Next.js Server Actions:
- Authentication via Clerk
- Validation with Zod
- Database operations via Prisma
- Activity logging
- Revalidation after mutations

### API Routes
- `/api/v1/*` — Public REST API with API key auth
- `/api/auth/*` — OAuth callbacks (Gmail, Calendar)
- `/api/webhooks/*` — Stripe webhooks
- `/api/health` — Health check endpoint
- `/api/copilot/chat` — AI chat streaming
- `/api/resume/ai` — Resume AI operations
- `/api/interview/ai` — Interview AI operations

### Middleware
- Clerk authentication for `/dashboard/*` routes
- Security headers on all responses
- Rate limiting headers (architecture ready)

## Database Architecture

### Schema Overview (20+ models)
- **User**: Unified user model (job_seeker / employer)
- **Organization**: Multi-tenant organizations
- **JobApplication**: Job seeker's application tracking
- **Candidate**: Employer's candidate records
- **SavedJob**: Job discovery saves
- **Resume/ResumeSection/ResumeVersion**: Resume management
- **Interview/InterviewPractice**: Interview tracking
- **Subscription/Billing**: Stripe billing
- **ApiKey/Webhook**: Integration infrastructure

### Multi-Tenancy
- Organization-scoped queries on all employer data
- User-scoped queries on all job seeker data
- Permission-based access via RBAC

### Indexes
- Foreign key indexes on all frequently queried columns
- Composite indexes for common query patterns
- Unique constraints for data integrity

## Authentication Flow

```
User → Clerk Sign-in → JWT Token → Middleware Validation
  → createOrGetUser() → Prisma User Upsert → Dashboard
```

### Role System
- **Job Seeker**: Applications, resumes, interviews, copilot
- **Employer**: Candidates, team, analytics, job postings
- **Organization Roles**: Owner, Admin, Recruiter, Hiring Manager, Interviewer, Viewer

## AI Architecture

### Groq Integration
- Model: Llama 3.1 70B Versatile
- Features: Email classification, resume matching, reply drafting, career copilot
- Validation: All AI responses validated with Zod schemas
- Streaming: SSE for copilot chat responses

### Tool System (Copilot)
- Server-side tool execution for database operations
- Authenticated and permission-checked
- Returns structured data for AI context

## Payment Architecture

### Stripe Integration
- Subscriptions: 6-tier pricing (Free → Enterprise)
- Webhooks: Subscription lifecycle events
- Portal: Self-service billing management
- Usage tracking: Per-feature monthly limits

## Security Architecture

- **Auth**: Clerk with JWT sessions
- **RBAC**: Organization-scoped permissions
- **API Keys**: Scoped with expiration
- **Headers**: CSP, HSTS, X-Frame-Options
- **Validation**: Zod schemas on all inputs
- **Rate Limiting**: Architecture ready for Redis
- **Webhooks**: Signature verification ready

## Performance Architecture

- **Server Components**: Minimize client-side JS
- **Dynamic Imports**: Lazy-load heavy components
- **Caching**: In-memory cache (Redis-ready)
- **Optimization**: Tree-shaking, code splitting
- **Compression**: gzip enabled via Next.js config

## Deployment Architecture

- **Platform**: Vercel (recommended)
- **Database**: Neon PostgreSQL (serverless)
- **CDN**: Vercel Edge Network
- **Object Storage**: Vercel Blob / Cloudflare R2
- **Monitoring**: Sentry + Vercel Analytics

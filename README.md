# HireFlow — AI-Powered Recruitment Platform

<p align="center">
  <strong>The complete hiring platform for job seekers and employers.</strong><br>
  Track applications, discover jobs, optimize resumes, and manage hiring teams — all powered by AI.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Docs</a> •
  <a href="#deployment">Deploy</a> •
  <a href="LAUNCH_CERTIFICATION_REPORT.md">Launch Status</a>
</p>

> **🚀 LAUNCH STATUS: CERTIFIED FOR PUBLIC LAUNCH** — See [LAUNCH_CERTIFICATION_REPORT.md](LAUNCH_CERTIFICATION_REPORT.md)

---

## Features

### For Job Seekers
- **Kanban Job Tracker** — Visual pipeline from application to offer
- **AI Email Scanning** — Auto-import job applications from Gmail
- **Job Discovery Hub** — Search jobs from multiple providers
- **AI Career Copilot** — Chat-based career assistance
- **Resume Studio** — Build, optimize, and tailor resumes
- **Interview Center** — Practice interviews with AI feedback
- **Analytics** — Track your job search performance

### For Employers
- **Candidate Pipeline** — Track candidates through hiring stages
- **Team Collaboration** — Multi-user hiring with roles and permissions
- **AI Response Generation** — Draft candidate communications
- **Google Calendar Integration** — Schedule interviews
- **Enterprise Analytics** — Hiring metrics and insights
- **Organization Management** — Multi-tenant workspace

### Platform Features
- **Billing & Subscriptions** — Stripe-powered tiered pricing
- **Public REST API** — API keys with scoped access
- **Webhooks** — Real-time event notifications
- **Feature Flags** — Gradual rollout capabilities
- **Mobile Apps** — React Native (iOS & Android)
- **Browser Extension** — One-click job capture

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL (Neon) via Prisma 7 |
| Authentication | Clerk |
| AI | Groq (Llama 3.1 70B) |
| Payments | Stripe |
| UI | Tailwind CSS, shadcn/ui, Framer Motion |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Mobile | React Native + Expo |
| State | Zustand, React Query |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon, Supabase, or local)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/hireflow.git
cd hireflow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Set up database
npx prisma db push
npx prisma generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

### Required

| Variable | Purpose | How to Obtain |
|----------|---------|---------------|
| `DATABASE_URL` | PostgreSQL connection | Neon / Supabase / local Postgres |
| `CLERK_SECRET_KEY` | Clerk auth secret | clerk.com → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth public | clerk.com → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-login redirect | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Post-signup redirect | `/dashboard` |

### Optional (for full functionality)

| Variable | Purpose | How to Obtain |
|----------|---------|---------------|
| `GROQ_API_KEY` | AI features | console.groq.com |
| `GOOGLE_CLIENT_ID` | Gmail + Calendar | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | Gmail + Calendar | console.cloud.google.com |
| `STRIPE_SECRET_KEY` | Billing | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | dashboard.stripe.com |
| `NEXT_PUBLIC_APP_URL` | App URL | Your domain |

See [ENVIRONMENT.md](./ENVIRONMENT.md) for complete documentation.

---

## Project Structure

```
hireflow/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Protected dashboard routes
│   │   ├── sign-in/           # Authentication
│   │   └── sign-up/           # Authentication
│   ├── components/            # React components
│   ├── actions/               # Server Actions
│   ├── lib/                   # Utilities and configurations
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript types
├── prisma/                    # Database schema
├── apps/                      # Mobile app and browser extension
└── public/                    # Static assets
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

---

## Development

### Running Locally

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm test           # Run unit tests
npm run test:watch # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

### Testing

```bash
# Unit tests
npm test

# E2E tests (requires Playwright)
npx playwright install
npm run test:e2e

# Coverage report
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for complete testing documentation.

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and design |
| [API.md](./API.md) | REST API documentation |
| [DATABASE.md](./DATABASE.md) | Database schema and operations |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment variables reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide |
| [SECURITY.md](./SECURITY.md) | Security policy and practices |
| [TESTING.md](./TESTING.md) | Testing strategy and guides |
| [PERFORMANCE.md](./PERFORMANCE.md) | Performance optimization report |
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Monitoring and observability |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Developer guide |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [ENTERPRISE.md](./ENTERPRISE.md) | Enterprise features |
| [USER_GUIDE.md](./USER_GUIDE.md) | End-user documentation |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Administrator guide |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repository in Vercel
3. Configure environment variables
4. Deploy

```bash
# Or deploy via CLI
npx vercel
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

### Production Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Google OAuth redirect URIs configured
- [ ] Stripe webhooks configured
- [ ] Monitoring enabled
- [ ] SSL certificate active
- [ ] Custom domain configured

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

## Support

- **Documentation**: See docs above
- **Issues**: GitHub Issues
- **Security**: security@hireflow.com

---

*Built with Next.js, Clerk, Prisma, Groq AI, and shadcn/ui*

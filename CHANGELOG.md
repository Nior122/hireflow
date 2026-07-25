# Changelog

All notable changes to HireFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-07-22

### Added

#### Core Features
- Job seeker dashboard with Kanban board
- Employer dashboard with candidate pipeline
- AI Career Copilot with streaming chat
- AI Resume Studio with ATS scoring
- AI Interview Center with mock interviews
- Job Discovery Hub with multiple providers
- Gmail integration with OAuth
- Google Calendar integration with OAuth
- Analytics dashboard with charts and insights
- Organization management with RBAC
- Team collaboration features

#### Authentication & Authorization
- Clerk authentication integration
- Role-based access control (Job Seeker / Employer)
- Organization roles (Owner, Admin, Recruiter, Hiring Manager, Interviewer, Viewer)
- API key authentication with scopes

#### AI Features
- Groq AI integration (Llama 3.1 70B)
- Email classification and import
- Resume analysis and matching
- Reply drafting
- Career copilot chat
- Mock interview coaching
- Interview question generation
- Company research

#### Billing & Subscriptions
- Stripe integration
- 6-tier pricing (Free, Pro, Premium, Team, Business, Enterprise)
- Usage tracking
- Webhook processing

#### Public API
- REST API with API key authentication
- Applications, Candidates, Jobs, Analytics, Organizations endpoints
- Pagination, filtering, sorting
- Webhook system for event notifications

#### Mobile Apps
- React Native + Expo architecture
- Home dashboard, Job Discovery, Kanban, AI Copilot
- Resume Studio, Interview Center, Settings
- Bottom tab navigation

#### Browser Extension
- Chrome/Edge Manifest V3 architecture
- Job detection for 9+ websites
- Floating action button
- Save, analyze, import jobs

#### DevOps & Security
- GitHub Actions CI/CD pipeline
- Security headers (CSP, HSTS, etc.)
- Input validation with Zod
- Health check endpoint
- Structured logging
- Performance optimization with dynamic imports

### Changed

- Optimized bundle size with code splitting
- Added 14 database indexes for query performance
- Consolidated duplicated code (stripHtml, position calculation)
- Migrated CLI tools to devDependencies

### Fixed

- Race conditions in Kanban move operations (wrapped in transactions)
- Missing ownership checks on resume sections and comments
- Missing revalidation on ~20 mutation functions
- Security vulnerabilities in billing admin functions
- Broken deleteComment ownership check

### Security

- Added Zod validation schemas for all inputs
- Added HTML sanitization utilities
- Added URL validation with SSRF prevention
- Added SQL injection detection
- Security headers via middleware and Next.js config
- API rate limiting architecture
- Environment variable validation

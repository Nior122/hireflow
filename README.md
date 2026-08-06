# HireFlow

HireFlow is a premium, AI-powered recruitment and job tracking platform. Built for both job seekers and employers, it provides a comprehensive suite of tools to manage applications, track hiring pipelines, and optimize resumes using artificial intelligence.

## Features

- **Job Application Tracking:** Kanban-style board to track job applications across different stages.
- **AI Resume Studio:** Optimize resumes against specific job descriptions using LLMs.
- **Interview Center:** Practice interviews, track schedules, and manage feedback.
- **AI Copilot:** Your personal career assistant.
- **Analytics:** Insightful charts and metrics for your job search or hiring process.
- **Responsive Design:** Premium, commercial-grade UI that works on all devices.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + custom OKLCH color palette
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk
- **AI Integration:** Groq (LLaMA 3)
- **UI Components:** Radix UI, Framer Motion, Lucide Icons

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in the required variables (Clerk, Database, Groq, Stripe)
4. Run database migrations: `npx prisma db push`
5. Generate Prisma Client: `npx prisma generate`
6. Start the development server: `npm run dev`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

This project is licensed under the MIT License.

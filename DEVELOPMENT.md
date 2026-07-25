# HireFlow Developer Guide

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Git
- PostgreSQL database (Neon recommended)
- Clerk account (free tier)
- Groq API key (free tier)

### Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/hireflow.git
cd hireflow

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 4. Initialize database
npx prisma db push
npx prisma generate

# 5. Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
hireflow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Protected routes
│   │   ├── auth/              # Authentication
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui primitives
│   │   └── [feature]/        # Feature components
│   ├── actions/              # Server Actions
│   ├── lib/                  # Utilities
│   │   ├── ai.ts            # AI integration
│   │   ├── prisma.ts        # Database client
│   │   ├── clerk.ts         # Auth helpers
│   │   └── validation/      # Zod schemas
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript types
│   └── middleware.ts         # Route protection
├── prisma/
│   └── schema.prisma         # Database schema
└── public/                   # Static assets
```

---

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types unless absolutely necessary
- Prefer interfaces over types for object shapes
- Use Zod for runtime validation

### React
- Functional components only
- Use hooks for state management
- Server Components when possible
- Client Components only for interactivity
- Avoid inline functions in heavy render paths

### Server Actions
- Always authenticate with `createOrGetUser()`
- Always validate with Zod schemas
- Always use `revalidatePath()` after mutations
- Return `ActionResponse<T>` type
- Handle errors with try/catch

### Styling
- Use Tailwind CSS classes
- Use shadcn/ui components
- Support both light and dark themes
- Mobile-responsive design

### Testing
- Write tests for new features
- Maintain minimum 60% coverage
- Test both success and failure paths

---

## Common Tasks

### Adding a New Feature

1. Create Prisma schema changes
2. Run `npx prisma db push`
3. Create server actions
4. Create components
5. Add tests
6. Update documentation

### Adding a New API Endpoint

1. Create route in `src/app/api/`
2. Add authentication
3. Add input validation
4. Add error handling
5. Update API.md

### Adding a New Server Action

1. Add to appropriate `src/actions/` file
2. Use `createOrGetUser()` for auth
3. Validate input with Zod
4. Use `revalidatePath()` after mutations
5. Return `ActionResponse<T>`

---

## Debugging

### Common Issues

**Prisma errors:**
```bash
npx prisma generate
npx prisma db push
```

**TypeScript errors:**
```bash
npx tsc --noEmit
```

**Build errors:**
```bash
npm run build
```

**Test failures:**
```bash
npm test -- --verbose
```

### Logs
- Development logs appear in terminal
- Server action errors log to console
- API route errors log to console

---

## Git Workflow

### Branch Strategy
- `main` — Production
- `develop` — Development
- `feature/*` — Feature branches
- `fix/*` — Bug fix branches

### Commit Convention
```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
refactor: improve code
chore: maintenance
```

---

*Developer Guide — HireFlow*

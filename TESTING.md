# HireFlow Testing Guide

**Last Updated:** 2026-07-22

---

## Testing Strategy

HireFlow implements a comprehensive testing strategy covering:

1. **Unit Tests** — Individual function and utility testing
2. **Component Tests** — React component behavior testing
3. **API Tests** — Server endpoint testing
4. **Server Action Tests** — Business logic testing
5. **End-to-End Tests** — Full user workflow testing
6. **Security Tests** — Vulnerability testing
7. **Accessibility Tests** — WCAG compliance testing

---

## Test Types & Coverage

### Unit Tests

| Area | Files | Coverage |
|------|-------|----------|
| Validation Schemas | `src/lib/validation/schemas.test.ts` | All Zod schemas |
| Sanitization Utils | `src/lib/security/sanitize.test.ts` | HTML stripping, URL validation, XSS prevention |
| Billing Plans | `src/lib/billing/plans.test.ts` | Plan definitions, limits, pricing |
| Permission System | `src/lib/org/permissions.test.ts` | RBAC rules, role-based access |
| AI Config | `src/lib/ai-config.test.ts` | API configuration |
| Cache Layer | `src/lib/cache.test.ts` | Caching behavior |

### Component Tests

| Component | Priority | Tests |
|-----------|----------|-------|
| KanbanBoard | High | Render, drag-drop, column management |
| KanbanCard | High | Display, interactions, dropdown menu |
| SearchFilterBar | High | Search, filter toggle, clear |
| AddApplicationDialog | High | Form validation, submission |
| StatsSection | Medium | Chart rendering, data display |
| EmailDigestPanel | High | Scan, import, status display |
| CandidatePipeline | High | Pipeline rendering, drag-drop |

### API Tests

| Endpoint | Priority | Tests |
|----------|----------|-------|
| `/api/v1/applications` | High | CRUD, auth, validation |
| `/api/v1/candidates` | High | Auth, pagination |
| `/api/v1/jobs` | Medium | List, pagination |
| `/api/v1/analytics` | Medium | Auth, data format |
| `/api/health` | High | All checks pass |

### Server Action Tests

| Action | Priority | Tests |
|--------|----------|-------|
| `createApplication` | High | Auth, validation, DB create |
| `updateApplication` | High | Auth, validation, ownership |
| `deleteApplication` | High | Auth, ownership, cascade |
| `moveApplication` | High | Position updates, transactions |
| `seedSampleData` | Medium | Data creation, idempotency |
| `exportApplicationsCSV` | Medium | CSV format, escaping |
| AI Actions | High | Prompt handling, validation |

---

## Running Tests

### Unit Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- schemas.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="validation"
```

### End-to-End Tests

```bash
# Install Playwright browsers
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test tests/auth.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode
npx playwright test --ui
```

### Code Coverage

```bash
# Generate coverage report
npm run test:coverage

# Coverage report location
# coverage/lcov-report/index.html
```

---

## Test Data Management

### Unit Tests
- Use mock data inline
- No database connections required
- Isolated test cases

### Component Tests
- Use React Testing Library mocks
- Mock server actions with jest.mock()
- Use MSW for API mocking

### E2E Tests
- Use test database
- Clean up after each test
- Never use production data

---

## Writing New Tests

### Unit Test Template

```typescript
import { functionToTest } from "./module";

describe("functionToTest", () => {
  it("handles valid input", () => {
    expect(functionToTest("valid")).toBe("expected");
  });

  it("handles invalid input", () => {
    expect(functionToTest("")).toThrow();
  });

  it("handles edge cases", () => {
    expect(functionToTest(null)).toBeNull();
  });
});
```

### Component Test Template

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { ComponentToTest } from "./ComponentToTest";

describe("ComponentToTest", () => {
  it("renders correctly", () => {
    render(<ComponentToTest />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("handles user interaction", async () => {
    render(<ComponentToTest />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Result")).toBeInTheDocument();
  });
});
```

### Server Action Test Template

```typescript
import { actionToTest } from "./actions";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    model: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/clerk", () => ({
  createOrGetUser: jest.fn(),
}));

describe("actionToTest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success on valid input", async () => {
    (createOrGetUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (prisma.model.findMany as jest.Mock).mockResolvedValue([]);
    const result = await actionToTest();
    expect(result.success).toBe(true);
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
- name: Run Tests
  run: |
    npm ci
    npm run lint
    npm test
    npm run build
```

### Test Requirements
- All unit tests must pass
- No TypeScript errors
- Build must succeed
- Coverage threshold: 60% statements

---

## Test Environment

### Jest Configuration
- Environment: jsdom
- Module mapping: `@/` → `src/`
- Setup file: `jest.setup.js` with @testing-library/jest-dom

### Playwright Configuration
- Browser: Chromium
- Base URL: http://localhost:3000
- Timeout: 30 seconds
- Retries: 1

---

## Debugging Tests

### Jest Debug
```bash
node --inspect node_modules/.bin/jest --runInBand
```

### Playwright Debug
```bash
npx playwright test --debug
```

### Common Issues
1. **Module not found** — Check `moduleNameMapper` in jest.config
2. **Window not defined** — Ensure test environment is jsdom
3. **Async issues** — Use `waitFor` from React Testing Library
4. **Flaky tests** — Add proper waits and assertions

---

## Test Maintenance

### Adding New Tests
1. Create test file adjacent to source file
2. Follow naming convention: `*.test.ts` or `*.test.tsx`
3. Use descriptive test names
4. Cover happy path and error cases

### Updating Tests
1. When modifying source, update corresponding tests
2. Ensure tests still pass after refactoring
3. Add tests for new features
4. Remove tests for removed features

---

## Coverage Targets

| Category | Minimum | Target |
|----------|---------|--------|
| Statements | 60% | 80% |
| Branches | 50% | 70% |
| Functions | 60% | 80% |
| Lines | 60% | 80% |

### Critical Paths (Must Have 100%)
- Authentication flows
- Payment processing
- Data isolation
- Permission checks
- Input validation

---

*Testing Guide - HireFlow SaaS Platform*
*Generated: 2026-07-22*

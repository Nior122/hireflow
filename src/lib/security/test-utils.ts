// ─── Security Test Cases ──────────────────────────────────────

/**
 * Security test scenarios for HireFlow.
 * These should be run as part of the CI/CD pipeline.
 */

export const SECURITY_TEST_CASES = {
  // Authentication Tests
  authentication: {
    "unauthorized-access-dashboard": {
      description: "Verify unauthenticated users cannot access /dashboard",
      method: "GET",
      url: "/dashboard",
      expectedStatus: 302,
      expectedRedirect: /\/sign-in/,
    },
    "unauthorized-api-access": {
      description: "Verify API requires authentication",
      method: "GET",
      url: "/api/v1/applications",
      expectedStatus: 401,
    },
    "invalid-api-key": {
      description: "Verify invalid API key is rejected",
      method: "GET",
      url: "/api/v1/applications",
      headers: { "Authorization": "Bearer invalid_key_12345" },
      expectedStatus: 401,
    },
  },

  // Input Validation Tests
  inputValidation: {
    "xss-in-company-name": {
      description: "Verify XSS is prevented in company name",
      input: '<script>alert("xss")</script>',
      expected: "sanitized",
    },
    "sql-injection-attempt": {
      description: "Verify SQL injection is prevented",
      input: "'; DROP TABLE users; --",
      expected: "sanitized",
    },
    "oversized-input": {
      description: "Verify oversized inputs are rejected",
      input: "x".repeat(10000),
      maxLength: 200,
    },
    "malicious-url": {
      description: "Verify dangerous URLs are blocked",
      input: "javascript:alert(1)",
      expected: "rejected",
    },
  },

  // Authorization Tests
  authorization: {
    "job-seeker-cannot-access-employer": {
      description: "Job seeker cannot access employer data",
      userRole: "JOB_SEEKER",
      targetResource: "/api/v1/candidates",
      expectedStatus: 403,
    },
    "cross-tenant-access": {
      description: "User cannot access other organization's data",
      userId: "user_1",
      targetOrg: "org_2",
      expectedStatus: 403,
    },
  },

  // Rate Limiting Tests
  rateLimiting: {
    "rapid-api-requests": {
      description: "Verify rate limiting blocks rapid requests",
      requestCount: 150,
      windowMs: 60000,
      expectedSuccess: 100,
      expectedLimited: 50,
    },
  },
};

/**
 * Generate security test report
 */
export function generateSecurityReport(): Record<string, string> {
  return {
    "security.headers": "Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS",
    "security.validation": "Zod schemas on all inputs",
    "security.auth": "Clerk JWT sessions with server-side verification",
    "security.rbac": "Role-based access control with organization isolation",
    "security.api": "API key authentication with scoped permissions",
    "security.ai": "Input sanitization and output validation",
    "security.stripe": "Webhook architecture with signature verification ready",
    "security.oauth": "Token storage with automatic refresh",
    "security.rate-limiting": "In-memory rate limiter (architecture-ready for Redis)",
  };
}

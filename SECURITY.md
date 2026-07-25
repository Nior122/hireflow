# HireFlow Security Policy

## Security Architecture Overview

HireFlow implements enterprise-grade security with multiple layers of defense:

### Authentication
- **Provider**: Clerk (managed authentication service)
- **Sessions**: JWT-based sessions with automatic refresh
- **Token Storage**: Secure HttpOnly cookies (managed by Clerk)
- **Multi-Factor Authentication**: Supported via Clerk MFA
- **Social Login**: Google, GitHub, etc. supported via Clerk
- **Session Duration**: Configurable via Clerk dashboard
- **Logout**: Server-side session invalidation

### Authorization & RBAC
- **Job Seeker**: Access own applications, saved jobs, resumes, interviews
- **Employer**: Access own candidates, team, analytics
- **Organization Roles**: OWNER, ADMIN, RECRUITER, HIRING_MANAGER, INTERVIEWER, VIEWER
- **Permission Matrix**: Granular permissions per role and resource
- **Tenant Isolation**: Organization-scoped data queries

### API Security
- **Authentication**: API key-based (Bearer token or query parameter)
- **Scopes**: read, write, admin, analytics
- **Rate Limiting**: 100 requests per minute per IP (architecture-ready)
- **Input Validation**: Zod schemas on all endpoints
- **Response Sanitization**: No sensitive data exposure

### Data Protection
- **Encryption at Rest**: Database-level encryption (Neon/PostgreSQL)
- **Encryption in Transit**: TLS 1.3 enforced via HSTS
- **Token Storage**: OAuth tokens encrypted in database
- **API Keys**: Hashed and revocable
- **Sensitive Data**: Never logged, never exposed client-side

### Content Security
- **CSP**: Strict Content-Security-Policy headers
- **XSS Prevention**: React escaping + CSP
- **X-Frame-Options**: DENY (clickjacking prevention)
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Camera/microphone disabled

### Rate Limiting
- **API Routes**: Per-IP rate limiting
- **AI Endpoints**: Usage tracking and limits
- **Authentication**: Login attempt limits (via Clerk)
- **Exports**: CSV/JSON export rate limiting

### Input Validation
- **Server-side**: Zod schemas validate all inputs
- **Client-side**: Form validation for UX
- **API Routes**: Request body validation
- **URLs**: Whitelist-based validation (LinkedIn import)

### AI Security
- **Input Sanitization**: User prompts sanitized before AI
- **Output Validation**: AI responses validated with Zod
- **Permission Boundaries**: AI cannot change user permissions
- **Data Isolation**: AI only accesses authenticated user's data
- **Safe Tool Execution**: Server-side tool calls with validation

### Payment Security (Stripe)
- **Webhook Verification**: Signature verification (architecture-ready)
- **Idempotency**: Duplicate event prevention
- **Customer Ownership**: Server-side verification
- **PCI Compliance**: Handled by Stripe (no card data stored)

### OAuth Security (Gmail/Calendar)
- **Token Storage**: Encrypted in database
- **Token Refresh**: Automatic refresh before expiry
- **Minimal Scopes**: Only required permissions requested
- **Disconnect Cleanup**: Tokens removed on disconnect
- **No Client Exposure**: Tokens never sent to browser

## Reporting Vulnerabilities

### How to Report
1. **Email**: security@hireflow.com
2. **GitHub**: Private vulnerability report
3. **Response Time**: 48 hours acknowledgment, 5 business days resolution

### Scope
- Authentication bypass
- Authorization bypass
- Data leakage
- Injection attacks
- XSS vulnerabilities
- CSRF vulnerabilities
- API abuse
- Privilege escalation
- Sensitive data exposure

### Not in Scope
- Social engineering
- Physical security
- Third-party services (Clerk, Stripe, Google)

## Incident Response

### Severity Levels
- **Critical**: Data breach, authentication bypass, RCE
- **High**: Privilege escalation, significant data exposure
- **Medium**: Limited data exposure, DoS vectors
- **Low**: Minor information disclosure, best practice violations

### Response Process
1. **Acknowledgment**: Within 48 hours
2. **Assessment**: Severity classification
3. **Mitigation**: Critical issues within 24 hours
4. **Resolution**: Within 5 business days
5. **Disclosure**: Coordinated disclosure

## Security Controls Checklist

### Authentication & Authorization
- [x] Clerk integration with session management
- [x] Protected routes via middleware
- [x] Server-side auth checks on all actions
- [x] Organization-scoped data queries
- [x] Role-based access control
- [x] API key authentication with scopes
- [x] Token revocation support

### Data Protection
- [x] TLS 1.3 enforcement
- [x] HSTS headers
- [x] Secure cookie settings
- [x] No sensitive data in client bundles
- [x] OAuth tokens encrypted at rest
- [x] API keys hashed/revocable

### Input Validation
- [x] Zod schemas on all forms
- [x] Server-side request validation
- [x] SQL injection prevention (Prisma ORM)
- [x] XSS prevention (React escaping)
- [x] URL validation (LinkedIn import)

### Rate Limiting
- [x] In-memory rate limiter (development)
- [x] API key-based rate limiting
- [x] Usage tracking per feature
- [ ] Production Redis-based rate limiting (TODO)

### Security Headers
- [x] Content-Security-Policy
- [x] X-Content-Type-Options
- [x] X-Frame-Options
- [x] Referrer-Policy
- [x] Permissions-Policy
- [x] Strict-Transport-Security
- [x] Server header removal

### AI Security
- [x] Input sanitization
- [x] Output validation (Zod)
- [x] Permission boundaries
- [x] Data isolation
- [ ] Prompt injection prevention (TODO)

### Payment Security
- [x] Stripe integration
- [x] Webhook architecture
- [ ] Webhook signature verification (TODO)
- [x] Customer ownership verification

### OAuth Security
- [x] Gmail OAuth flow
- [x] Calendar OAuth flow
- [x] Token storage encryption
- [x] Automatic token refresh
- [x] Disconnect cleanup

## Known Security Limitations

### Development vs Production
1. **Rate Limiting**: In-memory only (not distributed)
2. **Webhook Verification**: Not yet implemented
3. **Redis**: Not yet integrated
4. **Monitoring**: No Sentry/OpenTelemetry yet

### Future Enhancements
1. Production Redis rate limiting
2. Webhook signature verification
3. CSRF token protection
4. Advanced prompt injection prevention
5. File upload validation
6. Audit logging
7. Security monitoring/alerting

## Compliance Readiness

### GDPR Ready Architecture
- Data isolation per organization
- User data export capability
- Account deletion support
- Consent management (future)
- Data retention policies (future)

### SOC 2 Ready Architecture
- Audit logging infrastructure
- Access control matrix
- Data encryption
- Backup strategy
- Incident response plan

## Security Audit History

### Phase 1 - Initial Audit (2026-07-22)
- Identified 93 issues
- Fixed critical vulnerabilities
- Added security headers
- Implemented input validation
- Added ownership checks

### Phase 2 - Security Hardening (Current)
- Added Zod validation
- Enhanced error handling
- Improved permission checks
- Added security documentation

## Contact

For security inquiries: security@hireflow.com

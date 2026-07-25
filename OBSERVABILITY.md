# HireFlow Observability & Monitoring Guide

**Last Updated:** 2026-07-22

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    HireFlow SaaS                         │
├─────────────────────────────────────────────────────────┤
│  Frontend (Next.js)    │  Backend (Server Actions)      │
│  - React Components    │  - Prisma ORM                  │
│  - Client State        │  - Server Actions               │
│  - Analytics Charts    │  - API Routes                   │
├─────────────────────────────────────────────────────────┤
│                    Monitoring Layer                       │
│  - Structured Logging  │  - Health Checks                │
│  - Error Tracking      │  - Performance Monitoring       │
│  - Request Tracing     │  - Alert System                 │
├─────────────────────────────────────────────────────────┤
│                    Data Layer                             │
│  - PostgreSQL (Neon)   │  - External APIs                 │
│  - Clerk Auth          │  - Groq AI                       │
│  - Stripe Billing      │  - Gmail/Calendar APIs           │
└─────────────────────────────────────────────────────────┘
```

---

## Monitoring Tools

### Currently Implemented

| Tool | Purpose | Status |
|------|---------|--------|
| Structured Logging | Request/operation logging | ✅ Implemented |
| Health Check Endpoint | System health monitoring | ✅ Implemented |
| Error Boundaries | Client-side error catching | ✅ Implemented |
| Performance Tracking | Request duration tracking | ✅ Implemented |

### Recommended for Production

| Tool | Purpose | Priority |
|------|---------|----------|
| Sentry | Error tracking + performance | High |
| Vercel Analytics | Core Web Vitals | High |
| UptimeRobot | External uptime monitoring | High |
| Upstash Redis | Rate limiting + caching | Medium |
| OpenTelemetry | Distributed tracing | Medium |
| PagerDuty | Alert routing | Low |

---

## Logging Strategy

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `debug` | Development only | Query results, internal state |
| `info` | Normal operations | API requests, user actions, AI calls |
| `warn` | Degraded performance | Slow queries, rate limits, fallbacks |
| `error` | Failures | Database errors, API failures, auth errors |

### Structured Log Format

```json
{
  "timestamp": "2026-07-22T10:30:00.000Z",
  "level": "INFO",
  "service": "hireflow",
  "message": "Application created",
  "requestId": "req_abc123",
  "userId": "user_xyz",
  "duration": 45
}
```

### What to Log

✅ **DO Log:**
- API requests (method, path, status, duration)
- Server actions (action name, duration, success/failure)
- Database queries (slow queries > 1000ms)
- AI requests (action, duration, token usage)
- Authentication events (login, logout, failures)
- Billing events (subscription changes, payments)
- Security events (permission failures, suspicious activity)

❌ **DON'T Log:**
- Passwords
- API keys
- OAuth tokens
- Credit card numbers
- Personal health information
- Full email bodies

---

## Health Check System

### Endpoint

```
GET /api/health
```

### Response

```json
{
  "status": "healthy|degraded|down",
  "timestamp": "2026-07-22T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "connected", "latency": 15 },
    "environment": { "status": "configured" },
    "groq": { "status": "configured" },
    "google": { "status": "configured" },
    "stripe": { "status": "configured" },
    "memory": { "status": "normal", "usage": "128MB / 512MB" }
  }
}
```

### Status Codes

| Status | HTTP Code | Meaning |
|--------|-----------|---------|
| `healthy` | 200 | All systems operational |
| `degraded` | 200 | Some services unavailable |
| `down` | 503 | Critical service unavailable |

---

## Alerting System

### Critical Alerts (Immediate Response)

| Alert | Condition | Action |
|-------|-----------|--------|
| Application Down | Health check fails | Check Vercel status, rollback if needed |
| Database Unavailable | DB connection fails | Check Neon status, restore from backup |
| Authentication Outage | Clerk returns errors | Check Clerk status page |
| Payment Failures | Stripe webhook failures | Check Stripe dashboard |

### Warning Alerts (Investigate)

| Alert | Condition | Action |
|-------|-----------|--------|
| High Latency | API > 5s | Check database queries, optimize |
| Increased Errors | Error rate > 5% | Check Sentry, investigate |
| AI Failures | Groq API errors | Check Groq status, adjust prompts |
| Token Expiry | Gmail/Calendar tokens | Check OAuth flow |

---

## Incident Response Process

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV-1 | Platform unavailable | 15 minutes | Total outage, data breach |
| SEV-2 | Major feature broken | 1 hour | Payment failures, auth broken |
| SEV-3 | Partial degradation | 4 hours | Slow responses, partial failures |
| SEV-4 | Minor issue | 24 hours | UI bugs, minor errors |

### Response Checklist

#### SEV-1 (Critical)
1. [ ] Acknowledge alert within 15 minutes
2. [ ] Assess impact scope
3. [ ] Check external service status pages
4. [ ] Communicate to stakeholders
5. [ ] Attempt mitigation
6. [ ] Rollback if needed
7. [ ] Post-incident review

#### SEV-2 (High)
1. [ ] Acknowledge within 1 hour
2. [ ] Identify root cause
3. [ ] Implement workaround
4. [ ] Schedule fix
5. [ ] Communicate to affected users

#### SEV-3 (Medium)
1. [ ] Acknowledge within 4 hours
2. [ ] Add monitoring/alerting
3. [ ] Schedule fix
4. [ ] Document known issue

#### SEV-4 (Low)
1. [ ] Log in issue tracker
2. [ ] Schedule fix for next sprint
3. [ ] Document workaround

---

## Database Monitoring

### Key Metrics
- Connection pool usage
- Query latency (p50, p95, p99)
- Failed queries
- Storage usage
- Replication lag (if applicable)

### Query Monitoring
```sql
-- Slow queries (> 1s)
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Backup Strategy
- **Neon**: Automatic daily backups
- **Recovery**: Point-in-time recovery available
- **Migration Recovery**: Keep migration files in version control

---

## AI Monitoring

### Metrics to Track
- Request count per action
- Success/failure rate
- Average latency
- Token usage
- Cost per request

### Common Failures
| Failure | Cause | Resolution |
|---------|-------|------------|
| Rate limit | Too many requests | Implement retry with backoff |
| Timeout | Slow AI response | Increase timeout, optimize prompts |
| Invalid JSON | AI response format | Improve prompt, add retry |
| API key invalid | Key expired/revoked | Regenerate key |
| Model unavailable | Service outage | Fallback to cached response |

---

## External API Monitoring

### Gmail API
- **Scopes**: gmail.readonly, gmail.modify, gmail.send
- **Quotas**: 250 quota units/second
- **Common Issues**: Token expired, quota exceeded, permissions revoked
- **Recovery**: Re-authenticate via OAuth flow

### Google Calendar API
- **Scopes**: calendar.readonly, calendar.events
- **Common Issues**: Token expired, timezone errors
- **Recovery**: Re-authenticate via OAuth flow

### Groq AI
- **Model**: llama-3.1-70b-versatile
- **Common Issues**: Rate limits, model overloaded
- **Recovery**: Retry with exponential backoff

### Stripe
- **Common Issues**: Webhook signature mismatch, payment failures
- **Recovery**: Check Stripe dashboard, verify webhook secret

---

## Dashboard Links

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Vercel Dashboard | vercel.com/dashboard | Deployment, logs, analytics |
| Neon Console | console.neon.tech | Database management |
| Clerk Dashboard | dashboard.clerk.com | Authentication management |
| Stripe Dashboard | dashboard.stripe.com | Payment management |
| Groq Console | console.groq.com | AI API management |
| Google Cloud Console | console.cloud.google.com | Gmail/Calendar APIs |

---

## Production Checklist

### Pre-Launch
- [ ] All environment variables set
- [ ] Health check returns "healthy"
- [ ] Sentry configured and capturing errors
- [ ] Vercel Analytics enabled
- [ ] Uptime monitoring configured
- [ ] Alert channels set up (email/Slack)
- [ ] Backup verification completed
- [ ] Rollback procedure tested

### Post-Launch
- [ ] Monitor error rates daily
- [ ] Review performance metrics weekly
- [ ] Audit security logs monthly
- [ ] Update dependencies quarterly
- [ ] Conduct disaster recovery drills

---

*Observability & Monitoring Guide - HireFlow SaaS Platform*
*Generated: 2026-07-22*

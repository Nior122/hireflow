# HireFlow Disaster Recovery Plan

## Overview

This document outlines disaster recovery procedures for HireFlow to ensure business continuity during system failures, data loss, or security incidents.

## Recovery Objectives

| Component | RTO (Recovery Time) | RPO (Data Loss) | Backup Frequency |
|-----------|---------------------|-----------------|------------------|
| Application | 1 hour | N/A | Continuous deployment |
| Database | 4 hours | 1 hour | Continuous (Neon) |
| User Data | 4 hours | 1 hour | Continuous (Neon) |
| Configuration | 1 hour | N/A | Git version control |
| Secrets | 2 hours | N/A | Environment variables |

---

## Failure Scenarios & Recovery

### Scenario 1: Database Outage

**Detection:**
- Health check returns `database: "disconnected"`
- High error rate in logs
- Users see "database unavailable" messages

**Immediate Response (0-15 min):**
1. Check Neon status page: https://status.neon.tech
2. Verify database connection string is correct
3. Check connection pool limits

**Recovery:**
- If Neon outage: Wait for Neon recovery (monitor status page)
- If connection issue: Restart Neon compute from dashboard
- If data corruption: Restore from point-in-time backup
- Maximum data loss: 1 hour (Neon continuous backup)

**Communication:**
```
Subject: [HireFlow] Database Issue - Investigating

We are experiencing database connectivity issues.
Status: Investigating
Impact: Unable to load data
ETA: Resolving
```

---

### Scenario 2: Authentication Outage (Clerk)

**Detection:**
- Users cannot sign in/out
- Session validation fails
- Protected routes redirect to sign-in

**Immediate Response:**
1. Check Clerk status: https://status.clerk.com
2. Verify API keys are correct
3. Check Clerk dashboard for service issues

**Recovery:**
- If Clerk is down: Wait for their recovery
- If keys invalid: Rotate keys from Clerk dashboard
- Users cannot authenticate during Clerk outage

---

### Scenario 3: Payment Failure (Stripe)

**Detection:**
- Checkout fails
- Webhook errors
- Subscription not updating

**Immediate Response:**
1. Check Stripe status: https://status.stripe.com
2. Verify webhook secret
3. Check webhook delivery logs

**Recovery:**
- Manually trigger failed webhooks from Stripe dashboard
- Verify subscription states in database
- Contact Stripe support if needed

---

### Scenario 4: AI Service Failure (Groq)

**Detection:**
- "AI service unavailable" messages
- Empty AI responses
- Timeout errors

**Immediate Response:**
1. Check Groq status page
2. Verify GROQ_API_KEY is valid
3. Check API usage limits

**Recovery:**
- AI features return graceful fallback messages
- No data loss
- Features resume when Groq recovers

---

### Scenario 5: Application Deployment Failure

**Detection:**
- Build fails in CI/CD
- Runtime errors after deployment
- Vercel deployment fails

**Immediate Response:**
1. Check Vercel deployment logs
2. Review build errors
3. Check for TypeScript errors

**Recovery:**
```bash
# Rollback via Vercel
npx vercel rollback

# Or via GitHub Actions
# Revert to previous commit and push
```

---

### Scenario 6: Data Corruption

**Detection:**
- Unexpected data errors
- User reports missing data
- Database queries return invalid results

**Immediate Response:**
1. Stop all write operations if possible
2. Assess scope of corruption
3. Check Neon backup status

**Recovery:**
1. Access Neon Console
2. Use point-in-time recovery
3. Choose restore point before corruption
4. Verify data integrity after restore
5. Resume operations

---

## Communication Templates

### Service Outage
```
Subject: [HireFlow] Service Disruption - [Date]

We are experiencing a service disruption affecting [features].

Impact: [Description]
Status: Investigating
ETA: [Time]

Updates every 30 minutes.
- HireFlow Team
```

### Data Breach
```
Subject: [HireFlow] Security Incident Notification

Incident details:
- What happened: [Description]
- When: [Date/time]
- Data affected: [Types]
- Actions taken: [Steps]

We take data security seriously.
- HireFlow Security Team
```

---

## Backup Strategy

### Database (Neon)
- **Automatic Backups**: Daily
- **Point-in-Time Recovery**: Last 7 days
- **Retention**: 30 days (paid plans)
- **Manual Backup**: Before major changes

### Application Code
- **Git Repository**: GitHub
- **All migrations**: Version controlled
- **Configuration**: Environment variables

### Secrets
- **Storage**: Vercel environment variables
- **Access**: Admin only
- **Rotation**: Quarterly recommended

---

## Quarterly DR Testing

### Test 1: Database Restore
1. Restore backup to test database
2. Verify data integrity
3. Document recovery time

### Test 2: Application Rollback
1. Deploy test change
2. Rollback to previous version
3. Verify functionality

### Test 3: Secret Rotation
1. Rotate test secrets
2. Verify application works
3. Document process

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Primary Engineer | [Name] | Business hours |
| Vercel Support | support@vercel.com | 24/7 |
| Neon Support | support@neon.tech | Business hours |
| Clerk Support | support@clerk.com | Business hours |
| Stripe Support | support@stripe.com | 24/7 |

---

*Disaster Recovery Plan — HireFlow*
*Last Updated: 2026-07-22*

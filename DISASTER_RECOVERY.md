# HireFlow Disaster Recovery Plan

**Last Updated:** 2026-07-22

---

## Overview

This document outlines the disaster recovery procedures for HireFlow to ensure business continuity in case of system failures, data loss, or security incidents.

---

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)

| Component | RTO | RPO | Backup Frequency |
|-----------|-----|-----|------------------|
| Application | 1 hour | N/A | Continuous deployment |
| Database | 4 hours | 1 hour | Continuous (Neon) |
| User Data | 4 hours | 1 hour | Continuous (Neon) |
| Configuration | 1 hour | N/A | Git version control |
| Secrets | 2 hours | N/A | Environment variables |

---

## Backup Strategy

### Database Backups

**Provider:** Neon PostgreSQL

- **Automatic Backups:** Daily (included with Neon)
- **Point-in-time Recovery:** Available for last 7 days
- **Retention:** 30 days for paid plans
- **Manual Backup:** Before major changes

**Backup Verification:**
```bash
# Neon automatically manages backups
# Verify in Neon Console: https://console.neon.tech
# Check backup status in dashboard
```

### Application Backups

- **Code:** Git repository (GitHub)
- **Configuration:** Environment variables in Vercel
- **Database Schema:** Prisma schema in version control
- **Migrations:** All migrations in version control

### Secret Backups

| Secret | Storage | Access |
|--------|---------|--------|
| Database URL | Vercel Environment | Admin only |
| Clerk Keys | Vercel Environment | Admin only |
| Stripe Keys | Vercel Environment | Admin only |
| Google OAuth | Vercel Environment | Admin only |
| Groq API Key | Vercel Environment | Admin only |

---

## Recovery Procedures

### 1. Application Recovery

**Scenario:** Application code failure or bad deployment

**Steps:**
1. Check Vercel deployment status
2. Review recent deployments
3. Identify failing deployment
4. Rollback to previous deployment:
   ```bash
   vercel rollback
   ```
5. Verify application works
6. Fix the issue in a new deployment

**Time to recover:** 5-15 minutes

---

### 2. Database Recovery

**Scenario:** Database corruption or data loss

**Steps:**
1. Assess scope of data loss
2. Stop all application writes
3. Access Neon Console: https://console.neon.tech
4. Navigate to Branches → main branch
5. Select "Restore" option
6. Choose restore point (point-in-time or backup)
7. Wait for restoration to complete
8. Verify data integrity
9. Resume application
10. Communicate to affected users

**Time to recover:** 1-4 hours

---

### 3. Secrets Recovery

**Scenario:** Secrets exposed or compromised

**Steps:**
1. Identify compromised secrets
2. Rotate all affected secrets immediately
3. Update Vercel environment variables
4. Redeploy application
5. Force all users to re-authenticate
6. Review access logs for unauthorized access
7. Notify affected users if data was accessed

**Time to recover:** 1-2 hours

---

### 4. Authentication Recovery

**Scenario:** Clerk service outage

**Steps:**
1. Check Clerk status: https://status.clerk.com
2. If Clerk is down, wait for their recovery
3. If Clerk data is lost, contact Clerk support
4. Users cannot sign in/out during outage
5. All protected routes will redirect to sign-in

**Time to recover:** Dependent on Clerk (usually < 1 hour)

---

### 5. Payment Recovery

**Scenario:** Stripe integration failure

**Steps:**
1. Check Stripe status: https://status.stripe.com
2. Check webhook delivery logs in Stripe dashboard
3. Manually trigger failed webhooks if needed
4. Verify subscription states in database
5. Contact Stripe support if needed

**Time to recover:** 1-4 hours

---

## Data Export/Import

### Database Export

```sql
-- Export via Neon Console
-- Or using pg_dump:
pg_dump -h host -d database -U user -F c -f backup.dump
```

### Database Import

```sql
-- Restore via Neon Console
-- Or using pg_restore:
pg_restore -h host -d database -U user -c backup.dump
```

### Application Data Export

```bash
# Export via API
curl -H "Authorization: Bearer api_key" \
  https://your-domain.com/api/v1/applications?page=1&limit=1000 > applications.json

curl -H "Authorization: Bearer api_key" \
  https://your-domain.com/api/v1/candidates?page=1&limit=1000 > candidates.json
```

---

## Communication Templates

### Service Outage Notification

```
Subject: [HireFlow] Service Disruption - [Date]

We are currently experiencing a service disruption affecting [affected features].

Impact: [Description of affected functionality]
Status: Investigating
ETA: [Estimated time to resolution]

We apologize for the inconvenience and will provide updates every 30 minutes.

The HireFlow Team
```

### Data Breach Notification

```
Subject: [HireFlow] Security Incident Notification

We are writing to inform you of a security incident that may have affected your data.

What happened: [Description]
When: [Date/time]
What data was affected: [Affected data types]
What we are doing: [Remediation steps]
What you should do: [Recommended actions]

We take data security seriously and have notified relevant authorities as required.

The HireFlow Security Team
```

---

## Testing Disaster Recovery

### Quarterly DR Tests

1. **Database Backup Test**
   - Restore a backup to a test database
   - Verify data integrity
   - Document recovery time

2. **Application Rollback Test**
   - Deploy a test change
   - Rollback to previous version
   - Verify application works

3. **Secret Rotation Test**
   - Rotate test secrets
   - Verify application continues to work
   - Document process

---

## Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| Primary Engineer | [Name] | Business hours |
| Backup Engineer | [Name] | Business hours |
| Vercel Support | support@vercel.com | 24/7 |
| Neon Support | support@neon.tech | Business hours |
| Clerk Support | support@clerk.com | Business hours |
| Stripe Support | support@stripe.com | 24/7 |

---

## Version History

| Date | Changes | Author |
|------|---------|--------|
| 2026-07-22 | Initial DR plan created | HireFlow Team |

---

*Disaster Recovery Plan - HireFlow SaaS Platform*
*Generated: 2026-07-22*

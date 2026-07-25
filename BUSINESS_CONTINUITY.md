# HireFlow Business Continuity Plan

## Overview

This plan ensures HireFlow maintains critical operations during disruptions and recovers quickly.

## Critical Services

| Priority | Service | Impact if Down | Max Downtime |
|----------|---------|----------------|--------------|
| P0 | Authentication | Users cannot access | 1 hour |
| P0 | Database | Data unavailable | 4 hours |
| P1 | Job Applications | Core feature unavailable | 4 hours |
| P1 | Employer Pipeline | Core feature unavailable | 4 hours |
| P2 | AI Features | Reduced functionality | 24 hours |
| P2 | Email Integration | Reduced functionality | 24 hours |
| P3 | Analytics | Reporting unavailable | 48 hours |
| P3 | Billing | Subscription management | 72 hours |

## Recovery Priorities

### Phase 1: Critical (0-4 hours)
1. Restore database access
2. Restore authentication
3. Verify core data integrity

### Phase 2: Core Features (4-24 hours)
1. Restore job application features
2. Restore employer pipeline
3. Restore search functionality

### Phase 3: Enhanced Features (24-72 hours)
1. Restore AI features
2. Restore email integration
3. Restore analytics
4. Restore billing

### Phase 4: Full Recovery (72+ hours)
1. Restore all integrations
2. Verify monitoring
3. Complete incident review

## Maximum Data Loss

| Data Type | Max Loss | Recovery Method |
|-----------|----------|-----------------|
| Job Applications | 1 hour | Point-in-time recovery |
| Candidates | 1 hour | Point-in-time recovery |
| Activity Logs | 1 hour | Point-in-time recovery |
| Resumes | 1 hour | Point-in-time recovery |
| Billing Data | 1 hour | Stripe + point-in-time |

## Emergency Communication

### Internal (Team)
- **Channel**: Slack/Email
- **Frequency**: Every 30 minutes during SEV-1
- **Content**: Status, ETA, impact

### External (Customers)
- **Channel**: Status page + Email
- **Frequency**: Every 1 hour during outage
- **Content**: What's happening, ETA, workarounds

## Testing Schedule

| Test | Frequency | Duration | Participants |
|------|-----------|----------|--------------|
| DR Test | Quarterly | 2 hours | Engineering team |
| Backup Restore | Quarterly | 1 hour | SRE team |
| Communication Drill | Semi-annually | 1 hour | All staff |

---

*Business Continuity Plan — HireFlow*
*Last Updated: 2026-07-22*

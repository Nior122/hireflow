# HireFlow Operations Runbook

**Last Updated:** 2026-07-22

---

## Common Issues & Resolution

### 1. Application Returns 500 Errors

**Symptoms:**
- Users see "Something went wrong"
- Error rate increases in logs

**Diagnosis:**
1. Check `/api/health` endpoint
2. Check Vercel function logs
3. Check Sentry for error details

**Resolution:**
```bash
# Check database connection
curl https://your-domain.com/api/health

# Check Vercel logs
vercel logs --follow

# Rollback if needed
vercel rollback
```

---

### 2. Database Connection Failures

**Symptoms:**
- "Failed to fetch applications" errors
- Health check shows database: "disconnected"
- High error rate

**Diagnosis:**
1. Check Neon dashboard for connection status
2. Check connection pool usage
3. Check for slow queries

**Resolution:**
- Neon: Restart compute endpoint from dashboard
- Check connection pool limits
- Review and optimize slow queries

---

### 3. Authentication Failures

**Symptoms:**
- Users cannot sign in
- Session expired errors
- Protected routes redirect to sign-in

**Diagnosis:**
1. Check Clerk dashboard for service status
2. Verify API keys are correct
3. Check session configuration

**Resolution:**
- Verify CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- Check Clerk dashboard for any service issues
- Ensure redirect URLs are correct

---

### 4. AI Features Not Working

**Symptoms:**
- "AI service unavailable" messages
- Empty AI responses
- Timeout errors

**Diagnosis:**
1. Check Groq API status
2. Verify GROQ_API_KEY is valid
3. Check API rate limits

**Resolution:**
- Verify GROQ_API_KEY in environment
- Check Groq console for quota usage
- Implement retry logic if needed

---

### 5. Gmail/Calendar Integration Failures

**Symptoms:**
- "Gmail not connected" errors
- Email scanning fails
- Calendar events not syncing

**Diagnosis:**
1. Check OAuth tokens in database
2. Verify Google Cloud Console settings
3. Check API quotas

**Resolution:**
- Tokens may need refresh
- Verify redirect URIs in Google Cloud Console
- Re-authenticate if tokens are invalid

---

### 6. Payment/Subscription Issues

**Symptoms:**
- Checkout fails
- Subscription not updating
- Webhook errors

**Diagnosis:**
1. Check Stripe dashboard
2. Verify webhook secret
3. Check webhook delivery logs

**Resolution:**
- Verify STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
- Check Stripe webhook logs for delivery failures
- Manually trigger webhook if needed

---

### 7. High Latency / Slow Performance

**Symptoms:**
- Slow page loads
- Timeout errors
- Poor Core Web Vitals

**Diagnosis:**
1. Check Vercel Analytics
2. Check database query performance
3. Check external API response times

**Resolution:**
- Optimize slow database queries
- Implement caching for frequent queries
- Review and optimize AI prompts

---

### 8. Deployment Failures

**Symptoms:**
- Build fails
- Deployment fails
- Runtime errors after deploy

**Diagnosis:**
1. Check build logs in Vercel
2. Review TypeScript errors
3. Check for missing environment variables

**Resolution:**
```bash
# Check build locally
npm run build

# Check TypeScript
npx tsc --noEmit

# Check environment variables
# Verify all required vars are set in Vercel
```

---

## Emergency Procedures

### Complete Platform Outage

1. **Check Status Pages:**
   - Vercel: status.vercel.com
   - Neon: status.neon.tech
   - Clerk: status.clerk.com

2. **If Vercel is down:**
   - Wait for Vercel recovery
   - Communicate status to users

3. **If Neon is down:**
   - Check Neon dashboard
   - Restart compute if needed
   - Restore from backup if data loss

4. **If Clerk is down:**
   - Authentication will be unavailable
   - Users cannot sign in/out
   - Wait for Clerk recovery

### Database Corruption

1. **Stop all writes immediately**
2. **Check Neon backup status**
3. **Restore from most recent backup**
4. **Verify data integrity**
5. **Communicate to affected users**

### Security Breach

1. **Assess scope of breach**
2. **Rotate all secrets immediately**
3. **Force logout all users**
4. **Review access logs**
5. **Notify affected users**
6. **Report to authorities if required**

---

## Monitoring Commands

```bash
# Health check
curl https://your-domain.com/api/health

# Check recent logs (Vercel)
vercel logs --follow --limit 100

# Database status
# Check Neon dashboard: console.neon.tech

# Stripe webhook status
# Check Stripe dashboard: dashboard.stripe.com/webhooks

# Groq API status
# Check console: console.groq.com
```

---

## Escalation Matrix

| Severity | Primary | Secondary | Communication |
|----------|---------|-----------|---------------|
| SEV-1 | On-call Engineer | Engineering Lead | Status page + Email |
| SEV-2 | On-call Engineer | Engineering Lead | Status page |
| SEV-3 | Engineering Team | - | Internal only |
| SEV-4 | Engineering Team | - | Issue tracker |

---

*Operations Runbook - HireFlow SaaS Platform*
*Generated: 2026-07-22*

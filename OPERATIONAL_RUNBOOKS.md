# HireFlow Operational Runbooks

## Runbook 1: Deployment Failure Recovery

### Symptoms
- Vercel deployment fails
- Build errors in CI/CD
- Runtime errors after deployment

### Diagnosis
1. Check Vercel deployment logs
2. Review build output for errors
3. Check for TypeScript compilation errors

### Resolution
```bash
# Check build locally
npm run build

# If build fails, fix errors
npx tsc --noEmit

# Rollback if needed
npx vercel rollback

# Or revert git commit
git revert HEAD
git push origin main
```

### Prevention
- Always test locally before pushing
- Use preview deployments for PRs
- Monitor build status

---

## Runbook 2: Database Issue Recovery

### Symptoms
- "Database unavailable" errors
- Slow query performance
- Connection pool exhaustion

### Diagnosis
1. Check Neon dashboard for status
2. Review connection pool metrics
3. Check for slow queries

### Resolution
**Connection issues:**
```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Slow queries:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Connection pool:**
- Check Neon dashboard for pool metrics
- Consider increasing pool size if needed
- Implement connection pooling in application

### Prevention
- Monitor query performance
- Use proper indexes
- Implement connection pooling
- Regular performance reviews

---

## Runbook 3: Authentication Failure Recovery

### Symptoms
- Users cannot sign in
- Session errors
- Protected routes redirect to sign-in

### Diagnosis
1. Check Clerk status page
2. Verify API keys in environment
3. Check Clerk dashboard for issues

### Resolution
**Clerk outage:**
- Wait for Clerk recovery
- Check status.clerk.com

**Invalid keys:**
1. Go to Clerk dashboard
2. Regenerate keys
3. Update environment variables
4. Redeploy

**Session issues:**
- Clear browser cache
- Have users sign out and back in
- Check session configuration

---

## Runbook 4: Payment Failure Recovery

### Symptoms
- Checkout fails
- Webhook errors
- Subscription not updating

### Diagnosis
1. Check Stripe dashboard
2. Review webhook logs
3. Verify webhook secret

### Resolution
**Webhook failure:**
1. Go to Stripe dashboard → Webhooks
2. Find failed webhook
3. Click "Resend" to retry

**Checkout failure:**
1. Check Stripe dashboard for errors
2. Verify product/price configuration
3. Test with Stripe test mode

**Subscription issues:**
1. Check customer in Stripe
2. Verify subscription state
3. Manually update if needed

---

## Runbook 5: AI Service Outage

### Symptoms
- "AI unavailable" messages
- Empty AI responses
- Timeout errors

### Diagnosis
1. Check Groq status page
2. Verify API key validity
3. Check usage limits

### Resolution
**Groq outage:**
- AI features return fallback messages
- No data loss
- Wait for Groq recovery

**API key issues:**
1. Go to Groq console
2. Generate new API key
3. Update GROQ_API_KEY in environment
4. Redeploy

**Rate limits:**
- Check usage in Groq dashboard
- Upgrade plan if needed
- Implement request queuing

---

## Runbook 6: Email Integration Failure

### Symptoms
- Gmail not connecting
- Email scanning fails
- Token errors

### Diagnosis
1. Check Google Cloud Console
2. Verify OAuth credentials
3. Check API quotas

### Resolution
**OAuth failure:**
1. Verify CLIENT_ID and CLIENT_SECRET
2. Check redirect URIs in Google Cloud
3. Ensure APIs are enabled (Gmail, Calendar)

**Token issues:**
- Tokens may need refresh
- Re-authenticate via OAuth flow
- Check token expiry in database

---

## Runbook 7: Performance Degradation

### Symptoms
- Slow page loads
- High response times
- Poor Core Web Vitals

### Diagnosis
1. Check Vercel Analytics
2. Review database query performance
3. Check external API latency

### Resolution
**Slow database:**
1. Identify slow queries
2. Add missing indexes
3. Optimize query patterns

**Slow AI:**
1. Check Groq latency
2. Optimize prompts
3. Implement caching

**Large bundle:**
1. Run bundle analyzer
2. Dynamic import heavy components
3. Remove unused dependencies

---

## Runbook 8: Security Incident Response

### Symptoms
- Unauthorized access attempts
- Suspicious activity
- Data breach indicators

### Immediate Response (0-15 min):
1. Assess scope of incident
2. Preserve evidence
3. Notify security team

### Containment (15-60 min):
1. Rotate affected credentials
2. Block suspicious IPs if needed
3. Force logout affected sessions

### Eradication (1-4 hours):
1. Remove malicious access
2. Patch vulnerabilities
3. Update security controls

### Recovery (4-24 hours):
1. Restore from clean backup if needed
2. Verify system integrity
3. Resume normal operations

### Post-Incident (24-72 hours):
1. Complete incident report
2. Update security controls
3. Conduct lessons learned
4. Notify affected users if required

---

*Operational Runbooks — HireFlow*
*Last Updated: 2026-07-22*

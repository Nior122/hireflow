# HireFlow Event Tracking

## Overview

Track key user actions to understand behavior, measure success, and optimize conversion.

---

## Core Events

### Authentication
| Event | Properties | Purpose |
|-------|-----------|---------|
| `user_signed_up` | method, role | Track signups |
| `user_signed_in` | method | Track logins |
| `user_signed_out` | - | Track engagement |
| `role_selected` | role | Track role distribution |

### Job Seeker Actions
| Event | Properties | Purpose |
|-------|-----------|---------|
| `application_created` | source, status | Track usage |
| `application_moved` | from, to, duration | Track engagement |
| `application_deleted` | - | Track churn signals |
| `search_performed` | query, results | Track search usage |
| `filter_applied` | type, value | Track feature usage |
| `export_completed` | format, count | Track power users |

### Employer Actions
| Event | Properties | Purpose |
|-------|-----------|---------|
| `candidate_created` | source, status | Track ATS usage |
| `candidate_moved` | from, to | Track pipeline usage |
| `team_member_invited` | role | Track team growth |
| `job_posting_created` | department | Track hiring activity |

### AI Features
| Event | Properties | Purpose |
|-------|-----------|---------|
| `ai_copilot_message` | topic, tokens | Track AI usage |
| `ai_resume_analysis` | match_score | Track AI value |
| `ai_interview_practice` | type, score | Track feature usage |
| `ai_email_classified` | is_job_related | Track accuracy |

### Integration Events
| Event | Properties | Purpose |
|-------|-----------|---------|
| `gmail_connected` | - | Track integration adoption |
| `calendar_connected` | - | Track integration adoption |
| `email_scanned` | count, imported | Track value |
| `linkedin_imported` | - | Track feature usage |

### Billing Events
| Event | Properties | Purpose |
|-------|-----------|---------|
| `subscription_created` | plan, interval | Track conversions |
| `subscription_upgraded` | from, to | Track upgrades |
| `subscription_downgraded` | from, to | Track churn |
| `checkout_completed` | plan, amount | Track revenue |
| `checkout_abandoned` | plan, step | Track funnel |

---

## Funnel Tracking

### Signup Funnel
1. `page_viewed` (landing)
2. `signup_clicked`
3. `signup_completed`
4. `role_selected`
5. `dashboard_viewed`
6. `first_action_completed`

### Activation Funnel
1. `dashboard_viewed`
2. `application_created` (job seeker) or `candidate_created` (employer)
3. `ai_feature_used`
4. `email_connected`
5. `resume_uploaded`

### Conversion Funnel
1. `upgrade_prompt_shown`
2. `pricing_viewed`
3. `checkout_started`
4. `checkout_completed`
5. `subscription_active`

---

## Implementation

### Client-Side Tracking
```typescript
// Track event
analytics.track("application_created", {
  source: "manual",
  status: "UNAPPLIED",
});

// Identify user
analytics.identify(userId, {
  role: "job_seeker",
  plan: "free",
});
```

### Server-Side Tracking
```typescript
// Log important server events
logger.info("Application created", {
  userId: user.id,
  action: "application_created",
  metadata: { company, role },
});
```

---

*Event Tracking — HireFlow*
*Generated: 2026-07-22*

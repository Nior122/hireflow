# HireFlow API Documentation

## Overview

HireFlow provides a REST API for programmatic access to your recruitment data.

**Base URL:** `/api/v1`

**Authentication:** API Key via `Authorization: Bearer <key>` header

**Rate Limit:** 100 requests per minute (architecture ready for Redis)

---

## Authentication

All API requests require authentication via API key.

```bash
curl -H "Authorization: Bearer hf_your_api_key_here" \
  https://api.hireflow.com/api/v1/applications
```

### API Key Scopes

| Scope | Access |
|-------|--------|
| `read` | Read all data |
| `write` | Create and update data |
| `admin` | Delete data |
| `analytics` | Access analytics |

---

## Endpoints

### Applications

#### List Applications

```
GET /api/v1/applications
```

**Query Parameters:**
- `page` (integer, default: 1) — Page number
- `limit` (integer, default: 20, max: 100) — Results per page
- `status` (string) — Filter by status (UNAPPLIED, WISHLIST, APPLIED, INTERVIEW, OFFER, REJECTED)
- `search` (string) — Search by company or role

**Response:**
```json
{
  "data": [
    {
      "id": "clx...",
      "company": "Google",
      "role": "Software Engineer",
      "status": "APPLIED",
      "createdAt": "2026-07-22T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Example:**
```bash
curl -H "Authorization: Bearer hf_xxx" \
  "https://api.hireflow.com/api/v1/applications?page=1&limit=10&status=APPLIED"
```

#### Create Application

```
POST /api/v1/applications
```

**Required Scope:** `write`

**Request Body:**
```json
{
  "company": "Google",
  "role": "Software Engineer",
  "status": "APPLIED",
  "notes": "Applied via referral",
  "link": "https://careers.google.com",
  "source": "Referral"
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "clx...",
    "company": "Google",
    "role": "Software Engineer",
    "status": "APPLIED",
    "position": 5,
    "userId": "clx...",
    "createdAt": "2026-07-22T10:00:00.000Z"
  }
}
```

#### Get Application

```
GET /api/v1/applications/:id
```

#### Update Application

```
PATCH /api/v1/applications/:id
```

**Required Scope:** `write`

#### Delete Application

```
DELETE /api/v1/applications/:id
```

**Required Scope:** `admin`

---

### Candidates

#### List Candidates

```
GET /api/v1/candidates
```

**Query Parameters:**
- `page`, `limit` — Pagination
- `status` — Filter by status

**Response:** Paginated list of candidates

---

### Jobs (Saved Jobs)

#### List Saved Jobs

```
GET /api/v1/jobs
```

**Query Parameters:**
- `page`, `limit` — Pagination

---

### Analytics

#### Get Executive Analytics

```
GET /api/v1/analytics
```

**Response:**
```json
{
  "data": {
    "openPositions": 5,
    "totalApplications": 150,
    "totalHires": 12,
    "offerAcceptanceRate": 75,
    "avgTimeToHire": 21,
    "monthlyTrend": [...]
  }
}
```

---

### Organizations

#### List Organizations

```
GET /api/v1/organizations
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Missing API key. Pass as Authorization: Bearer <key>"
}
```

### 403 Forbidden
```json
{
  "error": "Write scope required"
}
```

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    { "code": "too_small", "message": "Company is required" }
  ]
}
```

### 500 Internal Error
```json
{
  "error": "Internal server error"
}
```

---

## Webhooks

### Event Types
- `application.created`
- `application.updated`
- `application.deleted`
- `candidate.created`
- `interview.scheduled`
- `subscription.updated`
- `invoice.paid`

### Webhook Payload
```json
{
  "event": "application.created",
  "timestamp": "2026-07-22T10:00:00.000Z",
  "data": { ... }
}
```

---

## Rate Limits

| Tier | Limit | Window |
|------|-------|--------|
| Free | 50 requests | 1 minute |
| Pro | 200 requests | 1 minute |
| Enterprise | 1000 requests | 1 minute |

---

*API Documentation — HireFlow*
*Version: 1.0.0*

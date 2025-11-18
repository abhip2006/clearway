# API Reference

Comprehensive API documentation for Clearway's REST API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limits](#rate-limits)
4. [Error Codes](#error-codes)
5. [Capital Calls API](#capital-calls-api)
6. [Documents API](#documents-api)
7. [Organizations API](#organizations-api)
8. [Users & Team API](#users--team-api)
9. [Payments API](#payments-api)
10. [Analytics API](#analytics-api)
11. [Webhooks API](#webhooks-api)
12. [GDPR & Compliance API](#gdpr--compliance-api)
13. [Export API](#export-api)

---

## Overview

The Clearway API is a RESTful API that allows you to programmatically access and manage capital calls, documents, payments, and more.

### Base URL

```
Production: https://api.clearway.com
Sandbox:    https://api-sandbox.clearway.com
```

### API Versioning

Current version: **v1**

All endpoints are prefixed with `/api/v1` (except legacy endpoints).

### Response Format

All responses are JSON:

```typescript
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_xxxxxxxxxxxx"
  }
}
```

**Error Response**:
```typescript
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid capital call ID",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00Z",
    "requestId": "req_xxxxxxxxxxxx"
  }
}
```

---

## Authentication

Clearway uses **API keys** for authentication.

### Getting Your API Key

1. Log in to Clearway
2. Navigate to **Settings** > **API Keys**
3. Click **"Create API Key"**
4. Copy the key (shown only once!)

### Using Your API Key

Include the API key in the `Authorization` header:

```bash
curl https://api.clearway.com/api/v1/capital-calls \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"
```

### API Key Types

| Type | Prefix | Environment | Use Case |
|------|--------|-------------|----------|
| **Live** | `sk_live_` | Production | Production applications |
| **Test** | `sk_test_` | Sandbox | Development and testing |

### Security Best Practices

1. **Never expose API keys** in client-side code
2. **Rotate keys regularly** (quarterly recommended)
3. **Use separate keys** for each integration
4. **Revoke unused keys** immediately
5. **Monitor API key usage** in dashboard

---

## Rate Limits

Rate limits prevent abuse and ensure system stability.

### Limits by Plan

| Plan | Requests/Minute | Requests/Hour | Requests/Day |
|------|-----------------|---------------|--------------|
| **Starter** | 60 | 1,000 | 10,000 |
| **Professional** | 300 | 10,000 | 100,000 |
| **Enterprise** | Unlimited | Unlimited | Unlimited |

### Rate Limit Headers

Every API response includes rate limit headers:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 250
X-RateLimit-Reset: 1642248000
```

### Handling Rate Limits

When rate limited, you'll receive a `429 Too Many Requests` response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

**Best Practices**:
- Implement exponential backoff
- Cache responses when possible
- Use webhooks instead of polling

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `204` | No Content |
| `400` | Bad Request |
| `401` | Unauthorized (invalid API key) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `422` | Validation Error |
| `429` | Rate Limited |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Malformed request |
| `INVALID_API_KEY` | API key is invalid or revoked |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `VALIDATION_ERROR` | Request data failed validation |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## Capital Calls API

Manage capital calls programmatically.

### List Capital Calls

```http
GET /api/v1/capital-calls
```

**Query Parameters**:
- `status` (optional): Filter by status (`PENDING_REVIEW`, `APPROVED`, `PAID`)
- `fundName` (optional): Filter by fund name
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Example Request**:
```bash
curl https://api.clearway.com/api/v1/capital-calls?status=APPROVED&limit=10 \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cc_xxxxxxxxxxxx",
      "fundName": "Acme Ventures Fund III",
      "investorEmail": "investor@example.com",
      "amountDue": 100000.00,
      "currency": "USD",
      "dueDate": "2025-02-15",
      "status": "APPROVED",
      "wireInstructions": {
        "bankName": "JP Morgan Chase",
        "accountNumber": "****7890",
        "routingNumber": "021000021",
        "wireReference": "ACME-CC-001"
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "approvedAt": "2025-01-15T11:00:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

### Get Capital Call

```http
GET /api/v1/capital-calls/:id
```

**Example Request**:
```bash
curl https://api.clearway.com/api/v1/capital-calls/cc_xxxxxxxxxxxx \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"
```

### Create Capital Call

```http
POST /api/v1/capital-calls
```

**Request Body**:
```json
{
  "fundName": "Acme Ventures Fund III",
  "investorEmail": "investor@example.com",
  "amountDue": 100000.00,
  "currency": "USD",
  "dueDate": "2025-02-15",
  "wireInstructions": {
    "bankName": "JP Morgan Chase",
    "accountNumber": "1234567890",
    "routingNumber": "021000021",
    "wireReference": "ACME-CC-001"
  },
  "source": "API",
  "externalId": "external_123" // Optional, for tracking
}
```

**Example Request**:
```bash
curl -X POST https://api.clearway.com/api/v1/capital-calls \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "fundName": "Acme Ventures Fund III",
    "investorEmail": "investor@example.com",
    "amountDue": 100000.00,
    "dueDate": "2025-02-15"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "cc_xxxxxxxxxxxx",
    "status": "PENDING_REVIEW",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### Approve Capital Call

```http
POST /api/v1/capital-calls/:id/approve
```

**Example Request**:
```bash
curl -X POST https://api.clearway.com/api/v1/capital-calls/cc_xxxxxxxxxxxx/approve \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"
```

### Reject Capital Call

```http
POST /api/v1/capital-calls/:id/reject
```

**Request Body**:
```json
{
  "reason": "Incorrect amount"
}
```

### Get Calendar

Get capital calls grouped by due date for calendar view.

```http
GET /api/capital-calls/calendar
```

**Query Parameters**:
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)

**Example Response**:
```json
{
  "success": true,
  "data": {
    "2025-02-15": [
      {
        "id": "cc_xxxxxxxxxxxx",
        "fundName": "Acme Ventures Fund III",
        "amountDue": 100000.00,
        "status": "APPROVED"
      }
    ],
    "2025-02-20": [
      {
        "id": "cc_yyyyyyyyyyyy",
        "fundName": "Beta Fund II",
        "amountDue": 50000.00,
        "status": "PENDING_REVIEW"
      }
    ]
  }
}
```

---

## Documents API

Upload and manage documents.

### Upload Document

```http
POST /api/upload
```

**Content-Type**: `multipart/form-data`

**Request Body**:
- `file`: PDF file (required)
- `organizationId`: Organization ID (optional)

**Example Request**:
```bash
curl -X POST https://api.clearway.com/api/upload \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \
  -F "file=@capital-call.pdf"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "doc_xxxxxxxxxxxx",
    "fileName": "capital-call.pdf",
    "status": "PROCESSING",
    "uploadedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Get Document Status

```http
GET /api/documents/:id
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "doc_xxxxxxxxxxxx",
    "fileName": "capital-call.pdf",
    "status": "APPROVED",
    "capitalCall": {
      "id": "cc_xxxxxxxxxxxx",
      "fundName": "Acme Ventures Fund III",
      "amountDue": 100000.00
    }
  }
}
```

### Process Document

Manually trigger document processing (useful for retries).

```http
POST /api/process
```

**Request Body**:
```json
{
  "documentId": "doc_xxxxxxxxxxxx"
}
```

---

## Organizations API

Manage organizations and settings.

### List Organizations

```http
GET /api/organizations
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "org_xxxxxxxxxxxx",
      "name": "Acme Ventures",
      "slug": "acme-ventures",
      "plan": "PROFESSIONAL",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Organization

```http
POST /api/organizations
```

**Request Body**:
```json
{
  "name": "Acme Ventures",
  "slug": "acme-ventures",
  "plan": "STARTER"
}
```

### Get Organization Members

```http
GET /api/organizations/:id/members
```

### Invite Member

```http
POST /api/organizations/:id/invites
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "role": "EDITOR"
}
```

### Update Member Role

```http
PATCH /api/organizations/:id/members/:userId
```

**Request Body**:
```json
{
  "role": "ADMIN",
  "permissions": ["capital_calls:*", "users:read"]
}
```

### Remove Member

```http
DELETE /api/organizations/:id/members/:userId
```

---

## Users & Team API

Manage users and team members.

### Get Current User

```http
GET /api/users/me
```

### List Team Members

```http
GET /api/organizations/:id/members
```

### Invite Team Member

```http
POST /api/invite
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "role": "EDITOR",
  "organizationId": "org_xxxxxxxxxxxx"
}
```

---

## Payments API

Track and reconcile payments.

### List Payments

```http
GET /api/payments
```

**Query Parameters**:
- `status`: Filter by status (`PENDING`, `COMPLETED`, `FAILED`, `RECONCILED`)
- `capitalCallId`: Filter by capital call

### Record Payment

```http
POST /api/payments
```

**Request Body**:
```json
{
  "capitalCallId": "cc_xxxxxxxxxxxx",
  "amount": 100000.00,
  "currency": "USD",
  "paidAt": "2025-01-20T14:30:00Z",
  "paymentMethod": "WIRE",
  "reference": "SWIFT-REF-12345"
}
```

### Reconcile Payment

```http
POST /api/payments/:id/reconcile
```

**Request Body**:
```json
{
  "capitalCallId": "cc_xxxxxxxxxxxx",
  "notes": "Matched via wire reference"
}
```

---

## Analytics API

Access analytics and reporting data.

### Get Dashboard Data

```http
GET /api/analytics/dashboard
```

**Query Parameters**:
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `fundName`: Filter by fund

**Example Response**:
```json
{
  "success": true,
  "data": {
    "totalCapitalCalls": 42,
    "totalAmount": 5000000.00,
    "paidAmount": 3500000.00,
    "outstandingAmount": 1500000.00,
    "averageProcessingTime": 120, // seconds
    "autoMatchRate": 0.95
  }
}
```

### Get Forecast

Predict future capital calls using AI.

```http
GET /api/analytics/forecast
```

### Get Patterns

Analyze capital call patterns.

```http
GET /api/analytics/patterns
```

### Generate Report

```http
POST /api/reports/generate
```

**Request Body**:
```json
{
  "type": "CAPITAL_CALLS_SUMMARY",
  "format": "PDF",
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "fundName": "Acme Ventures Fund III"
  }
}
```

---

## Webhooks API

Manage webhook endpoints (see [Webhook Guide](WEBHOOKS.md) for details).

### List Webhook Endpoints

```http
GET /api/webhooks/marketplace
```

### Create Webhook Endpoint

```http
POST /api/webhooks/marketplace
```

**Request Body**:
```json
{
  "url": "https://your-app.com/webhooks/clearway",
  "events": [
    "capital_call.created",
    "capital_call.approved",
    "payment.received"
  ],
  "enabled": true
}
```

### Update Webhook Endpoint

```http
PATCH /api/webhooks/marketplace/:id
```

### Delete Webhook Endpoint

```http
DELETE /api/webhooks/marketplace/:id
```

### List Webhook Deliveries

Get delivery history for debugging.

```http
GET /api/webhooks/marketplace/deliveries
```

**Query Parameters**:
- `webhookId`: Filter by webhook endpoint
- `status`: Filter by status (`SUCCESS`, `FAILED`)
- `limit`: Number of results

### Test Webhook

Send a test event to your webhook endpoint.

```http
POST /api/webhooks/marketplace/test
```

**Request Body**:
```json
{
  "webhookId": "webhook_xxxxxxxxxxxx",
  "eventType": "capital_call.created"
}
```

---

## GDPR & Compliance API

Handle data subject access requests and compliance.

### Data Subject Access Request (DSAR)

```http
GET /api/gdpr/dsar
```

**Query Parameters**:
- `email`: User email

**Example Response**:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "capitalCalls": [ ... ],
    "documents": [ ... ],
    "payments": [ ... ],
    "exportUrl": "https://clearway.com/exports/user_xxxxxxxxxxxx.json"
  }
}
```

### Export User Data

```http
POST /api/gdpr/export
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "format": "JSON" // or "PDF"
}
```

### Delete User Data (Right to be Forgotten)

```http
POST /api/gdpr/delete
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "reason": "User requested deletion"
}
```

### Audit Logs

```http
GET /api/audit-logs
```

**Query Parameters**:
- `userId`: Filter by user
- `action`: Filter by action type
- `startDate`: Start date
- `endDate`: End date

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log_xxxxxxxxxxxx",
      "action": "capital_call.approved",
      "userId": "user_xxxxxxxxxxxx",
      "timestamp": "2025-01-15T10:30:00Z",
      "ipAddress": "192.168.1.1",
      "metadata": {
        "capitalCallId": "cc_xxxxxxxxxxxx"
      }
    }
  ]
}
```

---

## Export API

Export data in various formats.

### Export Capital Calls

```http
GET /api/export
```

**Query Parameters**:
- `format`: Export format (`CSV`, `XLSX`, `JSON`)
- `status`: Filter by status
- `fundName`: Filter by fund
- `startDate`: Start date
- `endDate`: End date

**Example Request**:
```bash
curl "https://api.clearway.com/api/export?format=CSV&status=APPROVED" \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \
  -o capital-calls.csv
```

**CSV Format**:
```csv
Fund Name,Investor Email,Amount Due,Due Date,Status,Approved At
Acme Ventures Fund III,investor@example.com,100000.00,2025-02-15,APPROVED,2025-01-15 11:00:00
```

**Excel Format**: Multi-sheet workbook with:
- Capital Calls
- Payments
- Summary Statistics

**JSON Format**:
```json
{
  "capitalCalls": [ ... ],
  "summary": {
    "total": 42,
    "totalAmount": 5000000.00
  }
}
```

---

## Pagination

For endpoints that return lists, use pagination:

**Parameters**:
- `limit`: Number of results per page (default: 50, max: 100)
- `offset`: Number of results to skip

**Example**:
```bash
curl "https://api.clearway.com/api/v1/capital-calls?limit=20&offset=40"
```

**Response**:
```json
{
  "data": [ ... ],
  "meta": {
    "total": 142,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

---

## Filtering and Sorting

Most list endpoints support filtering and sorting:

**Filtering**:
```bash
curl "https://api.clearway.com/api/v1/capital-calls?fundName=Acme&status=APPROVED"
```

**Sorting**:
```bash
curl "https://api.clearway.com/api/v1/capital-calls?sort=dueDate&order=desc"
```

---

## Idempotency

For `POST` and `PUT` requests, use idempotency keys to prevent duplicate operations:

```bash
curl -X POST https://api.clearway.com/api/v1/capital-calls \
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \
  -H "Idempotency-Key: unique_key_12345" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

If you retry with the same key within 24 hours, you'll get the same response without creating a duplicate.

---

## SDKs and Libraries

Official SDKs:

- **Node.js**: `npm install @clearway/node`
- **Python**: `pip install clearway`
- **Ruby**: `gem install clearway`
- **PHP**: `composer require clearway/clearway-php`

**Example (Node.js)**:
```typescript
import Clearway from '@clearway/node';

const clearway = new Clearway('sk_live_xxxxxxxxxxxx');

const capitalCalls = await clearway.capitalCalls.list({
  status: 'APPROVED',
  limit: 10
});
```

---

## Support

**Need help with the API?**
- Email: api@clearway.com
- Developer Portal: https://developers.clearway.com
- Status Page: https://status.clearway.com

**Report Issues**:
- GitHub: https://github.com/clearway/api-issues
- Security: security@clearway.com

# Backend Agent - Handoff Documentation

## Overview

The Backend Agent has successfully completed all assigned tasks for the Clearway MVP. This document provides a comprehensive handoff to the Frontend Agent and other team members.

---

## API Endpoints Ready for Frontend Integration

### 1. Document Upload Flow

#### POST `/api/upload`
**Purpose**: Get presigned URL for direct S3/R2 upload

**Request**:
```typescript
{
  fileName: string;     // e.g., "apollo-capital-call.pdf"
  fileSize: number;     // max 10MB (10485760 bytes)
  mimeType: "application/pdf";
}
```

**Response**:
```typescript
{
  uploadUrl: string;    // Presigned S3 URL (valid for 1 hour)
  documentId: string;   // Document ID for tracking
}
```

**Usage Flow**:
```typescript
// Step 1: Get presigned URL
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type
  })
});
const { uploadUrl, documentId } = await response.json();

// Step 2: Upload file directly to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// Step 3: Trigger processing
await fetch('/api/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ documentId })
});
```

**Error Responses**:
- 401: Unauthorized (no Clerk session)
- 400: Validation error (file too large, wrong type, etc.)
- 500: Server error

---

#### POST `/api/process`
**Purpose**: Trigger background processing of uploaded document

**Request**:
```typescript
{
  documentId: string;  // From upload response
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

**Notes**:
- Returns immediately (processing happens in background)
- Document status will change: PENDING → PROCESSING → REVIEW
- Frontend should poll or use webhooks to detect status changes

---

### 2. Capital Call Review & Approval

#### POST `/api/capital-calls/[id]/approve`
**Purpose**: Approve capital call with final reviewed data

**Request**:
```typescript
{
  fundName: string;
  amountDue: number;
  currency: string;       // default: "USD"
  dueDate: string | Date; // ISO format or Date object
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  wireReference?: string;
  investorEmail?: string;
  investorAccount?: string;
}
```

**Response**:
```typescript
{
  id: string;
  fundName: string;
  amountDue: number;
  // ... all fields
  status: "APPROVED";
  reviewedAt: string;     // ISO timestamp
  approvedAt: string;     // ISO timestamp
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Capital call not found or not owned by user
- 400: Validation error
- 500: Server error

---

#### POST `/api/capital-calls/[id]/reject`
**Purpose**: Reject a capital call

**Request**: Empty body (no JSON required)

**Response**:
```typescript
{
  success: boolean;
}
```

**Effects**:
- Capital call status → REJECTED
- Document status → REJECTED
- Records reviewedAt timestamp

---

### 3. Calendar View

#### GET `/api/capital-calls/calendar?month=11&year=2025`
**Purpose**: Get approved capital calls for a specific month

**Query Parameters**:
- `month` (optional): 1-12, defaults to current month
- `year` (optional): 2020-2030, defaults to current year

**Response**:
```typescript
Array<{
  id: string;
  fundName: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  status: "APPROVED";
  // ... other fields
  document: {
    id: string;
    fileName: string;
    fileUrl: string;
    // ... document fields
  };
}>
```

**Usage**:
```typescript
// Get current month
const response = await fetch('/api/capital-calls/calendar');
const capitalCalls = await response.json();

// Get specific month
const response = await fetch('/api/capital-calls/calendar?month=12&year=2025');
```

---

### 4. CSV Export

#### GET `/api/export`
**Purpose**: Export all approved capital calls to CSV

**Query Parameters**: None

**Response**: CSV file download
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="capital-calls.csv"`

**CSV Columns**:
1. Fund Name
2. Amount Due
3. Currency
4. Due Date
5. Bank Name
6. Account Number
7. Routing Number
8. Wire Reference
9. Investor Email
10. Investor Account

**Usage**:
```typescript
// Trigger download
window.location.href = '/api/export';

// Or fetch and process
const response = await fetch('/api/export');
const csvText = await response.text();
```

---

### 5. Fund Administrator API (Phase 2)

#### POST `/api/v1/capital-calls`
**Purpose**: External API for fund administrators to submit capital calls

**Authentication**: Bearer token (API key)
```
Authorization: Bearer fund-admin-api-key-here
```

**Request**:
```typescript
{
  fund_id: string;
  investor_identifiers: {
    email?: string;
    investor_id?: string;
  };
  amount: number;
  currency: string;  // default: "USD"
  due_date: string | Date;
  wire_instructions: {
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    reference?: string;
  };
  document_url?: string;
  metadata?: Record<string, any>;
}
```

**Response**:
```typescript
{
  id: string;           // Created capital call ID
  status: "processed";
  delivered_to: string[];  // Investor emails
  processed_at: string;    // ISO timestamp
}
```

**Error Responses**:
- 401: Invalid or missing API key
- 404: Investor not found in system
- 400: Validation error
- 500: Server error

**Notes**:
- Capital calls from this endpoint are auto-approved
- No AI extraction needed (data comes pre-structured)
- Investor must exist in system (matched by email)

---

## Background Jobs

### 1. Document Processing
**Trigger**: Event `document.uploaded`
**Function**: `process-document`
**File**: `/home/user/clearway/app/api/inngest/functions/process-document.ts`

**Workflow**:
1. Update document status to PROCESSING
2. Call AI extraction function (GPT-4 or Claude)
3. Save extraction to database
4. Update document status to REVIEW (or FAILED if error)

**Retries**: 3 automatic retries on failure

**Monitoring**: Inngest dashboard shows job status and logs

---

### 2. Capital Call Reminders
**Trigger**: Cron `0 9 * * *` (daily at 9am UTC)
**Function**: `send-capital-call-reminders`
**File**: `/home/user/clearway/app/api/inngest/functions/send-reminders.ts`

**Workflow**:
1. Query capital calls due in next 7 days
2. For each call, check days until due
3. Send email if 7, 3, or 1 days before due date
4. Log results (success/failure per email)

**Email Template**: React Email component with professional styling

**Error Handling**: Email failures are logged but don't stop the job

---

## Error Handling Pattern

All endpoints follow this error handling pattern:

```typescript
try {
  // 1. Authentication check
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // 2. Input validation (Zod)
  const data = Schema.parse(body);

  // 3. Authorization check (if needed)
  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource || resource.userId !== userId) {
    return new Response('Not Found', { status: 404 });
  }

  // 4. Business logic
  const result = await performOperation(data);

  // 5. Success response
  return Response.json(result);

} catch (error) {
  // 6. Error handling
  if (error instanceof z.ZodError) {
    return Response.json({ error: error.errors }, { status: 400 });
  }
  console.error('Operation error:', error);
  return new Response('Internal Server Error', { status: 500 });
}
```

---

## Type Safety

All endpoints use Zod for runtime validation AND TypeScript types:

```typescript
// Define schema
const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().max(10 * 1024 * 1024),
  mimeType: z.literal('application/pdf'),
});

// TypeScript type derived from schema
type UploadRequest = z.infer<typeof UploadRequestSchema>;

// Validate and parse in one step
const data = UploadRequestSchema.parse(body);
```

**Benefits**:
- Runtime validation prevents bad data
- TypeScript catches type errors at compile time
- Single source of truth for data shape

---

## Dependencies on Other Agents

### Database Agent
✅ **Completed**: All required models created
- Document model (status tracking)
- CapitalCall model (extraction results)
- User model (authentication)
- FundAdministrator model (API keys)

### AI/ML Agent
✅ **Completed**: Extraction function implemented
- `/home/user/clearway/lib/ai/extract.ts`
- GPT-4o-mini primary model
- Claude 3.5 Sonnet fallback
- Langfuse tracing integrated

### Integration Agent
✅ **Completed**: All services configured
- Clerk (authentication)
- Cloudflare R2 (file storage)
- Inngest (background jobs)
- Resend (email)

### Testing Agent
⏳ **Pending**: Tests to be written
- Unit tests for business logic
- Integration tests for API routes
- E2E tests for complete flows

### Frontend Agent
⏳ **Pending**: UI to consume these APIs
- Upload component with drag & drop
- Review interface (PDF viewer + form)
- Calendar view
- Export button

---

## Frontend Integration Examples

### Example 1: Complete Upload Flow

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UploadDocument() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      // Step 1: Get presigned URL
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, documentId } = await uploadRes.json();

      // Step 2: Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // Step 3: Trigger processing
      await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      // Redirect to review page
      router.push(`/documents/${documentId}/review`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

---

### Example 2: Approve Capital Call

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CapitalCallFormProps {
  capitalCallId: string;
  initialData: {
    fundName: string;
    amountDue: number;
    dueDate: string;
    // ... other fields
  };
}

export function CapitalCallForm({ capitalCallId, initialData }: CapitalCallFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(initialData);

  async function handleApprove() {
    const response = await fetch(`/api/capital-calls/${capitalCallId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert('Capital call approved!');
      router.push('/dashboard');
    } else {
      alert('Approval failed. Please check the form.');
    }
  }

  async function handleReject() {
    const response = await fetch(`/api/capital-calls/${capitalCallId}/reject`, {
      method: 'POST',
    });

    if (response.ok) {
      alert('Capital call rejected.');
      router.push('/dashboard');
    }
  }

  return (
    <form>
      {/* Form fields for editing extracted data */}
      <button type="button" onClick={handleApprove}>
        Approve
      </button>
      <button type="button" onClick={handleReject}>
        Reject
      </button>
    </form>
  );
}
```

---

### Example 3: Calendar View

```typescript
'use client';

import { useEffect, useState } from 'react';

export function CalendarView() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [capitalCalls, setCapitalCalls] = useState([]);

  useEffect(() => {
    async function loadData() {
      const response = await fetch(
        `/api/capital-calls/calendar?month=${month}&year=${year}`
      );
      const data = await response.json();
      setCapitalCalls(data);
    }
    loadData();
  }, [month, year]);

  return (
    <div>
      {/* Month/year selector */}
      <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
          <option key={m} value={m}>Month {m}</option>
        ))}
      </select>

      {/* Calendar grid */}
      {capitalCalls.map(call => (
        <div key={call.id}>
          {call.fundName} - ${call.amountDue} - {call.dueDate}
        </div>
      ))}
    </div>
  );
}
```

---

## Testing Recommendations

### Unit Tests
Test individual functions:
- Zod schema validation
- Date formatting utilities
- Error handling functions

### Integration Tests
Test API routes:
- Upload endpoint with mocked S3
- Approve/reject with test database
- Calendar endpoint with various date ranges
- CSV export format

### E2E Tests
Test complete user flows:
- Upload → Process → Review → Approve
- Upload → Process → Reject
- Calendar view navigation
- CSV export download

---

## Performance Considerations

### Database Queries
- All queries use Prisma (SQL injection safe)
- Indexes on: userId, status, dueDate (see Database Agent schema)
- Use `include` for related data to avoid N+1 queries

### File Uploads
- Direct to S3 (no server bandwidth)
- Presigned URLs expire after 1 hour
- Max file size: 10MB (configurable)

### Background Jobs
- Inngest handles retries and logging
- Jobs run on separate infrastructure (not blocking API)
- Cron jobs scheduled during low-traffic hours

---

## Security Measures

### Authentication
- All endpoints require Clerk authentication (except fund admin API)
- User ID from Clerk session (not from request body)

### Authorization
- Ownership checks on all user-scoped resources
- 404 returned for unauthorized access (not 403, to avoid leaking resource existence)

### Input Validation
- Zod validation on all inputs
- SQL injection prevention via Prisma
- File type restricted to PDF only

### API Keys
- Fund admin API uses secure API keys
- Stored hashed in database (Database Agent responsibility)

---

## Environment Variables Required

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Cloudflare R2 Storage
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=clearway-documents
R2_PUBLIC_URL=https://cdn.clearway.com

# Inngest Background Jobs
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Resend Email
RESEND_API_KEY=re_...

# Database
DATABASE_URL=postgresql://...

# AI/ML (handled by AI/ML Agent)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AZURE_DI_ENDPOINT=https://...
AZURE_DI_KEY=...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

---

## Known Limitations & Future Work

### Current Limitations
1. PDF only (no other document types)
2. 10MB file size limit
3. USD currency only (multi-currency in Phase 2)
4. English language only
5. No audit trail (who changed what, when)

### Future Enhancements (Phase 2+)
1. K-1 tax form processing
2. Distribution tracking
3. Portfolio system integrations
4. Multi-currency support
5. Webhook API for real-time updates
6. Custom fields configuration
7. Audit trail and change history

---

## Contact & Support

For questions about the backend implementation:

**Backend Agent**: All tasks completed ✅
**Status Report**: `/home/user/clearway/.agents/status/backend-status.json`
**Implementation Summary**: `/home/user/clearway/.agents/backend-implementation-summary.md`

---

**Handoff Complete** - Frontend Agent ready to build UI on top of these APIs.

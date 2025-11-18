# Backend Agent ⚙️

## Role
Responsible for all server-side logic, API endpoints, business logic, data processing, and server actions. Builds the core infrastructure that powers the Clearway platform.

## Primary Responsibilities

1. **API Development**
   - Next.js API routes (REST)
   - tRPC endpoints (type-safe internal APIs)
   - Server actions for mutations
   - Request validation and error handling

2. **Business Logic**
   - Capital call processing workflow
   - Document status management
   - User authorization and permissions
   - Data transformations

3. **Data Layer Integration**
   - Prisma query optimization
   - Database transactions
   - Data validation with Zod
   - Caching strategies

4. **Background Job Coordination**
   - Inngest function definitions
   - Job scheduling and retries
   - Webhook handlers

5. **External API Integration**
   - Fund administrator API (Phase 2 prep)
   - Third-party service coordination
   - API versioning

## Tech Stack

### Core Framework
- **Next.js 15 API Routes** - Serverless endpoints
- **tRPC** - End-to-end type-safe APIs
- **Zod** - Runtime validation + TypeScript types
- **TypeScript** - Type safety across the stack

### Database & ORM
- **Prisma** - Type-safe database queries
- **PostgreSQL** - Production database (Neon)

### Background Jobs
- **Inngest** - Serverless background jobs
- **Redis** - Caching (optional, for performance)

### Utilities
- **date-fns** - Date manipulation
- **decimal.js** - Precise currency calculations
- **csv-stringify** - CSV generation

## MVP Features to Build

### Week 1: Document Upload API

**Task BE-001: Upload Presigned URL Endpoint**
```typescript
// app/api/upload/route.ts

import { auth } from '@clerk/nextjs/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@/lib/db';
import { z } from 'zod';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
  mimeType: z.literal('application/pdf'),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileSize, mimeType } = UploadRequestSchema.parse(body);

    // Generate unique file key
    const fileKey = `${userId}/${Date.now()}-${fileName}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Create document record
    const document = await db.document.create({
      data: {
        fileName,
        fileSize,
        mimeType,
        fileUrl: `${process.env.R2_PUBLIC_URL}/${fileKey}`,
        userId,
        status: 'PENDING',
      },
    });

    return Response.json({
      uploadUrl,
      documentId: document.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error('Upload error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

**Acceptance Criteria**:
- ✅ Generates presigned S3 URL
- ✅ Creates document record in DB
- ✅ Validates file size and type
- ✅ User authentication required
- ✅ Error handling for all edge cases

**Dependencies**:
- Integration Agent: S3/R2 configured
- Database Agent: Document model created

---

**Task BE-002: Trigger Processing Job**
```typescript
// app/api/process/route.ts

import { auth } from '@clerk/nextjs/server';
import { inngest } from '@/lib/inngest';
import { db } from '@/lib/db';
import { z } from 'zod';

const ProcessRequestSchema = z.object({
  documentId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { documentId } = ProcessRequestSchema.parse(body);

    // Verify document belongs to user
    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== userId) {
      return new Response('Not Found', { status: 404 });
    }

    // Trigger background processing
    await inngest.send({
      name: 'document.uploaded',
      data: { documentId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Process trigger error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

**Acceptance Criteria**:
- ✅ Triggers Inngest background job
- ✅ Verifies document ownership
- ✅ Returns immediately (async processing)

**Dependencies**:
- Integration Agent: Inngest configured
- Database Agent: Document model

---

### Week 2: Document Processing Background Job

**Task BE-003: Inngest Document Processing Function**
```typescript
// app/api/inngest/functions/process-document.ts

import { inngest } from '@/lib/inngest';
import { extractCapitalCall } from '@/lib/ai/extract';
import { db } from '@/lib/db';

export const processDocument = inngest.createFunction(
  {
    id: 'process-document',
    retries: 3,
  },
  { event: 'document.uploaded' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Update status to PROCESSING
    await step.run('update-status-processing', async () => {
      await db.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });
    });

    // Step 2: Extract capital call data (calls AI/ML Agent's function)
    const extraction = await step.run('extract-data', async () => {
      try {
        return await extractCapitalCall(documentId);
      } catch (error) {
        console.error('Extraction failed:', error);
        throw error;
      }
    });

    // Step 3: Save extraction to database
    await step.run('save-extraction', async () => {
      try {
        await db.capitalCall.create({
          data: {
            documentId,
            userId: extraction.userId,
            fundName: extraction.data.fundName,
            investorEmail: extraction.data.investorEmail,
            investorAccount: extraction.data.investorAccount,
            amountDue: extraction.data.amountDue,
            currency: extraction.data.currency,
            dueDate: extraction.data.dueDate,
            bankName: extraction.data.bankName,
            accountNumber: extraction.data.accountNumber,
            routingNumber: extraction.data.routingNumber,
            wireReference: extraction.data.wireReference,
            confidenceScores: extraction.data.confidenceScores,
            rawExtraction: extraction.data.rawExtraction,
            status: 'PENDING_REVIEW',
          },
        });

        await db.document.update({
          where: { id: documentId },
          data: { status: 'REVIEW' },
        });
      } catch (error) {
        // Mark as failed if DB save fails
        await db.document.update({
          where: { id: documentId },
          data: { status: 'FAILED' },
        });
        throw error;
      }
    });

    return { success: true, documentId };
  }
);
```

**Acceptance Criteria**:
- ✅ Three-step processing workflow
- ✅ Status updates at each step
- ✅ Error handling with retries
- ✅ Failed documents marked appropriately

**Dependencies**:
- AI/ML Agent: extractCapitalCall function ready
- Database Agent: CapitalCall model created
- Integration Agent: Inngest configured

---

### Week 3: Review & Approval APIs

**Task BE-004: Approve Capital Call**
```typescript
// app/api/capital-calls/[id]/approve/route.ts

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const ApproveSchema = z.object({
  fundName: z.string().min(1),
  amountDue: z.number().positive(),
  currency: z.string().default('USD'),
  dueDate: z.coerce.date(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  wireReference: z.string().optional(),
  investorEmail: z.string().email().optional(),
  investorAccount: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validatedData = ApproveSchema.parse(body);

    // Verify ownership
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.id },
      include: { document: true },
    });

    if (!capitalCall || capitalCall.userId !== userId) {
      return new Response('Not Found', { status: 404 });
    }

    // Update capital call with reviewed data
    const updated = await db.capitalCall.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    // Update document status
    await db.document.update({
      where: { id: capitalCall.documentId },
      data: { status: 'APPROVED' },
    });

    return Response.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error('Approval error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

**Acceptance Criteria**:
- ✅ Validates all fields with Zod
- ✅ Verifies user owns the capital call
- ✅ Updates both CapitalCall and Document status
- ✅ Records approval timestamp

**Dependencies**:
- Database Agent: Status update queries

---

**Task BE-005: Reject Capital Call**
```typescript
// app/api/capital-calls/[id]/reject/route.ts

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.id },
    });

    if (!capitalCall || capitalCall.userId !== userId) {
      return new Response('Not Found', { status: 404 });
    }

    await db.capitalCall.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
      },
    });

    await db.document.update({
      where: { id: capitalCall.documentId },
      data: { status: 'REJECTED' },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Rejection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

**Acceptance Criteria**:
- ✅ Marks capital call as rejected
- ✅ Updates document status
- ✅ Records review timestamp

---

### Week 4: Calendar API

**Task BE-006: Calendar Data Endpoint**
```typescript
// app/api/capital-calls/calendar/route.ts

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const CalendarQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2030).optional(),
});

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = CalendarQuerySchema.parse({
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    });

    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const capitalCalls = await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        document: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return Response.json(capitalCalls);
  } catch (error) {
    console.error('Calendar API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

**Acceptance Criteria**:
- ✅ Returns capital calls for specified month
- ✅ Defaults to current month
- ✅ Only returns approved calls
- ✅ Includes related document data

---

### Week 4: Email Alert Job

**Task BE-007: Capital Call Reminder Job**
```typescript
// app/api/inngest/functions/send-reminders.ts

import { inngest } from '@/lib/inngest';
import { Resend } from 'resend';
import { CapitalCallReminder } from '@/lib/email/templates/capital-call-reminder';
import { db } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendReminders = inngest.createFunction(
  {
    id: 'send-capital-call-reminders',
  },
  { cron: '0 9 * * *' }, // Daily at 9am UTC
  async ({ step }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    // Get all capital calls due in next 7 days
    const upcomingCalls = await step.run('fetch-upcoming-calls', async () => {
      return await db.capitalCall.findMany({
        where: {
          status: 'APPROVED',
          dueDate: {
            gte: today,
            lte: sevenDaysFromNow,
          },
        },
        include: {
          user: true,
        },
      });
    });

    // Send reminders
    const results = await step.run('send-emails', async () => {
      const promises = upcomingCalls.map(async (call) => {
        const daysUntilDue = Math.ceil(
          (call.dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Send reminder at 7, 3, and 1 days before
        if ([7, 3, 1].includes(daysUntilDue)) {
          try {
            await resend.emails.send({
              from: 'Clearway <alerts@clearway.com>',
              to: call.user.email,
              subject: `Capital Call Due in ${daysUntilDue} Day${daysUntilDue > 1 ? 's' : ''}`,
              react: CapitalCallReminder({
                fundName: call.fundName,
                amountDue: call.amountDue,
                dueDate: call.dueDate,
              }),
            });
            return { success: true, callId: call.id };
          } catch (error) {
            console.error(`Failed to send reminder for ${call.id}:`, error);
            return { success: false, callId: call.id, error };
          }
        }
        return { skipped: true, callId: call.id };
      });

      return await Promise.all(promises);
    });

    return {
      totalCalls: upcomingCalls.length,
      results,
    };
  }
);
```

**Acceptance Criteria**:
- ✅ Runs daily at 9am UTC
- ✅ Sends reminders at 7, 3, 1 days before due date
- ✅ Error handling for failed emails
- ✅ Logs results for monitoring

**Dependencies**:
- Integration Agent: Resend email configured

---

### Week 5: Export API

**Task BE-008: CSV Export**
```typescript
// app/api/export/route.ts

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stringify } from 'csv-stringify/sync';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const capitalCalls = await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const csvData = capitalCalls.map(call => ({
      'Fund Name': call.fundName,
      'Amount Due': call.amountDue,
      'Currency': call.currency,
      'Due Date': call.dueDate.toISOString().split('T')[0],
      'Bank Name': call.bankName || '',
      'Account Number': call.accountNumber || '',
      'Routing Number': call.routingNumber || '',
      'Wire Reference': call.wireReference || '',
      'Investor Email': call.investorEmail || '',
      'Investor Account': call.investorAccount || '',
    }));

    const csv = stringify(csvData, {
      header: true,
      columns: [
        'Fund Name',
        'Amount Due',
        'Currency',
        'Due Date',
        'Bank Name',
        'Account Number',
        'Routing Number',
        'Wire Reference',
        'Investor Email',
        'Investor Account',
      ],
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="capital-calls.csv"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

**Acceptance Criteria**:
- ✅ Exports all approved capital calls
- ✅ CSV format with headers
- ✅ Downloadable file
- ✅ All key fields included

---

### Week 5: Fund Admin API (Phase 2 Prep)

**Task BE-009: Fund Admin Capital Call Ingestion**
```typescript
// app/api/v1/capital-calls/route.ts

import { db } from '@/lib/db';
import { z } from 'zod';

const FundAdminCapitalCallSchema = z.object({
  fund_id: z.string(),
  investor_identifiers: z.object({
    email: z.string().email().optional(),
    investor_id: z.string().optional(),
  }),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  due_date: z.coerce.date(),
  wire_instructions: z.object({
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    routing_number: z.string().optional(),
    reference: z.string().optional(),
  }),
  document_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    // Verify API key from fund administrator
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Validate API key and get fund admin
    const fundAdmin = await db.fundAdministrator.findUnique({
      where: { apiKey },
    });

    if (!fundAdmin) {
      return new Response('Invalid API key', { status: 401 });
    }

    const body = await req.json();
    const data = FundAdminCapitalCallSchema.parse(body);

    // Find user by investor identifiers
    let user = null;
    if (data.investor_identifiers.email) {
      user = await db.user.findUnique({
        where: { email: data.investor_identifiers.email },
      });
    }

    if (!user) {
      // Queue for manual matching or notify admin
      console.log('User not found for investor:', data.investor_identifiers);
      return Response.json(
        { error: 'Investor not found in system' },
        { status: 404 }
      );
    }

    // Create capital call directly (no document processing needed)
    const capitalCall = await db.capitalCall.create({
      data: {
        userId: user.id,
        fundName: data.fund_id,
        investorEmail: data.investor_identifiers.email,
        investorAccount: data.investor_identifiers.investor_id,
        amountDue: data.amount,
        currency: data.currency,
        dueDate: data.due_date,
        bankName: data.wire_instructions.bank_name,
        accountNumber: data.wire_instructions.account_number,
        routingNumber: data.wire_instructions.routing_number,
        wireReference: data.wire_instructions.reference,
        status: 'APPROVED', // From fund admin = auto-approved
        rawExtraction: data.metadata,
        confidenceScores: { fundName: 1.0, amountDue: 1.0, dueDate: 1.0 },
      },
    });

    return Response.json(
      {
        id: capitalCall.id,
        status: 'processed',
        delivered_to: [user.email],
        processed_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error('Fund admin API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

**Acceptance Criteria**:
- ✅ API key authentication
- ✅ Creates capital call from fund admin data
- ✅ Auto-approves (no review needed)
- ✅ Maps investor to user
- ✅ Returns structured response

**Note**: This API is built in Phase 1 but not used until Phase 2 when fund admins integrate.

**Dependencies**:
- Database Agent: FundAdministrator model created

---

## Handoff Requirements

### To Frontend Agent
```markdown
## API Ready: Upload Endpoint

**Endpoint**: POST /api/upload

**Request**:
```typescript
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'apollo-capital-call.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf'
  })
});
```

**Response**:
```json
{
  "uploadUrl": "https://signed-url...",
  "documentId": "abc123"
}
```

**Usage**:
1. Call /api/upload to get presigned URL
2. Upload file directly to presigned URL (PUT request)
3. Call /api/process with documentId to trigger extraction

**Tests**: See `/tests/api/upload.test.ts`
```

### From AI/ML Agent
```markdown
## Function Needed: extractCapitalCall

**Signature**:
```typescript
async function extractCapitalCall(documentId: string): Promise<{
  userId: string;
  data: {
    fundName: string;
    investorEmail?: string;
    investorAccount?: string;
    amountDue: number;
    currency: string;
    dueDate: Date;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    wireReference?: string;
    confidenceScores: {
      fundName: number;
      amountDue: number;
      dueDate: number;
    };
    rawExtraction: any;
  };
}>
```

**Usage**: Called from Inngest background job to extract capital call data from uploaded PDF.
```

## Quality Standards

### API Design
- RESTful conventions
- Consistent error responses
- Proper HTTP status codes
- Input validation on all endpoints

### Error Handling
```typescript
// Standard error response format
{
  "error": {
    "message": "User-friendly message",
    "code": "ERROR_CODE",
    "details": {} // Optional, for validation errors
  }
}
```

### Performance
- Database query optimization
- N+1 query prevention
- Proper indexing (coordinate with Database Agent)
- Caching where appropriate

### Security
- All endpoints require authentication
- Input validation with Zod
- SQL injection prevention (Prisma ORM)
- Rate limiting on public endpoints

## Testing

### API Tests (Vitest)
```typescript
// tests/api/upload.test.ts

import { POST } from '@/app/api/upload/route';

describe('POST /api/upload', () => {
  it('creates document and returns presigned URL', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'test.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploadUrl).toBeDefined();
    expect(data.documentId).toBeDefined();
  });

  it('rejects files > 10MB', async () => {
    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'test.pdf',
        fileSize: 11 * 1024 * 1024,
        mimeType: 'application/pdf',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

## Status Reporting

Location: `.agents/status/backend-status.json`

```json
{
  "agent": "backend-agent",
  "date": "2025-11-20",
  "status": "in-progress",
  "current_week": 3,
  "completed_tasks": ["BE-001", "BE-002", "BE-003", "BE-004", "BE-005"],
  "in_progress_tasks": ["BE-006"],
  "blocked_tasks": [],
  "upcoming_tasks": ["BE-007", "BE-008", "BE-009"],
  "dependencies": {
    "waiting_for": "ai-ml-agent:extraction-function-ready"
  },
  "metrics": {
    "endpoints_built": 8,
    "background_jobs": 2,
    "test_coverage": "82%"
  }
}
```

---

**Backend Agent is ready to build robust, scalable APIs for Clearway MVP.**

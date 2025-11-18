# Database Layer Handoff Documentation

**Database Agent** - Clearway MVP
**Date**: November 18, 2025
**Status**: All Week 0-4 tasks completed ✅

---

## Executive Summary

The database layer for Clearway MVP is fully implemented and ready for integration. All core models, relationships, indexes, query helpers, and validation schemas are in place.

### Completed Deliverables

- ✅ **Task DB-001**: Prisma schema with 5 core models
- ✅ **Task DB-002**: Migration scripts ready (pending database connection)
- ✅ **Task DB-003**: Prisma client wrapper with 10 query helpers
- ✅ **Task DB-004**: Zod validation schemas for all models
- ✅ **Task DB-005**: Seed script with realistic demo data

---

## For Backend Agent

### Import Database Client

```typescript
import { db, queries } from '@/lib/db';
import { CapitalCallSchema, DocumentUploadSchema } from '@/lib/schemas';
```

### Example: Create Capital Call

```typescript
// Validate input
const input = CapitalCallSchema.parse(req.body);

// Create capital call
const capitalCall = await db.capitalCall.create({
  data: {
    documentId: 'doc_123',
    userId: 'user_456',
    fundName: input.fundName,
    amountDue: input.amountDue,
    dueDate: input.dueDate,
    status: 'PENDING_REVIEW',
    // ... other fields
  },
});
```

### Available Query Helpers

```typescript
// Get pending documents
const pending = await queries.getPendingDocuments(userId);

// Get upcoming capital calls (next 7 days)
const upcoming = await queries.getUpcomingCapitalCalls(userId);

// Get capital calls for month
const monthly = await queries.getCapitalCallsForMonth(userId, 2025, 12);

// Get document with capital call
const doc = await queries.getDocumentWithCapitalCall(docId, userId);

// Get user by Clerk ID
const user = await queries.getUserByClerkId(clerkId);

// Get overdue capital calls
const overdue = await queries.getOverdueCapitalCalls(userId);
```

### API Route Example

```typescript
// app/api/capital-calls/route.ts
import { db } from '@/lib/db';
import { CapitalCallQuerySchema } from '@/lib/schemas';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = CapitalCallQuerySchema.parse({
    status: searchParams.get('status'),
    limit: searchParams.get('limit'),
  });

  const capitalCalls = await db.capitalCall.findMany({
    where: {
      userId: req.user.id,
      status: query.status,
    },
    include: { document: true },
    take: query.limit,
  });

  return Response.json(capitalCalls);
}
```

---

## For Frontend Agent

### Import Types

```typescript
import {
  Document,
  CapitalCall,
  DocumentStatus,
  CapitalCallStatus,
  User,
  Organization,
} from '@prisma/client';
```

### Type Extensions

```typescript
// Document with Capital Call
interface DocumentWithCapitalCall extends Document {
  capitalCall: CapitalCall | null;
}

// Capital Call with Document
interface CapitalCallWithDocument extends CapitalCall {
  document: Document;
}

// User with Organization
interface UserWithOrganization extends User {
  organization: Organization | null;
}
```

### Component Props Example

```typescript
interface ReviewPageProps {
  document: DocumentWithCapitalCall;
}

function ReviewPage({ document }: ReviewPageProps) {
  return (
    <div>
      <h1>{document.fileName}</h1>
      {document.capitalCall && (
        <div>
          <p>Fund: {document.capitalCall.fundName}</p>
          <p>Amount: ${document.capitalCall.amountDue.toString()}</p>
          <p>Due: {new Date(document.capitalCall.dueDate).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}
```

### Using Enums

```typescript
import { DocumentStatus } from '@prisma/client';

const statusColor = {
  [DocumentStatus.PENDING]: 'yellow',
  [DocumentStatus.PROCESSING]: 'blue',
  [DocumentStatus.REVIEW]: 'orange',
  [DocumentStatus.APPROVED]: 'green',
  [DocumentStatus.REJECTED]: 'red',
  [DocumentStatus.FAILED]: 'red',
};
```

---

## For AI/ML Agent

### Storing Extraction Results

```typescript
import { db } from '@/lib/db';

// After AI extraction
const result = await extractCapitalCall(documentUrl);

// Store with confidence scores
await db.capitalCall.create({
  data: {
    documentId: document.id,
    userId: document.userId,
    fundName: result.fundName,
    amountDue: result.amountDue,
    dueDate: result.dueDate,
    // Store confidence scores
    confidenceScores: {
      fundName: result.confidence.fundName,
      amountDue: result.confidence.amountDue,
      dueDate: result.confidence.dueDate,
      bankName: result.confidence.bankName,
    },
    // Store raw extraction for debugging
    rawExtraction: {
      model: 'gpt-4o-mini',
      extractedAt: new Date().toISOString(),
      rawText: result.rawText,
      processingTime: result.processingTime,
    },
    status: result.needsReview ? 'PENDING_REVIEW' : 'APPROVED',
  },
});

// Update document status
await db.document.update({
  where: { id: document.id },
  data: {
    status: result.needsReview ? 'REVIEW' : 'APPROVED',
  },
});
```

### Confidence Score Tracking

```typescript
// Query low confidence extractions
const needsReview = await db.capitalCall.findMany({
  where: {
    status: 'PENDING_REVIEW',
    confidenceScores: {
      path: ['amountDue'],
      lt: 0.9, // Amount confidence < 90%
    },
  },
});
```

---

## For Integration Agent

### Clerk User Sync

```typescript
import { db } from '@/lib/db';

// On Clerk webhook (user.created)
async function handleUserCreated(clerkUser: ClerkUser) {
  const user = await db.user.create({
    data: {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: `${clerkUser.firstName} ${clerkUser.lastName}`,
    },
  });

  return user;
}

// On Clerk webhook (user.deleted)
async function handleUserDeleted(clerkUserId: string) {
  await db.user.delete({
    where: { clerkId: clerkUserId },
  });
}
```

### Storage Integration

```typescript
// After uploading to R2
const document = await db.document.create({
  data: {
    fileName: file.name,
    fileUrl: uploadResult.url,
    fileSize: file.size,
    mimeType: file.type,
    userId: user.id,
    organizationId: user.organizationId,
    status: 'PENDING',
  },
});
```

---

## For Testing Agent

### Test Setup

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(async () => {
  // Clean database between tests
  await prisma.capitalCall.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### Test Factories

```typescript
// Create test user
async function createTestUser(overrides = {}) {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      clerkId: 'test_' + Math.random(),
      name: 'Test User',
      ...overrides,
    },
  });
}

// Create test document
async function createTestDocument(userId: string, overrides = {}) {
  return await prisma.document.create({
    data: {
      fileName: 'test.pdf',
      fileUrl: 'https://example.com/test.pdf',
      fileSize: 1024,
      userId,
      ...overrides,
    },
  });
}
```

### Using Seed Data

```bash
# Load seed data for tests
npx prisma db seed

# Or use in test setup
import seed from '../prisma/seed';

beforeAll(async () => {
  await seed();
});
```

---

## Database Schema Reference

### User Model

```typescript
{
  id: string              // cuid
  clerkId: string         // unique, indexed
  email: string           // unique, indexed
  name: string?
  organizationId: string? // indexed
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Organization Model

```typescript
{
  id: string        // cuid
  name: string
  slug: string      // unique, indexed
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Document Model

```typescript
{
  id: string              // cuid
  fileName: string
  fileUrl: string         // S3/R2 URL
  fileSize: number        // bytes
  mimeType: string        // default: "application/pdf"
  uploadedAt: DateTime    // indexed DESC
  updatedAt: DateTime
  userId: string          // indexed
  organizationId: string? // indexed
  status: DocumentStatus  // indexed
}
```

### CapitalCall Model

```typescript
{
  id: string
  fundName: string                // indexed
  investorEmail: string?
  investorAccount: string?
  amountDue: Decimal              // Decimal(15,2)
  currency: string                // default: "USD"
  dueDate: DateTime               // indexed
  bankName: string?
  accountNumber: string?
  routingNumber: string?
  wireReference: string?
  extractedAt: DateTime
  reviewedAt: DateTime?
  approvedAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
  confidenceScores: Json?
  rawExtraction: Json?
  documentId: string              // unique
  userId: string                  // indexed
  status: CapitalCallStatus       // indexed
}
```

### FundAdministrator Model

```typescript
{
  id: string
  name: string
  slug: string          // unique, indexed
  apiKey: string        // unique, indexed
  isActive: boolean     // default: true
  contactEmail: string?
  website: string?
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## Common Patterns

### Create User on First Login

```typescript
// middleware/auth.ts
const { userId: clerkId } = auth();

let user = await queries.getUserByClerkId(clerkId);

if (!user) {
  const clerkUser = await currentUser();
  user = await db.user.create({
    data: {
      clerkId,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: `${clerkUser.firstName} ${clerkUser.lastName}`,
    },
  });
}
```

### Document Processing Workflow

```typescript
// 1. Upload document
const doc = await db.document.create({
  data: { /* ... */ status: 'PENDING' }
});

// 2. Start processing
await db.document.update({
  where: { id: doc.id },
  data: { status: 'PROCESSING' }
});

// 3. Create capital call
const capitalCall = await db.capitalCall.create({
  data: { documentId: doc.id, /* ... */ }
});

// 4. Mark for review or approved
await db.document.update({
  where: { id: doc.id },
  data: { status: needsReview ? 'REVIEW' : 'APPROVED' }
});
```

### Calendar View Query

```typescript
// Get all capital calls for a month
const year = 2025;
const month = 12; // December

const calls = await queries.getCapitalCallsForMonth(userId, year, month);

// Group by date
const byDate = calls.reduce((acc, call) => {
  const date = call.dueDate.toISOString().split('T')[0];
  if (!acc[date]) acc[date] = [];
  acc[date].push(call);
  return acc;
}, {});
```

---

## Performance Considerations

### Pagination

```typescript
// Cursor-based pagination
const documents = await db.document.findMany({
  where: { userId },
  take: 20,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { uploadedAt: 'desc' },
});
```

### Selective Loading

```typescript
// Only select needed fields
const users = await db.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
  },
});
```

### Batch Operations

```typescript
// Use transaction for multiple operations
await db.$transaction([
  db.document.update({ where: { id: doc1.id }, data: { status: 'APPROVED' } }),
  db.document.update({ where: { id: doc2.id }, data: { status: 'APPROVED' } }),
  db.capitalCall.updateMany({ where: { userId }, data: { status: 'APPROVED' } }),
]);
```

---

## Migration Instructions

### First-Time Setup

```bash
# 1. Set DATABASE_URL in .env
DATABASE_URL="postgresql://..."

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Generate Prisma client
npx prisma generate

# 4. Run migration
npx prisma migrate dev --name init

# 5. Seed database (optional)
npx prisma db seed
```

### Adding New Migrations

```bash
# 1. Modify prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name description_of_changes

# 3. Generate client
npx prisma generate
```

---

## Troubleshooting

### Issue: Cannot find module '@prisma/client'

```bash
npx prisma generate
```

### Issue: Migration fails

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Force push schema
npx prisma db push --force-reset
```

### Issue: Type errors

```bash
# Regenerate Prisma client
rm -rf node_modules/.prisma
npx prisma generate
```

---

## Next Steps (Week 6+)

### Planned Enhancements

- **DB-006**: Production migration strategy documentation
- **DB-007**: Query performance monitoring
- Add audit logging for sensitive operations
- Implement soft deletes for compliance
- Add full-text search for documents
- Create database backup procedures

---

## Contact

For questions about the database layer:
- Review: `prisma/README.md`
- Status: `.agents/status/database-status.json`
- Schema: `prisma/schema.prisma`

**Database Agent** - Ready for integration ✅

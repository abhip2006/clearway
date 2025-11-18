# Database Agent 🗄️

## Role
Responsible for all database schema design, migrations, query optimization, and data integrity. Ensures the Clearway platform has a solid, scalable data foundation.

## Primary Responsibilities

1. **Schema Design**
   - Prisma schema modeling
   - Relationship design
   - Index optimization
   - Constraint enforcement

2. **Migrations**
   - Create and execute migrations
   - Data migration scripts
   - Rollback strategies
   - Production migration planning

3. **Query Optimization**
   - Efficient query patterns
   - N+1 query prevention
   - Index usage analysis
   - Performance monitoring

4. **Data Integrity**
   - Validation rules
   - Foreign key constraints
   - Unique constraints
   - Cascading deletes

5. **Seed Data**
   - Development seed data
   - Testing fixtures
   - Demo data

## Tech Stack

- **PostgreSQL** - Production database (Neon)
- **Prisma ORM** - Type-safe database client
- **Zod** - Runtime validation schemas
- **TypeScript** - Type definitions

## MVP Database Schema

### Week 0-1: Core Models

**Task DB-001: Initial Prisma Schema**
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER & ORGANIZATION MODELS
// ============================================

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organization   Organization? @relation(fields: [organizationId], references: [id])
  organizationId String?

  documents    Document[]
  capitalCalls CapitalCall[]

  @@index([clerkId])
  @@index([email])
  @@index([organizationId])
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  documents Document[]

  @@index([slug])
}

// ============================================
// DOCUMENT MODELS
// ============================================

model Document {
  id          String   @id @default(cuid())
  fileName    String
  fileUrl     String   // S3/R2 URL
  fileSize    Int      // bytes
  mimeType    String   @default("application/pdf")
  uploadedAt  DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Ownership
  userId         String
  user           User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Processing status
  status DocumentStatus @default(PENDING)

  // Relations
  capitalCall CapitalCall?

  @@index([userId])
  @@index([organizationId])
  @@index([status])
  @@index([uploadedAt(sort: Desc)])
}

enum DocumentStatus {
  PENDING      // Uploaded, not processed
  PROCESSING   // AI extraction in progress
  REVIEW       // Needs human review
  APPROVED     // Reviewed and approved
  REJECTED     // Rejected by user
  FAILED       // Processing failed
}

// ============================================
// CAPITAL CALL MODELS
// ============================================

model CapitalCall {
  id        String   @id @default(cuid())

  // Extracted fields
  fundName         String
  investorEmail    String?
  investorAccount  String?
  amountDue        Decimal  @db.Decimal(15, 2) // Use Decimal for money
  currency         String   @default("USD")
  dueDate          DateTime

  // Wire instructions
  bankName         String?
  accountNumber    String?
  routingNumber    String?
  wireReference    String?

  // Metadata
  extractedAt  DateTime  @default(now())
  reviewedAt   DateTime?
  approvedAt   DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Confidence scores (0-1)
  confidenceScores Json?

  // Raw extraction for debugging
  rawExtraction    Json?

  // Relations
  documentId String @unique
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  userId     String
  user       User @relation(fields: [userId], references: [id], onDelete: Cascade)

  status     CapitalCallStatus @default(PENDING_REVIEW)

  @@index([userId])
  @@index([dueDate])
  @@index([status])
  @@index([fundName])
}

enum CapitalCallStatus {
  PENDING_REVIEW // Extracted, waiting for review
  APPROVED       // Reviewed and approved
  REJECTED       // Rejected by user
  PAID           // Future: payment tracking
}

// ============================================
// FUND ADMINISTRATOR MODELS (Phase 2)
// ============================================

model FundAdministrator {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  apiKey      String   @unique
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Metadata
  contactEmail String?
  website      String?

  @@index([apiKey])
  @@index([slug])
}
```

**Acceptance Criteria**:
- ✅ All core models defined
- ✅ Proper relationships with foreign keys
- ✅ Indexes on frequently queried fields
- ✅ Cascade deletes configured
- ✅ Money stored as Decimal type
- ✅ Timestamps on all tables

**Dependencies**: None (can start immediately)

---

**Task DB-002: Initial Migration**
```bash
# Create initial migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

**Files Created**:
- `prisma/migrations/TIMESTAMP_init/migration.sql`
- `node_modules/.prisma/client/` (generated)

**Acceptance Criteria**:
- ✅ Migration creates all tables
- ✅ All indexes created
- ✅ Constraints enforced
- ✅ Prisma client generated

---

### Week 2: Query Helpers

**Task DB-003: Prisma Client Wrapper**
```typescript
// lib/db.ts

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Helpful query extensions
export const queries = {
  // Get user's pending documents
  async getPendingDocuments(userId: string) {
    return await db.document.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING', 'REVIEW'] },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  },

  // Get upcoming capital calls
  async getUpcomingCapitalCalls(userId: string, daysAhead: number = 7) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + daysAhead);

    return await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: {
          gte: today,
          lte: future,
        },
      },
      include: { document: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Get capital calls for calendar
  async getCapitalCallsForMonth(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { document: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  // Get document with capital call
  async getDocumentWithCapitalCall(documentId: string, userId: string) {
    return await db.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        capitalCall: true,
      },
    });
  },
};
```

**Acceptance Criteria**:
- ✅ Singleton Prisma client
- ✅ Development logging
- ✅ Query helpers for common operations
- ✅ Type-safe returns

---

### Week 3: Data Validation Schemas

**Task DB-004: Zod Validation Schemas**
```typescript
// lib/schemas.ts

import { z } from 'zod';

// Capital Call Validation
export const CapitalCallSchema = z.object({
  fundName: z.string().min(1, 'Fund name is required').max(255),
  investorEmail: z.string().email().optional().or(z.literal('')),
  investorAccount: z.string().optional(),
  amountDue: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 letters').default('USD'),
  dueDate: z.coerce.date(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  wireReference: z.string().optional(),
});

// Document Upload Validation
export const DocumentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().max(10 * 1024 * 1024, 'File must be under 10MB'),
  mimeType: z.literal('application/pdf'),
});

// User Profile Validation
export const UserProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email(),
});

// Calendar Query Validation
export const CalendarQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2030).optional(),
});

// Export for use in API routes
export type CapitalCallInput = z.infer<typeof CapitalCallSchema>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
export type UserProfileInput = z.infer<typeof UserProfileSchema>;
export type CalendarQueryInput = z.infer<typeof CalendarQuerySchema>;
```

**Acceptance Criteria**:
- ✅ All input validation schemas
- ✅ Type exports for TypeScript
- ✅ User-friendly error messages
- ✅ Proper constraints (min, max, regex)

---

### Week 4: Seed Data

**Task DB-005: Seed Script for Development**
```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@clearway.com' },
    update: {},
    create: {
      email: 'test@clearway.com',
      name: 'Test User',
      clerkId: 'test_clerk_id',
    },
  });

  console.log('Created user:', user.id);

  // Create test documents with capital calls
  const capitalCalls = [
    {
      fundName: 'Apollo Fund XI',
      amountDue: 250000,
      dueDate: new Date('2025-12-15'),
      bankName: 'JPMorgan Chase',
      accountNumber: 'XXXXX1234',
      routingNumber: '021000021',
      wireReference: 'APOLLO-XI-CC-001',
    },
    {
      fundName: 'Blackstone Real Estate Fund VII',
      amountDue: 500000,
      dueDate: new Date('2025-12-20'),
      bankName: 'Bank of America',
      accountNumber: 'XXXXX5678',
      routingNumber: '026009593',
      wireReference: 'BX-REFVII-CC-042',
    },
    {
      fundName: 'KKR Global Impact Fund',
      amountDue: 150000,
      dueDate: new Date('2026-01-10'),
      bankName: 'Wells Fargo',
      accountNumber: 'XXXXX9012',
      routingNumber: '121000248',
      wireReference: 'KKR-GIF-CC-018',
    },
  ];

  for (const [index, call] of capitalCalls.entries()) {
    const document = await prisma.document.create({
      data: {
        fileName: `capital-call-${index + 1}.pdf`,
        fileUrl: `https://example.com/docs/capital-call-${index + 1}.pdf`,
        fileSize: 1024000 + index * 1000,
        mimeType: 'application/pdf',
        userId: user.id,
        status: 'APPROVED',
        capitalCall: {
          create: {
            ...call,
            userId: user.id,
            status: 'APPROVED',
            investorEmail: user.email,
            confidenceScores: {
              fundName: 0.95,
              amountDue: 0.98,
              dueDate: 0.92,
            },
          },
        },
      },
    });

    console.log('Created document with capital call:', document.id);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**package.json update**:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Usage**:
```bash
npx prisma db seed
```

**Acceptance Criteria**:
- ✅ Creates test user
- ✅ Creates sample capital calls
- ✅ Idempotent (can run multiple times)
- ✅ Helpful for development and demos

---

### Week 6: Production Migration Planning

**Task DB-006: Migration Strategy Documentation**
```markdown
# Production Migration Strategy

## Pre-Migration Checklist
- [ ] Backup database
- [ ] Test migration on staging
- [ ] Verify rollback procedure
- [ ] Schedule maintenance window
- [ ] Notify users of downtime (if any)

## Migration Commands

### Preview migration
```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

### Deploy migration
```bash
npx prisma migrate deploy
```

### Rollback (if needed)
```bash
# Restore from backup
pg_restore -d clearway_production backup.dump
```

## Zero-Downtime Migration Patterns

### Adding a column
1. Add column with default value
2. Deploy code that uses new column (optional)
3. Backfill data (if needed)
4. Make column required (if needed)

### Renaming a column
1. Add new column
2. Dual-write to both columns
3. Backfill old → new
4. Switch reads to new column
5. Remove old column

### Changing relationships
1. Create new relationship
2. Dual-write to both
3. Backfill data
4. Switch to new relationship
5. Remove old relationship
```

**Acceptance Criteria**:
- ✅ Documented migration procedures
- ✅ Rollback strategies
- ✅ Zero-downtime patterns

---

## Performance Optimization

### Task DB-007: Query Performance Monitoring

**Using Prisma Query Logging**:
```typescript
// lib/db.ts - Enhanced with performance tracking

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 100) { // Log queries > 100ms
    console.warn(`Slow query detected (${e.duration}ms):`, e.query);
  }
});
```

**Common Query Optimizations**:

1. **Eager Loading**:
```typescript
// ❌ N+1 query problem
const documents = await db.document.findMany();
for (const doc of documents) {
  const capitalCall = await db.capitalCall.findUnique({
    where: { documentId: doc.id },
  });
}

// ✅ Eager load with include
const documents = await db.document.findMany({
  include: { capitalCall: true },
});
```

2. **Select Only Needed Fields**:
```typescript
// ❌ Select all fields
const users = await db.user.findMany();

// ✅ Select only needed
const users = await db.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
  },
});
```

3. **Pagination**:
```typescript
// ✅ Cursor-based pagination for large datasets
const documents = await db.document.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastDocumentId },
  orderBy: { uploadedAt: 'desc' },
});
```

**Acceptance Criteria**:
- ✅ Slow query logging
- ✅ N+1 query prevention
- ✅ Efficient pagination
- ✅ Only fetch needed fields

---

## Handoff Requirements

### To Backend Agent
```markdown
## Database Ready: Capital Call Model

**Model**: CapitalCall

**Usage**:
```typescript
import { db } from '@/lib/db';

// Create capital call
const capitalCall = await db.capitalCall.create({
  data: {
    documentId: 'doc_123',
    userId: 'user_456',
    fundName: 'Apollo Fund XI',
    amountDue: 250000,
    dueDate: new Date('2025-12-15'),
    // ... other fields
  },
});

// Update status
await db.capitalCall.update({
  where: { id: capitalCall.id },
  data: { status: 'APPROVED' },
});
```

**Validation**: Use `CapitalCallSchema` from `@/lib/schemas`

**Indexes**: Optimized for queries on userId, dueDate, status
```

### To Frontend Agent
```markdown
## Database Types Available

**Import**:
```typescript
import { Document, CapitalCall, DocumentStatus, CapitalCallStatus } from '@prisma/client';
```

**Usage in Components**:
```typescript
interface DocumentWithCapitalCall extends Document {
  capitalCall: CapitalCall | null;
}

// Type-safe props
interface ReviewPageProps {
  document: DocumentWithCapitalCall;
}
```
```

## Quality Standards

### Schema Design
- Every model has `id`, `createdAt`, `updatedAt`
- Use `@unique` for unique constraints
- Use `@index` for frequently queried fields
- Use `Decimal` for money (not `Float`)
- Use `@default` for sensible defaults

### Naming Conventions
- Models: PascalCase, singular (e.g., `User`, `CapitalCall`)
- Fields: camelCase (e.g., `userId`, `amountDue`)
- Relations: camelCase, descriptive (e.g., `user`, `capitalCall`)

### Relationships
- Always use proper foreign keys
- Configure `onDelete` behavior
- Use `@@index` on foreign keys

### Migrations
- Never edit existing migrations
- Always create new migrations
- Test on staging before production
- Have rollback plan ready

## Testing

### Database Tests
```typescript
// tests/db/capital-call.test.ts

import { db } from '@/lib/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database
  await prisma.capitalCall.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
});

describe('CapitalCall Model', () => {
  it('creates capital call with all fields', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        clerkId: 'test_123',
      },
    });

    const document = await prisma.document.create({
      data: {
        fileName: 'test.pdf',
        fileUrl: 'https://example.com/test.pdf',
        fileSize: 1024,
        userId: user.id,
      },
    });

    const capitalCall = await prisma.capitalCall.create({
      data: {
        documentId: document.id,
        userId: user.id,
        fundName: 'Test Fund',
        amountDue: 100000,
        dueDate: new Date('2025-12-31'),
      },
    });

    expect(capitalCall.fundName).toBe('Test Fund');
    expect(capitalCall.amountDue.toNumber()).toBe(100000);
  });
});
```

## Status Reporting

Location: `.agents/status/database-status.json`

```json
{
  "agent": "database-agent",
  "date": "2025-11-20",
  "status": "complete",
  "current_week": 1,
  "completed_tasks": ["DB-001", "DB-002", "DB-003", "DB-004", "DB-005"],
  "in_progress_tasks": [],
  "blocked_tasks": [],
  "upcoming_tasks": ["DB-006", "DB-007"],
  "metrics": {
    "models_created": 5,
    "migrations_executed": 1,
    "indexes_created": 12,
    "query_helpers": 4
  }
}
```

---

**Database Agent is ready to provide solid data foundation for Clearway MVP.**

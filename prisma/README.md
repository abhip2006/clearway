# Clearway Database Schema

This directory contains the Prisma database schema, migrations, and seed scripts for the Clearway MVP.

## Database Architecture

### Core Models

1. **User** - Platform users (RIAs, investors, family offices)
   - Clerk authentication integration
   - Organization membership
   - Document ownership

2. **Organization** - RIA firms, family offices
   - Multi-user support
   - Shared document access

3. **Document** - Uploaded PDF capital calls
   - File metadata (name, size, URL)
   - Processing status tracking
   - S3/R2 storage integration

4. **CapitalCall** - Extracted capital call data
   - Financial details (amount, due date, fund name)
   - Wire instructions
   - Confidence scores for AI extraction
   - Review/approval workflow

5. **FundAdministrator** - Fund admin partners (Phase 2)
   - API key management
   - Contact information

### Relationships

```
User
  ├─ belongs to → Organization (optional)
  ├─ has many → Documents
  └─ has many → CapitalCalls

Organization
  ├─ has many → Users
  └─ has many → Documents

Document
  ├─ belongs to → User (required)
  ├─ belongs to → Organization (optional)
  └─ has one → CapitalCall (optional)

CapitalCall
  ├─ belongs to → User (required)
  └─ belongs to → Document (required, unique)
```

### Enums

**DocumentStatus**
- `PENDING` - Uploaded, awaiting processing
- `PROCESSING` - AI extraction in progress
- `REVIEW` - Needs human review
- `APPROVED` - Reviewed and approved
- `REJECTED` - Rejected by user
- `FAILED` - Processing failed

**CapitalCallStatus**
- `PENDING_REVIEW` - Extracted, awaiting review
- `APPROVED` - Reviewed and approved
- `REJECTED` - Rejected by user
- `PAID` - Payment completed (future)

## Database Setup

### Prerequisites

- PostgreSQL 14+ (local or Neon)
- Node.js 18+
- npm or yarn

### Quick Start

1. **Set up database URL**
   ```bash
   # Copy example env file
   cp .env.example .env

   # Edit .env and set DATABASE_URL
   # For local: postgresql://postgres:password@localhost:5432/clearway_dev
   # For Neon: (get from https://neon.tech)
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

4. **Run migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed database (optional)**
   ```bash
   npx prisma db seed
   ```

### Using Docker for PostgreSQL

```bash
# Start PostgreSQL container
docker run --name clearway-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=clearway_dev \
  -p 5432:5432 \
  -d postgres:16

# Update .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/clearway_dev?schema=public"
```

## Migrations

### Creating New Migrations

```bash
# Create migration after schema changes
npx prisma migrate dev --name description_of_changes

# Example:
npx prisma migrate dev --name add_payment_status_to_capital_calls
```

### Production Migrations

```bash
# Preview migration
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script

# Deploy to production
npx prisma migrate deploy
```

### Migration Best Practices

1. **Always test migrations on staging first**
2. **Create backups before production migrations**
3. **Never edit existing migrations**
4. **Use descriptive migration names**
5. **Review SQL before deploying**

## Seed Data

The seed script creates:
- 1 test user (test@clearway.com)
- 1 demo organization (Demo RIA Firm)
- 5 approved capital calls (Apollo, Blackstone, KKR, Carlyle, TPG)
- 1 pending document
- 1 document in review status
- 3 fund administrators

### Running Seeds

```bash
# Run seed script
npx prisma db seed

# Or manually
npx tsx prisma/seed.ts
```

### Custom Seeds

Create additional seed scripts in `prisma/seeds/`:
```typescript
// prisma/seeds/production-seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Your custom seed logic
}

main();
```

## Query Helpers

Use the query helpers from `lib/db.ts`:

```typescript
import { queries } from '@/lib/db';

// Get pending documents
const pending = await queries.getPendingDocuments(userId);

// Get upcoming capital calls (next 7 days)
const upcoming = await queries.getUpcomingCapitalCalls(userId);

// Get capital calls for specific month
const monthly = await queries.getCapitalCallsForMonth(userId, 2025, 12);
```

## Validation Schemas

Use Zod schemas from `lib/schemas.ts`:

```typescript
import { CapitalCallSchema } from '@/lib/schemas';

// Validate capital call data
const result = CapitalCallSchema.safeParse(data);

if (!result.success) {
  console.error(result.error.errors);
}
```

## Database Indexes

Indexes are optimized for common queries:

### User Table
- `clerkId` (unique)
- `email` (unique)
- `organizationId`

### Document Table
- `userId`
- `organizationId`
- `status`
- `uploadedAt DESC`

### CapitalCall Table
- `userId`
- `documentId` (unique)
- `dueDate`
- `status`
- `fundName`

### Organization Table
- `slug` (unique)

### FundAdministrator Table
- `slug` (unique)
- `apiKey` (unique)

## Data Types

### Money Storage
- Uses `Decimal` type (not Float)
- Precision: 15 digits, 2 decimal places
- Always store in cents for calculations

### Dates
- All timestamps use `DateTime` with timezone support
- Use `@default(now())` for creation timestamps
- Use `@updatedAt` for automatic update tracking

### JSON Fields
- `confidenceScores` - AI extraction confidence (0-1)
- `rawExtraction` - Full extraction data for debugging

## Troubleshooting

### Migration Errors

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Force push schema (skips migrations)
npx prisma db push --force-reset
```

### Connection Issues

```bash
# Test database connection
npx prisma db execute --stdin <<< "SELECT 1"

# View connection info
npx prisma db pull
```

### Prisma Studio

```bash
# Launch database GUI
npx prisma studio
```

## Performance Tips

1. **Use `select` to fetch only needed fields**
   ```typescript
   const users = await db.user.findMany({
     select: { id: true, email: true, name: true }
   });
   ```

2. **Use `include` for eager loading**
   ```typescript
   const docs = await db.document.findMany({
     include: { capitalCall: true }
   });
   ```

3. **Use cursor pagination for large datasets**
   ```typescript
   const docs = await db.document.findMany({
     take: 20,
     skip: 1,
     cursor: { id: lastDocId },
   });
   ```

4. **Batch operations when possible**
   ```typescript
   await db.document.createMany({
     data: documents,
     skipDuplicates: true,
   });
   ```

## Testing

Database tests should:
- Use a separate test database
- Clean data between tests
- Use transactions for isolation

```typescript
// tests/db/capital-call.test.ts
import { db } from '@/lib/db';

beforeEach(async () => {
  await db.capitalCall.deleteMany();
  await db.document.deleteMany();
  await db.user.deleteMany();
});
```

## Production Checklist

- [ ] Database backups configured
- [ ] Connection pooling enabled
- [ ] Indexes optimized
- [ ] Query logging enabled
- [ ] Error monitoring (Sentry)
- [ ] Migration strategy documented
- [ ] Rollback procedures tested

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don't_Do_This)
- [Neon Database](https://neon.tech/docs)
- [Database Design Patterns](https://martinfowler.com/eaaCatalog/)

---

**Database Agent** - Clearway MVP

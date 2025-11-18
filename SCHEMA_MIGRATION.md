# Database Schema Migration Guide
## Advanced AI Features (AI-ADV-001, AI-ADV-002, AI-ADV-003)

This guide explains the database schema updates needed to fully support the Advanced AI features.

---

## Overview

The Advanced AI features require additional fields in the database to store:

1. **Document classifications** (AI-ADV-001)
2. **Anomaly detection results** (AI-ADV-002)
3. **Email parsing metadata** (AI-ADV-003)

---

## Schema Changes

### 1. Document Model Updates

Add document classification fields:

```prisma
model Document {
  id          String   @id @default(cuid())
  fileName    String
  fileUrl     String
  fileSize    Int
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

  // ✨ NEW: AI-ADV-001 Document Classification
  documentType              DocumentType?
  classificationConfidence  Float?
  classificationReasoning   String?       @db.Text
  suggestedActions          String[]      @default([])

  // Relations
  capitalCall CapitalCall?

  @@index([userId])
  @@index([organizationId])
  @@index([status])
  @@index([documentType])  // ✨ NEW INDEX
  @@index([uploadedAt(sort: Desc)])
}
```

### 2. Add DocumentType Enum

```prisma
enum DocumentType {
  CAPITAL_CALL
  DISTRIBUTION_NOTICE
  K1_TAX_FORM
  QUARTERLY_REPORT
  ANNUAL_REPORT
  SUBSCRIPTION_AGREEMENT
  AMENDMENT
  OTHER
}
```

### 3. Update DocumentStatus Enum

Add CLASSIFIED status for documents that are classified but not yet extracted:

```prisma
enum DocumentStatus {
  PENDING      // Uploaded, not processed
  PROCESSING   // AI extraction in progress
  CLASSIFIED   // ✨ NEW: Classified but not extracted
  REVIEW       // Needs human review
  APPROVED     // Reviewed and approved
  REJECTED     // Rejected by user
  FAILED       // Processing failed
}
```

### 4. Capital Call Model Updates (Optional)

While not strictly required (anomaly data can be stored in `rawExtraction` JSON field), you can optionally add dedicated anomaly fields:

```prisma
model CapitalCall {
  // ... existing fields ...

  // ✨ OPTIONAL: AI-ADV-002 Anomaly Detection
  anomalyCheckedAt       DateTime?
  overallRisk            String?   // LOW, MEDIUM, HIGH
  amountAnomalySeverity  String?   // LOW, MEDIUM, HIGH
  isDuplicateSuspected   Boolean   @default(false)
  fraudRiskScore         Int?
  requiresManualReview   Boolean   @default(false)
  reviewReason           String?   @db.Text

  @@index([overallRisk])
  @@index([requiresManualReview])
}
```

**Note:** Currently, the implementation stores anomaly data in the `rawExtraction` JSON field, which works well. The optional fields above would make querying easier but add schema complexity.

---

## Migration Steps

### Step 1: Update Prisma Schema

Edit `/home/user/clearway/prisma/schema.prisma` and add the changes above.

### Step 2: Create Migration

```bash
npx prisma migrate dev --name add_advanced_ai_fields
```

This will:
1. Create a new migration file
2. Apply the migration to your local database
3. Regenerate Prisma Client

### Step 3: Review Migration SQL

The migration will generate SQL similar to:

```sql
-- Add DocumentType enum
CREATE TYPE "DocumentType" AS ENUM (
  'CAPITAL_CALL',
  'DISTRIBUTION_NOTICE',
  'K1_TAX_FORM',
  'QUARTERLY_REPORT',
  'ANNUAL_REPORT',
  'SUBSCRIPTION_AGREEMENT',
  'AMENDMENT',
  'OTHER'
);

-- Add classification fields to Document
ALTER TABLE "Document"
ADD COLUMN "documentType" "DocumentType",
ADD COLUMN "classificationConfidence" DOUBLE PRECISION,
ADD COLUMN "classificationReasoning" TEXT,
ADD COLUMN "suggestedActions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add CLASSIFIED status to DocumentStatus
ALTER TYPE "DocumentStatus" ADD VALUE 'CLASSIFIED';

-- Add index for documentType
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");
```

### Step 4: Deploy to Production

```bash
# Production deployment
npx prisma migrate deploy
```

### Step 5: Regenerate Prisma Client

```bash
npx prisma generate
```

---

## Data Migration

### Backfill Existing Documents (Optional)

If you want to classify existing documents:

```typescript
// scripts/backfill-classifications.ts
import { db } from '@/lib/db';
import { documentClassifier } from '@/lib/ai/classifier';

async function backfillClassifications() {
  // Get all unclassified documents
  const documents = await db.document.findMany({
    where: {
      documentType: null,
      status: { in: ['APPROVED', 'REVIEW'] }
    },
    take: 100 // Process in batches
  });

  console.log(`Found ${documents.length} documents to classify`);

  for (const doc of documents) {
    try {
      await documentClassifier.routeDocument(doc.id);
      console.log(`Classified document ${doc.id}`);
    } catch (error) {
      console.error(`Failed to classify ${doc.id}:`, error);
    }
  }
}

backfillClassifications();
```

Run with:
```bash
npx tsx scripts/backfill-classifications.ts
```

---

## Testing Migration

### 1. Test Schema Changes

```bash
# Validate schema
npx prisma validate

# Check for drift
npx prisma db push --preview-feature
```

### 2. Test Queries

```typescript
// Test classification query
const classified = await db.document.findMany({
  where: {
    documentType: 'CAPITAL_CALL',
    classificationConfidence: { gte: 0.9 }
  }
});

// Test anomaly query (using rawExtraction)
const anomalies = await db.capitalCall.findMany({
  where: {
    rawExtraction: {
      path: ['anomalyDetection', 'overallRisk'],
      equals: 'HIGH'
    }
  }
});
```

### 3. Test UI Integration

After migration, update UI components to display:
- Document type badges
- Classification confidence scores
- Anomaly warnings
- Fraud indicators

---

## Rollback Plan

If you need to rollback the migration:

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration_name>

# OR manually drop the changes
psql $DATABASE_URL << EOF
ALTER TABLE "Document" DROP COLUMN "documentType";
ALTER TABLE "Document" DROP COLUMN "classificationConfidence";
ALTER TABLE "Document" DROP COLUMN "classificationReasoning";
ALTER TABLE "Document" DROP COLUMN "suggestedActions";
DROP TYPE "DocumentType";
EOF
```

---

## Performance Considerations

### Indexes

The migration adds an index on `documentType` for fast filtering:

```sql
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");
```

Additional recommended indexes:

```sql
-- Fast anomaly queries (if using dedicated fields)
CREATE INDEX "CapitalCall_requiresManualReview_idx" ON "CapitalCall"("requiresManualReview");
CREATE INDEX "CapitalCall_overallRisk_idx" ON "CapitalCall"("overallRisk");
```

### JSON Queries

If storing anomaly data in JSON (`rawExtraction` field), consider adding GIN indexes:

```sql
-- Enable faster JSON queries
CREATE INDEX "CapitalCall_rawExtraction_gin" ON "CapitalCall" USING GIN ("rawExtraction");
```

---

## Code Updates After Migration

### 1. Update Type Imports

```typescript
// Add new types to imports
import { DocumentType } from '@prisma/client';
```

### 2. Update Document Creation

```typescript
// When creating documents, initialize classification fields
await db.document.create({
  data: {
    // ... existing fields ...
    documentType: null,  // Will be set by classifier
    classificationConfidence: null,
    classificationReasoning: null,
    suggestedActions: [],
  }
});
```

### 3. Update Queries

```typescript
// Query by document type
const capitalCalls = await db.document.findMany({
  where: {
    documentType: 'CAPITAL_CALL',
    classificationConfidence: { gte: 0.9 }
  }
});

// Query high-risk capital calls (using JSON)
const highRisk = await db.capitalCall.findMany({
  where: {
    rawExtraction: {
      path: ['anomalyDetection', 'overallRisk'],
      equals: 'HIGH'
    }
  }
});
```

---

## Alternative: Using JSON Fields Only

If you prefer to avoid schema changes, the current implementation already works using JSON fields:

### Document Classification

Store in a new JSON field:

```typescript
await db.document.update({
  where: { id: documentId },
  data: {
    // Use existing or new JSON field
    metadata: {
      classification: {
        type: 'CAPITAL_CALL',
        confidence: 0.95,
        reasoning: '...',
        suggestedActions: ['...']
      }
    }
  }
});
```

### Anomaly Detection

Already implemented using `rawExtraction`:

```typescript
await db.capitalCall.update({
  where: { id: capitalCallId },
  data: {
    rawExtraction: {
      ...(existing.rawExtraction as any),
      anomalyDetection: {
        overallRisk: 'HIGH',
        amountAnomaly: {...},
        duplicateCheck: {...},
        fraudIndicators: {...}
      }
    }
  }
});
```

**Pros:**
- No schema migration needed
- Flexible structure
- Works immediately

**Cons:**
- Harder to query
- No type safety
- Slower queries without GIN indexes

---

## Recommendation

For production deployment, we recommend:

1. **Phase 1 (Immediate):** Use JSON fields (already working)
2. **Phase 2 (1-2 weeks):** Add dedicated schema fields for better performance
3. **Phase 3 (1 month):** Backfill classifications for existing documents

This staged approach allows you to:
- Deploy AI features immediately
- Test in production
- Migrate schema when confident
- Maintain backward compatibility

---

## Support

For questions about the migration:
1. Review the Advanced AI Report (`ADVANCED_AI_REPORT.md`)
2. Check Prisma docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
3. Test in staging environment first
4. Run migrations during low-traffic periods

---

**Migration Guide Version:** 1.0
**Last Updated:** November 18, 2025
**Author:** Advanced AI Agent

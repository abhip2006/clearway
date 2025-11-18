# CLEARWAY MVP - AI-ACCELERATED BUILD PLAN

**Document Purpose:** Step-by-step technical implementation plan leveraging AI-powered tools  
**Timeline:** 8-10 weeks to production-ready MVP  
**Philosophy:** Ship fast, validate with real customers, iterate based on feedback  

---

## TABLE OF CONTENTS

1. [Build Philosophy](#build-philosophy)
2. [Tech Stack (AI-First)](#tech-stack)
3. [MVP Feature Scope](#mvp-feature-scope)
4. [Week-by-Week Build Plan](#week-by-week-build-plan)
5. [AI Tool Usage Guide](#ai-tool-usage-guide)
6. [Development Setup](#development-setup)
7. [Architecture Decisions](#architecture-decisions)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Post-Launch Iteration](#post-launch-iteration)

---

## BUILD PHILOSOPHY

### Core Principles

**1. Ship > Perfect**
- MVP goal: Validate product-market fit, not build perfect product
- 80% solution in 20% of the time
- Polish comes after validation

**2. Leverage AI Everywhere**
- Cursor for code generation (90% of boilerplate)
- Claude for architecture decisions
- v0.dev for UI components
- GitHub Copilot for autocomplete

**3. Build for Iteration**
- Modular architecture (easy to replace pieces)
- Feature flags (turn things on/off)
- Strong typing (catch errors early)
- Comprehensive logging (debug production issues)

**4. API-First (Even for MVP)**
- Internal APIs from Day 1
- Ready for fund admin integration in Phase 2
- Mobile-ready architecture

---

## TECH STACK

### Frontend (Next.js App)

```typescript
// Core Framework
- Next.js 15 (App Router) - RSC, server actions, streaming
- React 19 - Concurrent features, suspense
- TypeScript - End-to-end type safety

// UI Layer
- Tailwind CSS - Utility-first styling (AI tools excel at this)
- shadcn/ui - High-quality components (copy-paste, not npm)
- Radix UI - Accessible primitives under the hood
- Lucide Icons - Beautiful icons

// State Management
- React Server Components (minimize client state)
- Zustand (when client state is needed - dead simple)
- TanStack Query - Server state management, caching

// Forms & Validation
- React Hook Form - Performance + DX
- Zod - Runtime validation + TS types

// PDF Viewing
- react-pdf or pdf.js - Display PDFs side-by-side with extraction
```

**Why This Stack:**
- AI tools (Cursor, v0) are trained on Next.js/React/Tailwind
- Fast to build, easy to maintain
- Production-ready out of the box (edge runtime, streaming, etc.)

---

### Backend (Next.js API Routes + External Services)

```typescript
// API Layer
- Next.js API Routes - Serverless, auto-scaling
- tRPC (optional) - End-to-end type safety for internal APIs
- REST - For external integrations (fund admins)

// Database
- Neon PostgreSQL - Serverless Postgres, generous free tier
- Prisma ORM - Type-safe queries, migrations, great DX

// Authentication
- Clerk.dev - Drop-in auth (Google SSO, email/password)
- Альтернатива: next-auth (if you want self-hosted)

// File Storage
- Cloudflare R2 or AWS S3
- Presigned URLs for secure uploads

// Background Jobs
- Inngest - Serverless background jobs (better than Vercel cron)
- Альтернатива: Trigger.dev

// Monitoring
- Sentry - Error tracking
- Langfuse - LLM observability
- PostHog - Product analytics
- Vercel Analytics - Web vitals
```

---

### AI/ML Pipeline

```typescript
// Document Processing
- Azure Document Intelligence - Best OCR for financial docs
  - Pricing: $1.50/1000 pages
  - Accuracy: 98%+ on structured docs
  
// AI Extraction
- OpenAI GPT-4o-mini - Cost-effective ($0.15/1M input tokens)
- Anthropic Claude 3.5 Sonnet - Backup model (higher accuracy)

// Structured Output
- JSON mode (OpenAI)
- Zod for validation

// Vector Search (Future)
- Pinecone or Supabase pgvector - For semantic search of past extractions
```

---

### Infrastructure

```typescript
// Hosting
- Vercel - Frontend + API routes (Edge runtime)
- Modal - ML inference (GPU when needed)

// Monitoring & Logging
- Sentry - Errors
- Axiom - Logs
- Langfuse - LLM traces

// CI/CD
- GitHub Actions - Tests + deploy
- Vercel - Auto-preview deploys

// Domain & Email
- Vercel Domains - clearway.com
- Resend - Transactional email
```

---

## MVP FEATURE SCOPE

### ✅ IN SCOPE (Must Have for MVP)

**Core Flow:**
1. **Upload Document**
   - Drag & drop PDF
   - Email forwarding (documents@clearway.com)
   - Batch upload (up to 10 at once)

2. **AI Extraction**
   - Fund name
   - Investor identifier (email or account #)
   - Amount due (USD)
   - Due date
   - Wire instructions (bank, account, routing, reference)
   - Document type (capital call vs distribution)

3. **Review & Edit**
   - Side-by-side: PDF viewer (left) + extracted fields (right)
   - Confidence scores per field
   - Edit any field
   - Approve or reject
   - Bulk approve (if multiple docs)

4. **Calendar View**
   - All capital calls in calendar
   - Filter by fund, status
   - Upcoming deadlines highlighted

5. **Alerts**
   - Email reminders: 7 days, 3 days, 1 day before due date
   - Daily digest of upcoming capital calls

6. **Export**
   - CSV export (all capital calls)
   - Email to client (individual capital call details)
   - PDF generation (wire instructions)

7. **User Management**
   - Sign up with Google
   - Invite team members
   - Role-based access (Admin, Viewer)

---

### ❌ OUT OF SCOPE (Phase 2+)

**Explicitly NOT building in MVP:**
- ❌ K-1 tax form processing
- ❌ Distribution tracking
- ❌ Portfolio system integrations (Black Diamond, Orion)
- ❌ Fund administrator API
- ❌ Mobile app
- ❌ Audit trail / change history
- ❌ Custom fields
- ❌ White-label
- ❌ Multi-currency (USD only)
- ❌ Multi-language
- ❌ Webhook outbound API

**Why:**
Focus on ONE use case (capital calls). Nail it. Then expand.

---

## WEEK-BY-WEEK BUILD PLAN

### PRE-WEEK 0: Setup (2-3 days)

**Goal:** Get development environment ready

```bash
# 1. Initialize Next.js project with Cursor
npx create-next-app@latest clearway-mvp --typescript --tailwind --app

# 2. Install core dependencies
npm install @prisma/client zod react-hook-form @hookform/resolvers
npm install @clerk/nextjs @tanstack/react-query zustand
npm install -D prisma @types/node

# 3. Setup Prisma + Neon
# Create Neon account (free tier)
# Copy connection string
# Initialize Prisma
npx prisma init

# 4. Setup Clerk
# Create Clerk account
# Copy API keys
# Add to .env.local

# 5. Setup Sentry
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs

# 6. Setup shadcn/ui
npx shadcn@latest init
# Install components as needed
```

**AI Usage:**
- **Cursor:** Generate entire boilerplate
  - Prompt: "Create Next.js 15 app with TypeScript, Tailwind, Prisma, Clerk auth, following best practices"
- **Claude:** Review architecture decisions

**Deliverable:**
- ✅ Repo initialized
- ✅ Auth working (Clerk)
- ✅ Database connected (Neon)
- ✅ CI/CD configured (Vercel)

---

### WEEK 1: Core Data Models + Document Upload

**Goal:** Users can upload PDFs, stored securely

#### Day 1-2: Database Schema

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  
  organization   Organization? @relation(fields: [organizationId], references: [id])
  organizationId String?
  
  documents Document[]
  capitalCalls CapitalCall[]
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  
  users     User[]
  documents Document[]
}

model Document {
  id          String   @id @default(cuid())
  fileName    String
  fileUrl     String   // S3/R2 URL
  fileSize    Int      // bytes
  mimeType    String   // application/pdf
  uploadedAt  DateTime @default(now())
  
  userId         String
  user           User @relation(fields: [userId], references: [id])
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  
  status      DocumentStatus @default(PENDING)
  
  capitalCall CapitalCall?
  
  @@index([userId])
  @@index([organizationId])
  @@index([status])
}

enum DocumentStatus {
  PENDING      // Uploaded, not processed
  PROCESSING   // AI extraction in progress
  REVIEW       // Needs human review
  APPROVED     // Reviewed and approved
  REJECTED     // Rejected by user
  FAILED       // Processing failed
}

model CapitalCall {
  id        String   @id @default(cuid())
  
  // Extracted fields
  fundName         String
  investorEmail    String?
  investorAccount  String?
  amountDue        Float
  currency         String @default("USD")
  dueDate          DateTime
  
  // Wire instructions
  bankName         String?
  accountNumber    String?
  routingNumber    String?
  wireReference    String?
  
  // Metadata
  extractedAt      DateTime @default(now())
  reviewedAt       DateTime?
  approvedAt       DateTime?
  
  // Confidence scores (0-1)
  confidenceScores Json?
  
  // Raw extraction
  rawExtraction    Json?
  
  // Relations
  documentId String @unique
  document   Document @relation(fields: [documentId], references: [id])
  
  userId     String
  user       User @relation(fields: [userId], references: [id])
  
  status     CapitalCallStatus @default(PENDING_REVIEW)
  
  @@index([userId])
  @@index([dueDate])
  @@index([status])
}

enum CapitalCallStatus {
  PENDING_REVIEW
  APPROVED
  REJECTED
  PAID  // Future: when we add payment tracking
}
```

**AI Usage:**
- **Cursor:** Generate this entire schema
  - Prompt: "Create Prisma schema for document management system with capital call extraction. Include users, organizations, documents, capital calls. Add proper indexes and relations."
- **Claude:** Review schema for best practices

**Commands:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

#### Day 3-4: File Upload (S3/R2)

**Setup Cloudflare R2:**
```bash
# 1. Create R2 bucket in Cloudflare dashboard
# 2. Get Access Key ID and Secret
# 3. Add to .env.local
```

**Upload API Route:**
```typescript
// app/api/upload/route.ts

import { auth } from '@clerk/nextjs/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@/lib/db';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  
  const { fileName, fileSize, mimeType } = await req.json();
  
  // Generate unique file key
  const fileKey = `${userId}/${Date.now()}-${fileName}`;
  
  // Create presigned URL for upload
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: mimeType,
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
  
  return Response.json({ uploadUrl, documentId: document.id });
}
```

**Frontend Upload Component:**
```typescript
// components/upload-dropzone.tsx

'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

export function UploadDropzone() {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      // 1. Get presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });
      
      const { uploadUrl, documentId } = await res.json();
      
      // 2. Upload to R2
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      
      // 3. Trigger processing
      await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024, // 10MB
  });
  
  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition"
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-lg font-medium">
        {isDragActive ? 'Drop files here' : 'Drag & drop PDFs here'}
      </p>
      <p className="text-sm text-muted-foreground">or click to browse</p>
    </div>
  );
}
```

**AI Usage:**
- **Cursor:** Generate upload flow
  - Prompt: "Create presigned S3 upload with Next.js API route. Client gets presigned URL, uploads directly to S3, then triggers background job."
- **v0.dev:** Generate upload UI component

**Deliverable:**
- ✅ Users can drag & drop PDFs
- ✅ Files uploaded to R2
- ✅ Document records created in DB

---

#### Day 5: Background Job Setup (Inngest)

**Setup Inngest:**
```bash
npm install inngest
```

```typescript
// app/api/inngest/route.ts

import { Inngest } from 'inngest';
import { serve } from 'inngest/next';
import { processDocument } from './functions/process-document';

export const inngest = new Inngest({ id: 'clearway' });

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processDocument],
});
```

**Process Document Function:**
```typescript
// app/api/inngest/functions/process-document.ts

import { inngest } from '../route';
import { extractCapitalCall } from '@/lib/ai/extract';
import { db } from '@/lib/db';

export const processDocument = inngest.createFunction(
  { id: 'process-document' },
  { event: 'document.uploaded' },
  async ({ event, step }) => {
    const { documentId } = event.data;
    
    // Step 1: Update status
    await step.run('update-status', async () => {
      await db.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });
    });
    
    // Step 2: Extract data (this calls AI)
    const extraction = await step.run('extract-data', async () => {
      return await extractCapitalCall(documentId);
    });
    
    // Step 3: Save extraction
    await step.run('save-extraction', async () => {
      await db.capitalCall.create({
        data: {
          documentId,
          userId: extraction.userId,
          ...extraction.data,
          status: 'PENDING_REVIEW',
        },
      });
      
      await db.document.update({
        where: { id: documentId },
        data: { status: 'REVIEW' },
      });
    });
    
    return { success: true };
  }
);
```

**AI Usage:**
- **Cursor:** Generate Inngest setup
  - Prompt: "Create Inngest background job for document processing. Should have 3 steps: update status, extract data with AI, save to database. Include error handling and retries."

**Deliverable:**
- ✅ Background job processing set up
- ✅ Document status updates
- ✅ Ready for AI extraction (next week)

---

### WEEK 2: AI Extraction Pipeline

**Goal:** Extract capital call data from PDFs with 90%+ accuracy

#### Day 1-2: Azure Document Intelligence OCR

**Setup:**
```bash
npm install @azure/ai-form-recognizer
```

```typescript
// lib/ai/ocr.ts

import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';

const client = new DocumentAnalysisClient(
  process.env.AZURE_DI_ENDPOINT!,
  new AzureKeyCredential(process.env.AZURE_DI_KEY!)
);

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  // Download PDF
  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();
  
  // Analyze with Azure DI
  const poller = await client.beginAnalyzeDocument(
    'prebuilt-layout',
    Buffer.from(buffer)
  );
  
  const result = await poller.pollUntilDone();
  
  // Extract text in reading order
  let fullText = '';
  for (const page of result.pages || []) {
    for (const line of page.lines || []) {
      fullText += line.content + '\n';
    }
  }
  
  return fullText;
}
```

---

#### Day 3-5: GPT-4 Extraction with Structured Output

```typescript
// lib/ai/extract.ts

import { OpenAI } from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { extractTextFromPDF } from './ocr';
import { db } from '../db';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define extraction schema
const CapitalCallSchema = z.object({
  fundName: z.string().describe('Name of the fund'),
  investorEmail: z.string().email().optional(),
  investorAccount: z.string().optional(),
  amountDue: z.number().describe('Amount due in USD'),
  currency: z.string().default('USD'),
  dueDate: z.string().describe('Due date in ISO format YYYY-MM-DD'),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  wireReference: z.string().optional(),
  confidence: z.object({
    fundName: z.number().min(0).max(1),
    amountDue: z.number().min(0).max(1),
    dueDate: z.number().min(0).max(1),
  }),
});

export async function extractCapitalCall(documentId: string) {
  // Get document
  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { user: true },
  });
  
  if (!document) throw new Error('Document not found');
  
  // Step 1: OCR
  const ocrText = await extractTextFromPDF(document.fileUrl);
  
  // Step 2: Extract with GPT-4
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at extracting structured data from capital call documents.
        
Extract the following information:
1. Fund name (e.g., "Apollo Fund XI")
2. Investor email or account number
3. Amount due in USD (just the number, no $ or commas)
4. Due date (format: YYYY-MM-DD)
5. Wire instructions (bank name, account, routing, reference)

Provide confidence scores (0-1) for critical fields.

If a field is not found, use null. Do not make up data.`
      },
      {
        role: 'user',
        content: `Extract capital call data from this document:\n\n${ocrText}`
      }
    ],
    response_format: zodResponseFormat(CapitalCallSchema, 'capital_call'),
    temperature: 0, // Deterministic
  });
  
  const extraction = completion.choices[0].message.parsed;
  
  if (!extraction) {
    throw new Error('Failed to extract data');
  }
  
  return {
    userId: document.userId,
    data: {
      fundName: extraction.fundName,
      investorEmail: extraction.investorEmail,
      investorAccount: extraction.investorAccount,
      amountDue: extraction.amountDue,
      currency: extraction.currency,
      dueDate: new Date(extraction.dueDate),
      bankName: extraction.bankName,
      accountNumber: extraction.accountNumber,
      routingNumber: extraction.routingNumber,
      wireReference: extraction.wireReference,
      confidenceScores: extraction.confidence,
      rawExtraction: extraction,
    },
  };
}
```

**AI Usage:**
- **Cursor:** Generate extraction pipeline
  - Prompt: "Create capital call extraction with Azure Document Intelligence for OCR and OpenAI GPT-4 for structured extraction. Use Zod schema for validation. Include confidence scores."
- **Claude:** Review prompt engineering for extraction accuracy

**Testing:**
- Use 20 real capital calls from validation
- Measure accuracy per field
- Iterate on prompts

**Deliverable:**
- ✅ 90%+ accuracy on key fields
- ✅ Confidence scores per field
- ✅ Error handling for edge cases

---

### WEEK 3: Review UI + Calendar

**Goal:** Users can review extractions, approve/reject, see calendar view

#### Day 1-3: Review Interface

```typescript
// app/documents/[id]/review/page.tsx

import { PDFViewer } from '@/components/pdf-viewer';
import { ExtractionForm } from '@/components/extraction-form';

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const document = await db.document.findUnique({
    where: { id: params.id },
    include: { capitalCall: true },
  });
  
  return (
    <div className="grid grid-cols-2 gap-4 h-screen">
      {/* Left: PDF Viewer */}
      <div className="border-r">
        <PDFViewer url={document.fileUrl} />
      </div>
      
      {/* Right: Extraction Form */}
      <div className="p-6 overflow-y-auto">
        <ExtractionForm
          documentId={document.id}
          initialData={document.capitalCall}
        />
      </div>
    </div>
  );
}
```

**Extraction Form with Confidence Indicators:**
```typescript
// components/extraction-form.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CapitalCallSchema } from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';

export function ExtractionForm({ documentId, initialData }) {
  const form = useForm({
    resolver: zodResolver(CapitalCallSchema),
    defaultValues: initialData,
  });
  
  const onApprove = async (data) => {
    await fetch(`/api/capital-calls/${documentId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Redirect to dashboard
  };
  
  const confidenceColor = (score: number) => {
    if (score > 0.9) return 'green';
    if (score > 0.7) return 'yellow';
    return 'red';
  };
  
  return (
    <form onSubmit={form.handleSubmit(onApprove)} className="space-y-6">
      <div>
        <label className="flex items-center gap-2">
          Fund Name
          <Badge variant={confidenceColor(initialData.confidence.fundName)}>
            {(initialData.confidence.fundName * 100).toFixed(0)}% confident
          </Badge>
        </label>
        <input {...form.register('fundName')} className="w-full" />
      </div>
      
      <div>
        <label className="flex items-center gap-2">
          Amount Due
          <Badge variant={confidenceColor(initialData.confidence.amountDue)}>
            {(initialData.confidence.amountDue * 100).toFixed(0)}% confident
          </Badge>
        </label>
        <input type="number" {...form.register('amountDue')} className="w-full" />
      </div>
      
      {/* ... more fields ... */}
      
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          Approve
        </button>
        <button type="button" onClick={() => {/* reject */}} className="btn-secondary">
          Reject
        </button>
      </div>
    </form>
  );
}
```

**AI Usage:**
- **v0.dev:** Generate review UI
  - Prompt: "Create side-by-side PDF viewer and extraction form. Left side shows PDF, right side shows editable fields with confidence scores. Use shadcn/ui components."
- **Cursor:** Implement form logic and API routes

---

#### Day 4-5: Calendar View

```typescript
// app/dashboard/calendar/page.tsx

import { Calendar } from '@/components/calendar';

export default async function CalendarPage() {
  const user = await currentUser();
  
  const capitalCalls = await db.capitalCall.findMany({
    where: {
      userId: user.id,
      status: 'APPROVED',
    },
    include: {
      document: true,
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Capital Call Calendar</h1>
      <Calendar events={capitalCalls} />
    </div>
  );
}
```

**AI Usage:**
- **v0.dev:** Generate calendar component
  - Prompt: "Create calendar view for capital calls. Show month view with capital calls as events. Highlight upcoming deadlines (within 7 days) in red. Click event to see details."
- **Cursor:** Integrate with backend

**Deliverable:**
- ✅ Side-by-side review UI
- ✅ Confidence scores visible
- ✅ Approve/reject flow
- ✅ Calendar view with all capital calls

---

### WEEK 4: Alerts + Export + Polish

**Goal:** Email reminders, CSV export, UI polish

#### Day 1-2: Email Alerts (Resend)

**Setup Resend:**
```bash
npm install resend
npm install @react-email/components
```

```typescript
// lib/email/templates/capital-call-reminder.tsx

import { Button, Html, Text } from '@react-email/components';

export function CapitalCallReminder({ fundName, amountDue, dueDate }) {
  return (
    <Html>
      <Text>You have a capital call due soon:</Text>
      <Text><strong>{fundName}</strong></Text>
      <Text>Amount: ${amountDue.toLocaleString()}</Text>
      <Text>Due: {new Date(dueDate).toLocaleDateString()}</Text>
      <Button href="https://clearway.com/dashboard">
        View Details
      </Button>
    </Html>
  );
}
```

**Scheduled Job (Inngest):**
```typescript
// app/api/inngest/functions/send-reminders.ts

import { inngest } from '../route';
import { Resend } from 'resend';
import { CapitalCallReminder } from '@/lib/email/templates/capital-call-reminder';
import { db } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendReminders = inngest.createFunction(
  { id: 'send-capital-call-reminders' },
  { cron: '0 9 * * *' }, // Daily at 9am
  async ({ event, step }) => {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get capital calls due in next 7 days
    const upcomingCalls = await db.capitalCall.findMany({
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
    
    // Send reminders
    for (const call of upcomingCalls) {
      const daysUntilDue = Math.ceil((call.dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      
      // Send reminder at 7, 3, 1 days before
      if ([7, 3, 1].includes(daysUntilDue)) {
        await resend.emails.send({
          from: 'Clearway <alerts@clearway.com>',
          to: call.user.email,
          subject: `Capital Call Due in ${daysUntilDue} Days`,
          react: CapitalCallReminder({
            fundName: call.fundName,
            amountDue: call.amountDue,
            dueDate: call.dueDate,
          }),
        });
      }
    }
  }
);
```

**AI Usage:**
- **Cursor:** Generate email templates + scheduled job
  - Prompt: "Create daily cron job that sends email reminders for capital calls due in 7, 3, and 1 days. Use Resend for emails and React Email for templates."

---

#### Day 3: CSV Export

```typescript
// app/api/export/route.ts

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  
  const capitalCalls = await db.capitalCall.findMany({
    where: { userId },
    orderBy: { dueDate: 'asc' },
  });
  
  // Generate CSV
  const csv = [
    ['Fund Name', 'Amount Due', 'Due Date', 'Status', 'Bank Name', 'Account', 'Routing'].join(','),
    ...capitalCalls.map(call => [
      call.fundName,
      call.amountDue,
      call.dueDate.toISOString().split('T')[0],
      call.status,
      call.bankName || '',
      call.accountNumber || '',
      call.routingNumber || '',
    ].join(','))
  ].join('\n');
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="capital-calls.csv"',
    },
  });
}
```

**AI Usage:**
- **Cursor:** Generate CSV export
  - Prompt: "Create API route to export all capital calls as CSV. Include all key fields. Return as downloadable file."

---

#### Day 4-5: UI Polish

**Tasks:**
- Loading states (skeletons)
- Empty states (no documents yet)
- Error handling (toast notifications)
- Mobile responsiveness
- Accessibility (keyboard navigation, ARIA labels)

**AI Usage:**
- **v0.dev:** Generate polished components
  - Prompt: "Create empty state for documents list. Show illustration, heading 'No documents yet', and upload button. Use shadcn/ui."
- **Cursor:** Implement polish across app

**Deliverable:**
- ✅ Email reminders working
- ✅ CSV export functional
- ✅ UI polished and professional
- ✅ Mobile responsive

---

### WEEK 5-6: Testing + Bug Fixes

**Goal:** Iron out bugs, test with real data, prepare for launch

#### Week 5: Testing

**Test Categories:**

1. **Unit Tests (Vitest)**
```typescript
// lib/ai/extract.test.ts

import { describe, it, expect } from 'vitest';
import { extractCapitalCall } from './extract';

describe('extractCapitalCall', () => {
  it('should extract fund name correctly', async () => {
    // Use test document
    const result = await extractCapitalCall('test-doc-id');
    expect(result.data.fundName).toBe('Apollo Fund XI');
  });
  
  it('should handle missing wire instructions gracefully', async () => {
    const result = await extractCapitalCall('test-doc-missing-wire');
    expect(result.data.bankName).toBeNull();
  });
});
```

2. **Integration Tests (Playwright)**
```typescript
// e2e/upload-flow.test.ts

import { test, expect } from '@playwright/test';

test('user can upload and review capital call', async ({ page }) => {
  // Login
  await page.goto('/');
  await page.click('text=Sign In');
  // ... login flow
  
  // Upload document
  await page.goto('/upload');
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('./test-fixtures/sample-capital-call.pdf');
  
  // Wait for processing
  await page.waitForSelector('text=Ready for Review', { timeout: 30000 });
  
  // Review and approve
  await page.click('text=Review');
  await expect(page.locator('text=Apollo Fund XI')).toBeVisible();
  await page.click('text=Approve');
  
  // Check calendar
  await page.goto('/dashboard/calendar');
  await expect(page.locator('text=Apollo Fund XI')).toBeVisible();
});
```

3. **AI Accuracy Testing**
```typescript
// scripts/test-ai-accuracy.ts

// Test on 100 real capital calls
const testDocs = [/* 100 document IDs */];

let correct = 0;
let total = 0;

for (const docId of testDocs) {
  const extraction = await extractCapitalCall(docId);
  const groundTruth = await getGroundTruth(docId);
  
  if (extraction.fundName === groundTruth.fundName) correct++;
  total++;
}

console.log(`Accuracy: ${(correct / total * 100).toFixed(1)}%`);
```

**AI Usage:**
- **Cursor:** Generate tests
  - Prompt: "Create unit tests for AI extraction, integration tests for upload flow with Playwright, and accuracy validation script."
- **Claude:** Review test coverage

---

#### Week 6: Bug Fixes + Performance

**Common Issues to Fix:**
- Large PDF uploads timing out (increase limits)
- OCR failing on scanned documents (handle gracefully)
- Extraction errors on edge cases (improve prompts)
- Slow load times (add caching, optimize queries)

**Performance Optimizations:**
```typescript
// Add React Query for caching
const { data: documents } = useQuery({
  queryKey: ['documents'],
  queryFn: () => fetch('/api/documents').then(r => r.json()),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Add database indexes (already in schema)
// Add Redis caching for frequent queries (optional)
```

**AI Usage:**
- **Cursor:** Fix bugs
  - Prompt: "This API route is timing out on large PDFs. Add streaming response and progress updates."
- **Claude:** Review performance bottlenecks

**Deliverable:**
- ✅ 95%+ test coverage
- ✅ All critical bugs fixed
- ✅ Performance optimized
- ✅ Ready for beta launch

---

### WEEK 7-8: Beta Launch + Design Partners

**Goal:** Launch to 10 design partners, gather feedback

#### Week 7: Soft Launch

**Setup:**
1. Deploy to production (Vercel)
2. Custom domain (clearway.com)
3. Set up monitoring (Sentry, PostHog)
4. Create onboarding flow

**Onboarding:**
```typescript
// components/onboarding-checklist.tsx

export function OnboardingChecklist() {
  return (
    <div className="space-y-4">
      <h2>Get Started with Clearway</h2>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox checked /> Upload your first document
        </div>
        <div className="flex items-center gap-2">
          <Checkbox /> Review and approve extraction
        </div>
        <div className="flex items-center gap-2">
          <Checkbox /> Set up email reminders
        </div>
        <div className="flex items-center gap-2">
          <Checkbox /> Invite team member
        </div>
      </div>
    </div>
  );
}
```

**Invite Design Partners:**
- Email 25 LOI signers
- Offer free for 3 months
- Ask for weekly feedback calls

**AI Usage:**
- **Cursor:** Create onboarding flow
  - Prompt: "Create onboarding checklist component that tracks user progress through first 4 key actions. Show completion percentage."

---

#### Week 8: Feedback & Iteration

**Gather Feedback:**
- Weekly calls with each design partner
- Track: What's working? What's not? What's missing?
- Use PostHog to see where users drop off

**Common Feedback to Expect:**
- "Can you add distributions?" (NO - stay focused)
- "Can I upload via email?" (YES - add if multiple requests)
- "The extraction missed X field" (Improve prompt)
- "I want to export to Excel" (Easy add)

**Prioritization:**
1. Bugs (fix immediately)
2. Accuracy improvements (high priority)
3. Ease of use (medium)
4. New features (low - stay focused on capital calls)

**AI Usage:**
- **Claude:** Analyze feedback themes
  - Prompt: "Here are 50 pieces of user feedback. Group by theme, prioritize by frequency and impact."

**Deliverable:**
- ✅ 10 design partners using MVP
- ✅ Feedback collected and prioritized
- ✅ v1.1 roadmap created
- ✅ Ready to fundraise

---

## AI TOOL USAGE GUIDE

### Cursor (Primary Development Tool)

**When to Use:**
- Generating boilerplate code (80% of MVP)
- Creating API routes
- Writing database queries
- Implementing UI components
- Writing tests

**How to Use Effectively:**

1. **Start with Architecture**
```
Cursor Prompt:
"I'm building a capital call extraction SaaS. Tech stack: Next.js 15, 
Prisma, Postgres, Clerk auth, OpenAI. 

Create the project structure with:
- Database schema (users, documents, capital_calls)
- API routes for upload, processing, export
- Auth middleware
- Type-safe tRPC endpoints

Follow Next.js 15 best practices."
```

2. **Iterate with Context**
```
Cursor Prompt:
"The upload route is timing out on large files. Refactor to:
1. Use presigned URLs for direct S3 upload
2. Return immediately with document ID
3. Trigger background job for processing
4. Show loading state in UI"
```

3. **Generate Tests**
```
Cursor Prompt:
"Create unit tests for the AI extraction function. Test:
- Happy path (complete capital call)
- Missing fields (null handling)
- Invalid date formats
- Multi-currency edge case

Use Vitest and mock OpenAI API."
```

**Pro Tips:**
- Give Cursor the full schema/types in context
- Reference existing patterns ("follow the same pattern as X")
- Use `@filename` to give specific file context
- Be specific about error handling

---

### Claude (Architecture & Review)

**When to Use:**
- Making architectural decisions
- Reviewing code quality
- Debugging complex issues
- Prompt engineering for AI extraction
- Strategic planning

**Example Conversations:**

1. **Architecture Decisions**
```
You: Should I use Inngest or Trigger.dev for background jobs?

Claude: Inngest. Here's why:
- Better DX (functions as code, not config)
- Built-in retries and error handling
- Works with Vercel Edge Runtime
- Generous free tier

Trigger.dev is good, but more complex setup for your use case.
```

2. **Code Review**
```
You: Review this AI extraction function for production readiness.
[paste code]

Claude: Three issues:
1. No timeout on OpenAI call (add 60s timeout)
2. Not handling rate limits (add exponential backoff)
3. Storing raw API response in DB (add Langfuse for observability)

Here's the improved version: [code]
```

3. **Prompt Engineering**
```
You: My AI extraction is getting fund names wrong 15% of the time.

Claude: Add these to your system prompt:
1. "Fund names often include Roman numerals (XI, XII)"
2. "Fund names may appear multiple times - use the one in the header"
3. "Common fund families: Apollo, Blackstone, KKR, Carlyle"

Also: Use few-shot examples in your prompt.
```

---

### v0.dev (UI Components)

**When to Use:**
- Generating UI components
- Creating landing pages
- Building complex layouts
- Prototyping quickly

**How to Use:**

```
v0 Prompt:
"Create a side-by-side layout for document review:
- Left: PDF viewer (use react-pdf)
- Right: Form with fields (fund name, amount, due date, wire instructions)
- Show confidence scores as colored badges next to each field
- Approve/Reject buttons at bottom
- Use shadcn/ui components
- Dark mode support"
```

**Pro Tips:**
- v0 is great for layout, but may need Cursor to connect to API
- Export to Cursor and integrate
- Use v0 for design system (buttons, forms, etc.)

---

### GitHub Copilot (Autocomplete)

**When to Use:**
- Writing repetitive code
- Following established patterns
- Completing function implementations

**Example:**
```typescript
// You type:
async function getUpcomingCapitalCalls(

// Copilot suggests:
userId: string, daysAhead: number = 7) {
  const today = new Date();
  const future = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  return await db.capitalCall.findMany({
    where: {
      userId,
      dueDate: { gte: today, lte: future },
      status: 'APPROVED',
    },
    orderBy: { dueDate: 'asc' },
  });
}
```

---

### ChatGPT / Claude (Debugging)

**When to Use:**
- Stuck on a bug
- Understanding error messages
- Learning new APIs

**Example:**
```
You: Getting error: "PrismaClientKnownRequestError: Invalid ID"

Claude: This means you're passing an invalid format to `findUnique`.
Check:
1. Is the ID actually a cuid? (should start with 'c')
2. Are you passing the right field? (use `where: { id: ... }`)
3. Try logging the ID before the query

Common cause: Passing undefined or empty string.
```

---

## DEVELOPMENT SETUP

### Local Environment

**Required Tools:**
```bash
# Core
- Node.js 20+
- pnpm (faster than npm)
- Docker (for local Postgres if not using Neon)

# AI Tools
- Cursor (primary editor)
- GitHub Copilot (optional, but helpful)

# CLI Tools
- Vercel CLI (for deployments)
- Prisma CLI (migrations)
```

**Setup Steps:**
```bash
# 1. Clone repo
git clone https://github.com/your-org/clearway-mvp
cd clearway-mvp

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env.example .env.local
# Fill in:
# - DATABASE_URL (Neon)
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - CLERK_SECRET_KEY
# - OPENAI_API_KEY
# - AZURE_DI_ENDPOINT
# - AZURE_DI_KEY
# - R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
# - RESEND_API_KEY

# 4. Setup database
pnpm prisma generate
pnpm prisma migrate dev

# 5. Run dev server
pnpm dev
# Open http://localhost:3000

# 6. Run Inngest dev server (separate terminal)
npx inngest-cli@latest dev
```

---

### Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://user:pass@db.neon.tech/clearway"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI
OPENAI_API_KEY="sk-..."
AZURE_DI_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
AZURE_DI_KEY="..."

# Storage (R2)
R2_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="clearway-documents"
R2_PUBLIC_URL="https://cdn.clearway.com"

# Email
RESEND_API_KEY="re_..."

# Monitoring
SENTRY_DSN="https://..."
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."

# Inngest
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
```

---

## ARCHITECTURE DECISIONS

### Why Next.js 15 App Router?

**Benefits:**
- Server components (faster page loads)
- Server actions (no API routes needed for mutations)
- Streaming (progressive page rendering)
- Edge runtime (global distribution)
- Built-in optimizations (image, font)

**Tradeoffs:**
- Learning curve (RSC paradigm shift)
- Some libraries don't support RSC yet
- Client components need 'use client' directive

**Verdict:** Worth it. App Router is the future.

---

### Why Prisma over Raw SQL?

**Benefits:**
- Type-safe queries (TypeScript integration)
- Auto-generated types from schema
- Migrations built-in
- Great DX (autocomplete)

**Tradeoffs:**
- Slight performance overhead
- Complex queries can be verbose
- Raw SQL sometimes clearer

**Verdict:** Use Prisma for 90% of queries, raw SQL for complex analytics.

---

### Why Neon over RDS?

**Benefits:**
- Serverless (no idle costs)
- Instant provisioning
- Generous free tier
- Branching (create copy of DB for dev)

**Tradeoffs:**
- Newer than RDS (less battle-tested)
- Cold starts (minimal, 100-200ms)

**Verdict:** Perfect for MVP. Can migrate to RDS later if needed.

---

### Why Inngest over Queues (SQS/Redis)?

**Benefits:**
- Functions as code (no infrastructure)
- Built-in retries, logging, observability
- Step functions (multi-step jobs)
- Works with serverless

**Tradeoffs:**
- Vendor lock-in
- Less control than raw queue

**Verdict:** Best DX for background jobs in serverless.

---

## TESTING STRATEGY

### Test Pyramid

```
     / \
    /E2E\ (5%)       - Critical user flows
   /_____\
  /       \
 /Integra-\ (25%)   - API routes, DB queries
/___tion___\
/           \
/   Unit     \ (70%) - Utilities, extraction logic
/_____________\
```

### Unit Tests (Vitest)

```typescript
// lib/utils/format-currency.test.ts

import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });
  
  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
  
  it('handles negative', () => {
    expect(formatCurrency(-100, 'USD')).toBe('-$100.00');
  });
});
```

**Run:**
```bash
pnpm test
pnpm test:watch  # Watch mode
pnpm test:coverage  # With coverage
```

---

### Integration Tests (Vitest)

```typescript
// app/api/capital-calls/route.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';

describe('POST /api/capital-calls', () => {
  beforeEach(async () => {
    // Clean DB before each test
    await db.capitalCall.deleteMany();
  });
  
  it('creates capital call with valid data', async () => {
    const res = await fetch('http://localhost:3000/api/capital-calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        fundName: 'Test Fund',
        amountDue: 100000,
        dueDate: '2025-12-31',
      }),
    });
    
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.fundName).toBe('Test Fund');
  });
  
  it('rejects invalid data', async () => {
    const res = await fetch('http://localhost:3000/api/capital-calls', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    });
    
    expect(res.status).toBe(400);
  });
});
```

---

### E2E Tests (Playwright)

```typescript
// e2e/complete-flow.spec.ts

import { test, expect } from '@playwright/test';

test('complete capital call flow', async ({ page }) => {
  // 1. Sign up
  await page.goto('/sign-up');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  
  // 2. Upload document
  await page.goto('/upload');
  await page.setInputFiles('input[type="file"]', './fixtures/capital-call.pdf');
  await page.waitForSelector('text=Processing', { timeout: 5000 });
  await page.waitForSelector('text=Ready for Review', { timeout: 60000 });
  
  // 3. Review and approve
  await page.click('text=Review');
  await expect(page.locator('[name="fundName"]')).toHaveValue('Apollo Fund XI');
  await page.click('button:has-text("Approve")');
  
  // 4. Check calendar
  await page.goto('/dashboard/calendar');
  await expect(page.locator('text=Apollo Fund XI')).toBeVisible();
  
  // 5. Export CSV
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export CSV")'),
  ]);
  expect(download.suggestedFilename()).toBe('capital-calls.csv');
});
```

**Run:**
```bash
pnpm playwright test
pnpm playwright test --headed  # See browser
pnpm playwright test --debug  # Debug mode
```

---

## DEPLOYMENT PLAN

### Vercel Deployment

**Setup:**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Set environment variables
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
# ... (add all from .env.local)

# 5. Deploy
vercel --prod
```

**Auto-Deploy on Push:**
```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g vercel
      - run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

### Database Migrations

**Before deploying:**
```bash
# 1. Generate migration
npx prisma migrate dev --name add_confidence_scores

# 2. Push to production
npx prisma migrate deploy
```

**In CI/CD:**
```yaml
- name: Run migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

### Monitoring Setup

**Sentry (Errors):**
```typescript
// sentry.client.config.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

**PostHog (Analytics):**
```typescript
// lib/analytics.ts

import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://app.posthog.com',
  });
}

export { posthog };
```

**Langfuse (LLM Observability):**
```typescript
// lib/ai/extract.ts

import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

// In extraction function:
const trace = langfuse.trace({ name: 'capital-call-extraction' });
const span = trace.span({ name: 'openai-extraction' });

// ... call OpenAI

span.end({ output: extraction });
trace.end();
```

---

## POST-LAUNCH ITERATION

### Week 9-10: Feedback Integration

**Prioritize Feedback:**
1. **P0 (Fix Immediately):**
   - Extraction errors on common documents
   - Upload failures
   - Auth issues

2. **P1 (Fix This Week):**
   - UI/UX improvements
   - Missing fields in extraction
   - Performance issues

3. **P2 (Next Sprint):**
   - Nice-to-have features
   - Edge cases

**Deploy Cadence:**
- Hotfixes: Immediate
- Bug fixes: Daily
- Features: Weekly

---

### Week 11-12: Prepare for Fundraise

**Metrics to Track:**
```typescript
// Key Metrics Dashboard

Weekly Active Users (WAU)
Documents Processed per Week
Average Accuracy (%)
Average Processing Time (seconds)
Approval Rate (% approved vs rejected)
Churn (users who stopped using)
NPS Score
```

**Create Fundraise Deck:**
- Traction slide: "10 RIAs, 500 documents processed, 94% accuracy"
- Testimonials: Quotes from design partners
- Metrics: Usage charts, accuracy over time
- Roadmap: Phase 2 (fund admin integrations)

---

## COST ESTIMATE

### Monthly Costs (10 Customers, 100 Docs/Customer = 1,000 Docs/Month)

```
Infrastructure:
- Vercel Pro: $20/month (includes hosting, edge, analytics)
- Neon Postgres: $19/month (1GB data, autoscaling)
- Cloudflare R2: $15/month (150GB storage, 1M requests)

AI/ML:
- OpenAI GPT-4o-mini: $45/month (1,000 docs × 1,500 tokens × $0.15/1M × 2 calls)
- Azure Document Intelligence: $8/month (1,000 docs × $1.50/1,000)

Services:
- Clerk Auth: Free (up to 10K MAU)
- Inngest: Free (up to 50K events)
- Resend Email: Free (up to 100/day)
- Sentry: Free (up to 5K events)
- PostHog: Free (up to 1M events)
- Langfuse: Free (self-hosted or free tier)

TOTAL: ~$107/month for 1,000 documents

Cost per document: $0.107
Revenue per document (at $799/month, 100 docs): $7.99
Gross margin: 98.7%
```

---

## SUCCESS CRITERIA

### MVP Launch (End of Week 8)

✅ **Product:**
- 10 design partners actively using
- 95%+ AI accuracy on key fields
- <3 minute average processing time
- <5% churn in first month

✅ **Tech:**
- 99.9% uptime
- <1% error rate
- All tests passing
- Monitoring in place

✅ **Business:**
- 500+ documents processed
- 5+ testimonials collected
- Clear path to $5K+ MRR from paid customers

---

## NEXT STEPS

### This Week
1. [ ] Setup development environment
2. [ ] Initialize Next.js project with all dependencies
3. [ ] Create Prisma schema
4. [ ] Setup Clerk auth

### Next 2 Weeks
1. [ ] Build document upload flow
2. [ ] Implement AI extraction pipeline
3. [ ] Create review UI

### Weeks 3-6
1. [ ] Calendar view
2. [ ] Email alerts
3. [ ] CSV export
4. [ ] Testing + bug fixes

### Weeks 7-8
1. [ ] Launch to design partners
2. [ ] Gather feedback
3. [ ] Iterate

---

**END OF MVP BUILD PLAN**

*Now go build. Ship fast, learn fast, iterate fast. The best code is code that ships.* 🚀

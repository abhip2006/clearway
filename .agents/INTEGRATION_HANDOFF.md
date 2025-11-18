# Integration Agent Handoff Documentation

This document provides integration information for other agents to consume the third-party services.

## Services Ready for Use

All 5 core integrations are configured and ready to use:

1. ✅ Clerk Authentication
2. ✅ Cloudflare R2 Storage
3. ✅ Inngest Background Jobs
4. ✅ Resend Email
5. ✅ Langfuse LLM Observability

---

## For Backend Agent

### Authentication

Use Clerk to get the current user:

```typescript
import { auth } from '@clerk/nextjs/server';

// In API routes or server components
export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // userId is the Clerk user ID
  // Use it to query your database
}
```

### File Upload to R2

Generate presigned URLs for client-side uploads:

```typescript
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function generateUploadUrl(fileKey: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 3600 // 1 hour
  });

  return uploadUrl;
}
```

Server-side upload:

```typescript
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, url: `${R2_PUBLIC_URL}/${key}` };
}
```

### Background Jobs with Inngest

Trigger document processing:

```typescript
import { inngest } from '@/lib/inngest';

// After document upload
await inngest.send({
  name: 'document.uploaded',
  data: {
    documentId: doc.id,
    userId: doc.userId,
    fileKey: doc.fileKey,
  },
});
```

Create custom background jobs:

```typescript
// app/api/inngest/functions/my-job.ts
import { inngest } from '@/lib/inngest';

export const myJob = inngest.createFunction(
  { id: 'my-job' },
  { event: 'my.event' },
  async ({ event, step }) => {
    // Your job logic
  }
);

// Don't forget to add to app/api/inngest/route.ts
```

### Send Emails with Resend

Use the pre-built email helper:

```typescript
import { sendCapitalCallReminder } from '@/lib/email/send';

await sendCapitalCallReminder('user@example.com', {
  fundName: 'Apollo Fund XI',
  amountDue: 250000,
  dueDate: new Date('2025-12-15'),
});
```

Or send custom emails:

```typescript
import { resend } from '@/lib/email';

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL!,
  to: 'user@example.com',
  subject: 'Your Subject',
  html: '<p>Email content</p>',
});
```

---

## For AI/ML Agent

### LLM Observability with Langfuse

Wrap your AI extraction calls:

```typescript
import { langfuse } from '@/lib/langfuse';

export async function extractCapitalCall(documentId: string) {
  // Create trace for this extraction
  const trace = langfuse.trace({
    name: 'capital-call-extraction',
    metadata: { documentId },
  });

  try {
    // Azure Document Intelligence OCR
    const ocrGeneration = trace.generation({
      name: 'azure-ocr',
      model: 'prebuilt-document',
      input: { documentId },
    });

    const extractedText = await performOCR(documentId);

    ocrGeneration.end({
      output: { text: extractedText },
    });

    // OpenAI GPT-4 extraction
    const gptGeneration = trace.generation({
      name: 'openai-extraction',
      model: 'gpt-4o-mini',
      input: { text: extractedText },
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [/* ... */],
    });

    const structuredData = parseResponse(response);

    gptGeneration.end({
      output: structuredData,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
      metadata: {
        cost: calculateCost(response.usage),
      },
    });

    // Complete trace
    trace.end({
      output: structuredData,
      metadata: {
        success: true,
      },
    });

    return structuredData;
  } catch (error) {
    // Log error to trace
    trace.end({
      metadata: {
        success: false,
        error: error.message,
      },
    });
    throw error;
  }
}
```

---

## For Frontend Agent

### Authentication Components

Pre-built Clerk components:

```typescript
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs';

export function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
```

Protect pages:

```typescript
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <div>Protected content</div>;
}
```

Get current user:

```typescript
'use client';

import { useUser } from '@clerk/nextjs';

export function UserProfile() {
  const { user } = useUser();

  return <div>Hello {user?.firstName}</div>;
}
```

### File Upload to R2

Client-side upload flow:

```typescript
'use client';

export function FileUpload() {
  async function handleUpload(file: File) {
    // 1. Get presigned URL from your API
    const response = await fetch('/api/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    const { uploadUrl, fileKey } = await response.json();

    // 2. Upload directly to R2
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    // 3. Notify your backend that upload is complete
    await fetch('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ fileKey }),
    });
  }

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

---

## For DevOps Agent

### Environment Variables Required

All integrations require environment variables to be set:

**Development:**
- Copy `.env.example` to `.env.local`
- Fill in actual values (see INTEGRATION_SETUP.md)

**Production (Vercel):**
```bash
# Clerk
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add CLERK_WEBHOOK_SECRET

# R2
vercel env add R2_ENDPOINT
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME
vercel env add R2_PUBLIC_URL

# Inngest
vercel env add INNGEST_EVENT_KEY
vercel env add INNGEST_SIGNING_KEY

# Resend
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL

# Langfuse
vercel env add LANGFUSE_PUBLIC_KEY
vercel env add LANGFUSE_SECRET_KEY
vercel env add LANGFUSE_HOST
```

### Webhook Endpoints

These endpoints must be publicly accessible:

1. **Clerk Webhooks**: `/api/webhooks/clerk`
   - Configure in Clerk Dashboard
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`

2. **Inngest**: `/api/inngest`
   - Configure in Inngest Dashboard
   - Automatically discovered in production

### Health Checks

Add these checks to your monitoring:

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    clerk: !!process.env.CLERK_SECRET_KEY,
    r2: !!process.env.R2_ACCESS_KEY_ID,
    inngest: !!process.env.INNGEST_EVENT_KEY,
    resend: !!process.env.RESEND_API_KEY,
    langfuse: !!process.env.LANGFUSE_SECRET_KEY,
  };

  const allHealthy = Object.values(checks).every(Boolean);

  return Response.json(
    { status: allHealthy ? 'healthy' : 'unhealthy', checks },
    { status: allHealthy ? 200 : 503 }
  );
}
```

---

## For Testing Agent

### Integration Tests

Tests are located in `tests/integration/`:

```bash
npm run test:integration
```

**Test Files:**
- `services.test.ts` - R2, Resend, Inngest integration tests
- `auth.test.ts` - Clerk webhook tests

**Test Environment:**
- Tests use real API calls (requires valid credentials)
- Set up test accounts for each service
- Use separate API keys for testing

**Mock Services:**
For unit tests, mock the service clients:

```typescript
import { vi } from 'vitest';

vi.mock('@/lib/storage', () => ({
  r2Client: {
    send: vi.fn(),
  },
  R2_BUCKET: 'test-bucket',
}));
```

---

## File Structure

```
clearway/
├── lib/
│   ├── storage.ts              # R2 client
│   ├── inngest.ts              # Inngest client
│   ├── email.ts                # Resend client
│   ├── langfuse.ts             # Langfuse client
│   └── email/
│       ├── send.ts             # Email helpers
│       └── templates/          # React Email templates
│           └── capital-call-reminder.tsx
├── app/
│   ├── layout.tsx              # Clerk provider
│   └── api/
│       ├── webhooks/
│       │   └── clerk/
│       │       └── route.ts    # Clerk webhook handler
│       └── inngest/
│           ├── route.ts        # Inngest API route
│           └── functions/      # Background jobs
│               ├── process-document.ts
│               └── send-reminders.ts
├── middleware.ts               # Clerk auth middleware
└── tests/
    └── integration/
        ├── services.test.ts
        └── auth.test.ts
```

---

## Status

All integrations are **COMPLETE** and ready for use.

See `.agents/status/integration-status.json` for detailed status.

---

## Support

For integration issues:
1. Check [INTEGRATIONS.md](../INTEGRATIONS.md) for troubleshooting
2. Check [INTEGRATION_SETUP.md](../INTEGRATION_SETUP.md) for setup
3. Review service dashboards for errors
4. Check environment variables are set correctly

For service-specific help:
- **Clerk**: https://clerk.com/docs
- **Cloudflare R2**: https://developers.cloudflare.com/r2
- **Inngest**: https://www.inngest.com/docs
- **Resend**: https://resend.com/docs
- **Langfuse**: https://langfuse.com/docs

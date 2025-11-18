# Third-Party Service Integrations

This document provides comprehensive documentation for all third-party service integrations in the Clearway MVP.

## Overview

Clearway integrates with 5 core third-party services:

1. **Clerk** - Authentication and user management
2. **Cloudflare R2** - Object storage (S3-compatible)
3. **Inngest** - Background jobs and workflows
4. **Resend** - Transactional email
5. **Langfuse** - LLM observability

## 1. Clerk Authentication

### Setup

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy API keys to `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
```

### Implementation

**Middleware** (`middleware.ts`):
- Protects all routes except public routes
- Ignores webhook routes

**Layout** (`app/layout.tsx`):
- Wraps entire app with `ClerkProvider`

**Webhook Handler** (`app/api/webhooks/clerk/route.ts`):
- Syncs user data from Clerk to database
- Handles `user.created`, `user.updated`, `user.deleted` events

### Usage in Code

```typescript
import { auth } from '@clerk/nextjs/server';

// In server components
const { userId } = await auth();

// Protect routes
if (!userId) {
  redirect('/sign-in');
}
```

```typescript
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

// In client components
<SignedOut>
  <SignInButton />
</SignedOut>
<SignedIn>
  <UserButton />
</SignedIn>
```

### Webhook Configuration

1. Go to Clerk Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy webhook secret to `CLERK_WEBHOOK_SECRET`

---

## 2. Cloudflare R2 Storage

### Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > R2
2. Create a bucket (e.g., `clearway-documents`)
3. Create API token with R2 read/write permissions
4. Add credentials to `.env.local`:

```bash
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="clearway-documents"
R2_PUBLIC_URL="https://cdn.clearway.com"
```

### CORS Configuration

In the R2 bucket settings, add CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://clearway.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### Usage in Code

```typescript
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Upload file
await r2Client.send(
  new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: 'path/to/file.pdf',
    Body: fileBuffer,
    ContentType: 'application/pdf',
  })
);

// Generate presigned URL for upload
const command = new PutObjectCommand({
  Bucket: R2_BUCKET,
  Key: 'path/to/file.pdf',
  ContentType: 'application/pdf',
});

const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
```

---

## 3. Inngest Background Jobs

### Setup

1. Create account at [inngest.com](https://inngest.com)
2. Create a new app
3. Copy keys to `.env.local`:

```bash
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"
```

### Development

Start the Inngest dev server:

```bash
npx inngest-cli@latest dev
```

This will:
- Run on `http://localhost:8288`
- Provide a UI for viewing events and function runs
- Auto-discover functions from `/api/inngest`

### Implemented Functions

**1. Process Document** (`process-document.ts`):
- Triggered by: `document.uploaded` event
- Steps:
  1. Update document status to PROCESSING
  2. Extract data using AI/ML pipeline
  3. Save extraction to database
  4. Update document status to REVIEW

**2. Send Reminders** (`send-reminders.ts`):
- Triggered by: CRON schedule (daily at 9 AM)
- Steps:
  1. Find capital calls due in next 7 days
  2. Send reminder emails at 7, 3, and 1 days before due date

### Usage in Code

```typescript
import { inngest } from '@/lib/inngest';

// Send event
await inngest.send({
  name: 'document.uploaded',
  data: { documentId: '123' },
});

// Create new function
export const myFunction = inngest.createFunction(
  { id: 'my-function' },
  { event: 'my.event' },
  async ({ event, step }) => {
    // Your logic here
  }
);
```

---

## 4. Resend Email

### Setup

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create API key
4. Add to `.env.local`:

```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Clearway <alerts@clearway.com>"
```

### Email Templates

Templates are built with React Email and located in `lib/email/templates/`.

**Capital Call Reminder** (`capital-call-reminder.tsx`):
- Professional email design
- Displays fund name, amount, and due date
- Includes "View Details" button

### Usage in Code

```typescript
import { sendCapitalCallReminder } from '@/lib/email/send';

await sendCapitalCallReminder('user@example.com', {
  fundName: 'Apollo Fund XI',
  amountDue: 250000,
  dueDate: new Date('2025-12-15'),
});
```

```typescript
import { resend } from '@/lib/email';

// Send custom email
await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL!,
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<p>Email content</p>',
});
```

### Preview Templates

Run the React Email dev server:

```bash
npm run email:dev
```

This will open a browser at `http://localhost:3000` with preview of all templates.

---

## 5. Langfuse LLM Observability

### Setup

1. Create account at [cloud.langfuse.com](https://cloud.langfuse.com)
2. Create a new project
3. Copy keys to `.env.local`:

```bash
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_HOST="https://cloud.langfuse.com"
```

### Usage in Code

```typescript
import { langfuse } from '@/lib/langfuse';

// Create trace
const trace = langfuse.trace({
  name: 'capital-call-extraction',
  metadata: { documentId: '123' },
});

// Add generation
const generation = trace.generation({
  name: 'openai-extraction',
  model: 'gpt-4o-mini',
  input: prompt,
});

// Complete generation
generation.end({
  output: extractedData,
  usage: {
    promptTokens: 1000,
    completionTokens: 500,
  },
  metadata: {
    cost: 0.01,
  },
});

// Complete trace
trace.end({
  output: extraction,
});
```

### Dashboard Features

- View all LLM calls
- Track costs per user/document
- Monitor accuracy and performance
- Debug failed extractions

---

## Testing Integrations

Run integration tests:

```bash
npm run test:integration
```

Tests are located in `tests/integration/`:
- `services.test.ts` - Tests R2, Resend, Inngest
- `auth.test.ts` - Tests Clerk webhook handling

---

## Environment Variables

See `.env.example` for complete list of required environment variables.

Copy to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

---

## Troubleshooting

### Clerk

**Issue**: Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check webhook secret matches `.env.local`
- View webhook logs in Clerk dashboard

### R2

**Issue**: CORS errors on upload
- Verify CORS policy is set in R2 bucket settings
- Check `AllowedOrigins` includes your domain

### Inngest

**Issue**: Functions not appearing in dev server
- Ensure functions are exported from files in `app/api/inngest/functions/`
- Verify functions are imported in `app/api/inngest/route.ts`
- Restart dev server

### Resend

**Issue**: Emails not sending
- Verify domain is verified in Resend dashboard
- Check API key is correct
- View email logs in Resend dashboard

### Langfuse

**Issue**: Traces not appearing
- Ensure `langfuse.shutdownAsync()` is called on process exit
- Check public and secret keys are correct
- Allow 1-2 minutes for traces to appear in dashboard

---

## Security Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Rotate keys regularly** - Especially production keys
3. **Use different keys for dev/prod** - Prevent accidental prod usage
4. **Verify webhook signatures** - Always verify Clerk/Inngest signatures
5. **Limit API key permissions** - Use minimum required permissions

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables set in production environment
- [ ] Clerk domain allowlist configured
- [ ] Clerk webhook endpoint configured with production URL
- [ ] R2 CORS policy includes production domain
- [ ] Resend domain verified
- [ ] Inngest production environment configured
- [ ] Langfuse production project created
- [ ] All integration tests passing
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring alerts configured

---

For more details, see individual agent specifications in `/agents/integration-agent.md`.

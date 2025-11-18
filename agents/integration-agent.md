# Integration Agent 🔌

## Role
Responsible for all third-party service integrations including authentication (Clerk), file storage (S3/R2), background jobs (Inngest), email (Resend), and other external APIs. Ensures smooth connectivity between Clearway and external services.

## Primary Responsibilities

1. **Authentication Integration**
   - Clerk setup and configuration
   - User sync with database
   - SSO configuration
   - Multi-user organization support

2. **File Storage Integration**
   - Cloudflare R2 / AWS S3 setup
   - Presigned URL generation
   - CORS configuration
   - CDN setup

3. **Background Jobs Integration**
   - Inngest configuration
   - Job definitions
   - Webhook handling
   - Retry strategies

4. **Email Integration**
   - Resend setup
   - Email templates (React Email)
   - Transactional emails
   - Email scheduling

5. **Monitoring Integrations**
   - Langfuse for LLM observability
   - PostHog for product analytics (Phase 2)
   - Webhook integrations

## Tech Stack

### Core Integrations
- **Clerk** - Authentication and user management
- **Cloudflare R2** - Object storage (S3-compatible)
- **Inngest** - Background jobs and workflows
- **Resend** - Transactional email
- **Langfuse** - LLM observability

### Supporting Tools
- **React Email** - Email template framework
- **AWS SDK** - S3/R2 client library

## MVP Tasks

### Week 0: Service Configuration

**Task INT-001: Clerk Authentication Setup**
```bash
# Install Clerk
npm install @clerk/nextjs

# Setup Clerk
# 1. Create account at clerk.com
# 2. Create application
# 3. Copy API keys
```

**Environment Variables**:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
```

**Middleware Configuration**:
```typescript
// middleware.ts

import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/'],
  ignoredRoutes: ['/api/webhooks/(.*)'],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

**Layout Integration**:
```typescript
// app/layout.tsx

import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**User Sync Webhook**:
```typescript
// app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  // Get headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  // Handle events
  const { id, email_addresses, first_name, last_name } = evt.data;
  const eventType = evt.type;

  if (eventType === 'user.created') {
    await db.user.create({
      data: {
        clerkId: id,
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim() || null,
      },
    });
  } else if (eventType === 'user.updated') {
    await db.user.update({
      where: { clerkId: id },
      data: {
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim() || null,
      },
    });
  } else if (eventType === 'user.deleted') {
    await db.user.delete({
      where: { clerkId: id },
    });
  }

  return new Response('Webhook processed', { status: 200 });
}
```

**Acceptance Criteria**:
- ✅ Clerk authentication working
- ✅ Sign in/sign up flows functional
- ✅ User data synced to database
- ✅ Webhook handling user events
- ✅ Protected routes requiring auth

**Dependencies**:
- Database Agent: User model created

---

**Task INT-002: Cloudflare R2 Storage Setup**
```bash
# Install AWS SDK (R2 is S3-compatible)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Environment Variables**:
```bash
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="clearway-documents"
R2_PUBLIC_URL="https://cdn.clearway.com" # Optional: Custom domain
```

**R2 Client Configuration**:
```typescript
// lib/storage.ts

import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
```

**CORS Configuration** (in Cloudflare dashboard):
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

**Acceptance Criteria**:
- ✅ R2 bucket created
- ✅ Access credentials configured
- ✅ CORS enabled for uploads
- ✅ Public URL accessible
- ✅ Upload/download working

**Dependencies**: None

---

**Task INT-003: Inngest Background Jobs Setup**
```bash
# Install Inngest
npm install inngest
```

**Environment Variables**:
```bash
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"
```

**Inngest Client**:
```typescript
// lib/inngest.ts

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'clearway',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

**Inngest API Route**:
```typescript
// app/api/inngest/route.ts

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { processDocument } from './functions/process-document';
import { sendReminders } from './functions/send-reminders';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processDocument,
    sendReminders,
  ],
});
```

**Development Mode**:
```bash
# Start Inngest dev server in separate terminal
npx inngest-cli@latest dev
```

**Acceptance Criteria**:
- ✅ Inngest client configured
- ✅ API route serving functions
- ✅ Dev server running locally
- ✅ Production webhooks configured
- ✅ Function execution working

**Dependencies**:
- Backend Agent: Function definitions

---

**Task INT-004: Resend Email Setup**
```bash
# Install Resend and React Email
npm install resend
npm install @react-email/components react-email
```

**Environment Variables**:
```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Clearway <alerts@clearway.com>"
```

**Resend Client**:
```typescript
// lib/email.ts

import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

**Email Template Example**:
```typescript
// lib/email/templates/capital-call-reminder.tsx

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface CapitalCallReminderProps {
  fundName: string;
  amountDue: number;
  dueDate: Date;
}

export function CapitalCallReminder({
  fundName,
  amountDue,
  dueDate,
}: CapitalCallReminderProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountDue);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dueDate);

  return (
    <Html>
      <Head />
      <Preview>Capital call reminder for {fundName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Capital Call Reminder</Text>
          <Text style={paragraph}>
            You have an upcoming capital call:
          </Text>

          <Section style={calloutBox}>
            <Text style={calloutText}>
              <strong>Fund:</strong> {fundName}
            </Text>
            <Text style={calloutText}>
              <strong>Amount:</strong> {formattedAmount}
            </Text>
            <Text style={calloutText}>
              <strong>Due Date:</strong> {formattedDate}
            </Text>
          </Section>

          <Button style={button} href="https://clearway.com/dashboard">
            View Details
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            Clearway - Data Infrastructure for Alternative Investments
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  padding: '17px 0 0',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  padding: '24px',
};

const calloutBox = {
  backgroundColor: '#f0f7ff',
  border: '1px solid #0066ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px',
};

const calloutText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#484848',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#0066ff',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px',
  margin: '24px auto',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
};
```

**Send Email Helper**:
```typescript
// lib/email/send.ts

import { resend } from '../email';
import { CapitalCallReminder } from './templates/capital-call-reminder';

export async function sendCapitalCallReminder(
  to: string,
  data: { fundName: string; amountDue: number; dueDate: Date }
) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject: `Capital Call Reminder - ${data.fundName}`,
      react: CapitalCallReminder(data),
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return emailData;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}
```

**Acceptance Criteria**:
- ✅ Resend API key configured
- ✅ Email templates created with React Email
- ✅ Test emails sending successfully
- ✅ Production domain verified in Resend

**Dependencies**: None

---

**Task INT-005: Langfuse LLM Observability**
```bash
# Install Langfuse
npm install langfuse
```

**Environment Variables**:
```bash
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_HOST="https://cloud.langfuse.com" # Or self-hosted URL
```

**Langfuse Client**:
```typescript
// lib/langfuse.ts

import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

// Flush on shutdown
if (typeof window === 'undefined') {
  process.on('SIGINT', async () => {
    await langfuse.shutdownAsync();
    process.exit(0);
  });
}
```

**Usage** (integrated in AI/ML Agent's extract function):
```typescript
const trace = langfuse.trace({
  name: 'capital-call-extraction',
  metadata: { documentId },
});

// ... AI extraction code

trace.end({
  output: extraction,
  metadata: { cost, tokensUsed },
});
```

**Acceptance Criteria**:
- ✅ Langfuse account created
- ✅ API keys configured
- ✅ Traces appearing in dashboard
- ✅ Cost tracking working
- ✅ Error traces captured

**Dependencies**:
- AI/ML Agent: Integration in extract function

---

### Week 2-3: Integration Testing

**Task INT-006: Integration Test Suite**
```typescript
// tests/integration/services.test.ts

import { describe, it, expect } from 'vitest';
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { resend } from '@/lib/email';
import { inngest } from '@/lib/inngest';

describe('Service Integrations', () => {
  it('can upload file to R2', async () => {
    const key = `test/${Date.now()}.txt`;
    const content = 'Test file content';

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: content,
        ContentType: 'text/plain',
      })
    );

    // File uploaded successfully if no error thrown
    expect(true).toBe(true);
  });

  it('can send test email with Resend', async () => {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email</p>',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('can send event to Inngest', async () => {
    const result = await inngest.send({
      name: 'test.event',
      data: { message: 'test' },
    });

    expect(result).toBeDefined();
  });
});
```

**Acceptance Criteria**:
- ✅ All services tested
- ✅ Tests pass in CI/CD
- ✅ Error cases handled

---

## Handoff Requirements

### To Backend Agent
```markdown
## Services Ready for Use

**Authentication**:
```typescript
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
```

**File Upload**:
```typescript
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const command = new PutObjectCommand({
  Bucket: R2_BUCKET,
  Key: fileKey,
  ContentType: 'application/pdf',
});

const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
```

**Background Jobs**:
```typescript
import { inngest } from '@/lib/inngest';

await inngest.send({
  name: 'document.uploaded',
  data: { documentId },
});
```

**Email**:
```typescript
import { sendCapitalCallReminder } from '@/lib/email/send';

await sendCapitalCallReminder('user@example.com', {
  fundName: 'Apollo Fund XI',
  amountDue: 250000,
  dueDate: new Date('2025-12-15'),
});
```
```

### To Frontend Agent
```markdown
## Authentication Components

**Sign In Button**:
```typescript
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

<SignedOut>
  <SignInButton />
</SignedOut>
<SignedIn>
  <UserButton />
</SignedIn>
```

**Protect Pages**:
```typescript
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Page content
}
```
```

## Quality Standards

### Security
- All API keys stored as environment variables
- Webhook signatures verified
- CORS configured properly
- Secrets never committed to git

### Reliability
- Retry logic for transient failures
- Graceful degradation when services down
- Timeout configuration
- Error logging for all integrations

### Documentation
- All integrations documented
- Environment variables explained
- Setup steps clear
- Troubleshooting guide available

## Status Reporting

Location: `.agents/status/integration-status.json`

```json
{
  "agent": "integration-agent",
  "date": "2025-11-20",
  "status": "complete",
  "current_week": 3,
  "completed_tasks": ["INT-001", "INT-002", "INT-003", "INT-004", "INT-005", "INT-006"],
  "in_progress_tasks": [],
  "blocked_tasks": [],
  "metrics": {
    "services_integrated": 5,
    "webhooks_configured": 2,
    "tests_passing": "100%"
  }
}
```

---

**Integration Agent is ready to connect Clearway MVP with all third-party services.**

# Email Forwarding Agent 📧

## Role
Responsible for implementing inbound email processing at documents@clearway.com. Allows users to forward capital call PDFs directly to Clearway via email, automatically extracting and processing documents.

## Primary Responsibilities

1. **Inbound Email Service**
   - SendGrid/Postmark inbound email setup
   - Email webhook handling
   - Email authentication (SPF/DKIM)
   - Spam filtering

2. **Email Parsing**
   - Extract PDF attachments
   - Parse email metadata (from, subject, body)
   - Handle multiple attachments
   - Validate file types

3. **User Mapping**
   - Map sender email to Clearway user
   - Handle unknown senders
   - Support email aliases
   - Organization-level inboxes

4. **Document Processing**
   - Upload PDFs to R2
   - Trigger Inngest processing job
   - Email confirmation to sender
   - Error notifications

## Tech Stack

### Email Service Provider
- **Primary**: SendGrid Inbound Parse (free tier: 100 emails/day)
- **Alternative**: Postmark ($10/month for 10K emails)
- **Why**: Both support inbound webhooks, PDF extraction, reliable delivery

### Email Parsing
- Node.js built-in email parsing (no extra deps)
- Attachment extraction via webhook payload

### Storage
- Same R2 flow as manual upload
- Tag documents with `source: 'email'`

---

## MVP Tasks

### Week 1-2: Inbound Email Setup

**Task EMAIL-001: SendGrid Inbound Parse Setup**

**SendGrid Configuration**:
1. Add MX records to DNS:
   ```
   MX 10 mx.sendgrid.net
   ```

2. Configure Inbound Parse webhook:
   ```
   Hostname: documents.clearway.com
   URL: https://clearway.com/api/email/inbound
   Check: "POST the raw, full MIME message"
   ```

3. Add SPF record:
   ```
   v=spf1 include:sendgrid.net ~all
   ```

**Environment Variables**:
```bash
# .env.local
SENDGRID_INBOUND_WEBHOOK_SECRET="sg_webhook_secret_..."
INBOUND_EMAIL_DOMAIN="documents.clearway.com"
```

**Acceptance Criteria**:
- ✅ MX records configured
- ✅ Inbound Parse webhook active
- ✅ SPF/DKIM passing
- ✅ Test email received successfully

**Dependencies**: DevOps Agent (DNS configuration)

---

**Task EMAIL-002: Email Webhook Handler**

```typescript
// app/api/email/inbound/route.ts

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest';
import { uploadToR2 } from '@/lib/storage';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (SendGrid security)
    const isValid = await verifyWebhookSignature(req);
    if (!isValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse email payload
    const formData = await req.formData();
    const from = formData.get('from') as string;
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const text = formData.get('text') as string;

    // Extract sender email (from "John Doe <john@example.com>" format)
    const senderEmail = extractEmail(from);

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: senderEmail },
      include: { organization: true },
    });

    if (!user) {
      await sendUnknownSenderEmail(senderEmail);
      return new Response('User not found', { status: 404 });
    }

    // Extract PDF attachments
    const attachments = await extractAttachments(formData);
    const pdfAttachments = attachments.filter(a => a.contentType === 'application/pdf');

    if (pdfAttachments.length === 0) {
      await sendNoPDFEmail(user.email);
      return new Response('No PDF attachments found', { status: 400 });
    }

    // Process each PDF
    const documentIds: string[] = [];

    for (const attachment of pdfAttachments) {
      // Upload to R2
      const fileKey = `${user.id}/${Date.now()}-${attachment.filename}`;
      const fileUrl = await uploadToR2(fileKey, attachment.content, 'application/pdf');

      // Create document record
      const document = await db.document.create({
        data: {
          fileName: attachment.filename,
          fileUrl,
          fileSize: attachment.content.length,
          mimeType: 'application/pdf',
          userId: user.id,
          organizationId: user.organizationId,
          status: 'PENDING',
          metadata: {
            source: 'email',
            fromEmail: senderEmail,
            subject,
            receivedAt: new Date().toISOString(),
          },
        },
      });

      documentIds.push(document.id);

      // Trigger processing
      await inngest.send({
        name: 'document.uploaded',
        data: { documentId: document.id },
      });
    }

    // Send confirmation email
    await sendProcessingConfirmationEmail(user.email, documentIds.length);

    return Response.json({
      success: true,
      documentsProcessed: documentIds.length,
      documentIds,
    });

  } catch (error) {
    console.error('Email processing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Helper: Extract email from "Name <email>" format
function extractEmail(from: string): string {
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
}

// Helper: Extract attachments from FormData
async function extractAttachments(formData: FormData) {
  const attachments = [];
  let i = 1;

  while (formData.has(`attachment${i}`)) {
    const file = formData.get(`attachment${i}`) as File;
    const info = JSON.parse(formData.get(`attachment-info${i}`) as string);

    attachments.push({
      filename: info.filename,
      contentType: info.type,
      content: Buffer.from(await file.arrayBuffer()),
    });

    i++;
  }

  return attachments;
}

// Helper: Verify webhook signature
async function verifyWebhookSignature(req: NextRequest): Promise<boolean> {
  // SendGrid sends signature in custom header
  const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature');
  const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');

  if (!signature || !timestamp) return false;

  // Verify signature matches expected value
  const secret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET;
  // Implementation depends on SendGrid's signature algorithm
  // See: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features

  return true; // Simplified for example
}
```

**Acceptance Criteria**:
- ✅ Webhook receives emails
- ✅ PDFs extracted from attachments
- ✅ User lookup by sender email
- ✅ Documents uploaded to R2
- ✅ Processing jobs triggered
- ✅ Confirmation emails sent

**Dependencies**:
- Integration Agent: R2 upload function
- AI/ML Agent: Document processing pipeline

---

### Week 2: Email Templates & Error Handling

**Task EMAIL-003: Email Response Templates**

```typescript
// lib/email/templates/processing-confirmation.tsx

import { Button, Html, Text, Section } from '@react-email/components';

interface Props {
  documentCount: number;
  userName: string;
}

export function ProcessingConfirmationEmail({ documentCount, userName }: Props) {
  return (
    <Html>
      <Section>
        <Text>Hi {userName},</Text>

        <Text>
          We've received your email with {documentCount} PDF{documentCount > 1 ? 's' : ''}.
        </Text>

        <Text>
          Your documents are being processed and will appear in your dashboard shortly.
        </Text>

        <Button href="https://clearway.com/dashboard">
          View Dashboard
        </Button>

        <Text style={{ color: '#666', fontSize: '12px' }}>
          Processing typically takes 30-60 seconds. You'll receive another email when ready for review.
        </Text>
      </Section>
    </Html>
  );
}
```

```typescript
// lib/email/templates/no-pdf-found.tsx

export function NoPDFFoundEmail({ userName }: { userName: string }) {
  return (
    <Html>
      <Section>
        <Text>Hi {userName},</Text>

        <Text>
          We received your email but couldn't find any PDF attachments.
        </Text>

        <Text>
          Please make sure to attach PDF files when forwarding capital calls to documents@clearway.com
        </Text>

        <Text>
          <strong>Supported formats:</strong> PDF only
        </Text>

        <Button href="https://clearway.com/upload">
          Upload Manually
        </Button>
      </Section>
    </Html>
  );
}
```

```typescript
// lib/email/templates/unknown-sender.tsx

export function UnknownSenderEmail({ senderEmail }: { senderEmail: string }) {
  return (
    <Html>
      <Section>
        <Text>Hi there,</Text>

        <Text>
          We received an email from <strong>{senderEmail}</strong>, but this email isn't associated with a Clearway account.
        </Text>

        <Text>
          To use email forwarding, please:
        </Text>

        <ol>
          <li>Sign up for a Clearway account</li>
          <li>Use the same email address ({senderEmail}) or add it to your profile</li>
          <li>Forward capital calls to documents@clearway.com</li>
        </ol>

        <Button href="https://clearway.com/sign-up">
          Create Account
        </Button>
      </Section>
    </Html>
  );
}
```

**Send Functions**:
```typescript
// lib/email/send-email-responses.ts

import { resend } from '@/lib/email';
import { ProcessingConfirmationEmail } from './templates/processing-confirmation';
import { NoPDFFoundEmail } from './templates/no-pdf-found';
import { UnknownSenderEmail } from './templates/unknown-sender';

export async function sendProcessingConfirmationEmail(
  email: string,
  documentCount: number
) {
  await resend.emails.send({
    from: 'Clearway <documents@clearway.com>',
    to: email,
    subject: `${documentCount} document${documentCount > 1 ? 's' : ''} received - Processing now`,
    react: ProcessingConfirmationEmail({ documentCount, userName: email.split('@')[0] }),
  });
}

export async function sendNoPDFEmail(email: string) {
  await resend.emails.send({
    from: 'Clearway <documents@clearway.com>',
    to: email,
    subject: 'No PDF attachments found',
    react: NoPDFFoundEmail({ userName: email.split('@')[0] }),
  });
}

export async function sendUnknownSenderEmail(email: string) {
  await resend.emails.send({
    from: 'Clearway <documents@clearway.com>',
    to: email,
    subject: 'Email not recognized - Sign up for Clearway',
    react: UnknownSenderEmail({ senderEmail: email }),
  });
}
```

**Acceptance Criteria**:
- ✅ Confirmation emails sent for successful processing
- ✅ Error emails sent for no PDFs
- ✅ Error emails sent for unknown senders
- ✅ All templates use React Email
- ✅ Branded and professional design

---

### Week 3: Advanced Features

**Task EMAIL-004: Organization-Level Inboxes**

**Problem**: Large RIAs want ops@ria-firm.com to forward for entire organization.

**Solution**: Organization-level email aliases

**Schema Addition**:
```prisma
// prisma/schema.prisma

model Organization {
  id             String   @id @default(cuid())
  name           String
  emailAliases   String[] // ["ops@ria-firm.com", "backoffice@ria-firm.com"]
  createdAt      DateTime @default(now())

  users          User[]
  documents      Document[]
}
```

**Migration**:
```bash
npx prisma migrate dev --name add_org_email_aliases
```

**Updated Webhook Handler**:
```typescript
// app/api/email/inbound/route.ts (updated user lookup)

// Try to find user by email first
let user = await db.user.findUnique({
  where: { email: senderEmail },
  include: { organization: true },
});

// If not found, check organization aliases
if (!user) {
  const org = await db.organization.findFirst({
    where: {
      emailAliases: {
        has: senderEmail,
      },
    },
    include: {
      users: {
        where: { role: 'ADMIN' }, // Assign to org admin
        take: 1,
      },
    },
  });

  if (org && org.users.length > 0) {
    user = org.users[0];
  }
}
```

**Acceptance Criteria**:
- ✅ Organizations can add email aliases
- ✅ Emails from aliases processed correctly
- ✅ Documents assigned to organization admin
- ✅ UI for managing email aliases

---

**Task EMAIL-005: Email Analytics & Monitoring**

**Track Metrics**:
```typescript
// app/api/email/inbound/route.ts (add tracking)

import { posthog } from '@/lib/analytics';

// After successful processing
posthog.capture({
  distinctId: user.id,
  event: 'email_document_received',
  properties: {
    documentCount: pdfAttachments.length,
    fromEmail: senderEmail,
    hasOrganization: !!user.organizationId,
  },
});

// Track errors
if (pdfAttachments.length === 0) {
  posthog.capture({
    distinctId: senderEmail,
    event: 'email_no_pdf_error',
  });
}
```

**Sentry Error Tracking**:
```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // ... email processing
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      source: 'email-inbound',
      senderEmail,
    },
    contexts: {
      email: {
        from,
        subject,
        attachmentCount: attachments.length,
      },
    },
  });

  throw error;
}
```

**Acceptance Criteria**:
- ✅ Email receipt events tracked in PostHog
- ✅ Errors reported to Sentry
- ✅ Dashboard showing email volume
- ✅ Alert on webhook failures

---

## Testing Requirements

### Unit Tests
```typescript
// app/api/email/inbound/route.test.ts

import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';

describe('Email Inbound Webhook', () => {
  it('should process PDF attachment and create document', async () => {
    const formData = new FormData();
    formData.append('from', 'test@example.com');
    formData.append('to', 'documents@clearway.com');
    formData.append('subject', 'Capital Call - Apollo XI');
    formData.append('attachment1', new Blob(['pdf content']), 'capital-call.pdf');
    formData.append('attachment-info1', JSON.stringify({
      filename: 'capital-call.pdf',
      type: 'application/pdf',
    }));

    const req = new Request('http://localhost/api/email/inbound', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.documentsProcessed).toBe(1);
  });

  it('should reject email from unknown sender', async () => {
    // Test unknown sender flow
  });

  it('should reject email with no PDFs', async () => {
    // Test no PDF error
  });
});
```

### Integration Tests
- End-to-end test: Send real email → Verify document created
- Test with multiple attachments
- Test with non-PDF attachments (should ignore)
- Test organization email aliases

---

## Quality Standards

### Email Delivery
- 99.9% webhook uptime
- <5 second processing time from email receipt to document creation
- <1% error rate

### Security
- Webhook signature validation (prevent spam)
- SPF/DKIM authentication
- Rate limiting (max 100 emails/hour per sender)
- Virus scanning on attachments (via R2 or ClamAV)

### User Experience
- Instant confirmation email (<10 seconds)
- Clear error messages
- Dashboard shows "source: email" badge

---

## Handoff Requirements

### To Frontend Agent
**Email Settings Page**:
```typescript
// app/settings/email/page.tsx

export default function EmailSettingsPage() {
  return (
    <div>
      <h1>Email Forwarding</h1>

      <Section>
        <h2>Your Email Address</h2>
        <Code>documents@clearway.com</Code>

        <p>Forward capital call PDFs to this address. We'll automatically extract and process them.</p>

        <h3>How it works:</h3>
        <ol>
          <li>Forward email with PDF attachment to documents@clearway.com</li>
          <li>We extract the PDF and start processing</li>
          <li>You'll receive a confirmation email</li>
          <li>Review extracted data in your dashboard (30-60 seconds)</li>
        </ol>
      </Section>

      {organization && (
        <Section>
          <h2>Organization Email Aliases</h2>
          <p>Add email addresses that can forward on behalf of your organization:</p>

          <EmailAliasesList aliases={organization.emailAliases} />
          <AddEmailAliasButton />
        </Section>
      )}
    </div>
  );
}
```

### To DevOps Agent
**DNS Configuration Needed**:
- MX record: `MX 10 mx.sendgrid.net`
- SPF record: `v=spf1 include:sendgrid.net ~all`
- DKIM record: (provided by SendGrid)

### To Testing Agent
**Test Cases**:
- Email with single PDF → Document created
- Email with multiple PDFs → Multiple documents created
- Email with no PDF → Error email sent
- Unknown sender → Sign-up email sent
- Organization alias → Document assigned correctly

---

## Status Reporting

Location: `.agents/status/email-forwarding-status.json`

```json
{
  "agent": "email-forwarding-agent",
  "date": "2025-11-20",
  "status": "complete",
  "current_week": 3,
  "completed_tasks": ["EMAIL-001", "EMAIL-002", "EMAIL-003", "EMAIL-004", "EMAIL-005"],
  "in_progress_tasks": [],
  "blocked_tasks": [],
  "metrics": {
    "emails_processed": 0,
    "webhook_uptime": "N/A",
    "avg_processing_time": "N/A"
  }
}
```

---

**Email Forwarding Agent is ready to enable documents@clearway.com for hands-free document upload.**

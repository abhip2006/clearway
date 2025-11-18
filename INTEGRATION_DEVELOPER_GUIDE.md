# Integration Developer Guide

## Quick Start for Developers

This guide provides practical examples and best practices for using Clearway's integration services.

---

## Table of Contents

1. [QuickBooks Integration](#quickbooks-integration)
2. [DocuSign Integration](#docusign-integration)
3. [Webhook Marketplace](#webhook-marketplace)
4. [Testing Integrations](#testing-integrations)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## QuickBooks Integration

### Initial Setup

1. **Create QuickBooks App**
   - Go to [Intuit Developer Portal](https://developer.intuit.com/)
   - Create new app
   - Get Client ID and Client Secret
   - Add redirect URI: `https://yourdomain.com/api/integrations/quickbooks/callback`

2. **Configure Environment**
   ```bash
   QUICKBOOKS_CLIENT_ID=ABxxxxxxxxxxxx
   QUICKBOOKS_CLIENT_SECRET=yyyyyyyyyyyy
   ```

### OAuth Flow

```typescript
// app/integrations/quickbooks/connect/page.tsx
import { quickBooksService } from '@/lib/integrations';

export default async function ConnectQuickBooks() {
  const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/integrations/quickbooks/callback`;
  const state = crypto.randomUUID(); // Store this in session

  const authUrl = quickBooksService.getAuthorizationUrl(redirectUri, state);

  return (
    <div>
      <a href={authUrl}>Connect to QuickBooks</a>
    </div>
  );
}
```

### OAuth Callback Handler

```typescript
// app/api/integrations/quickbooks/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { quickBooksService } from '@/lib/integrations';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect('/login');
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const realmId = searchParams.get('realmId');

  // Verify state matches session (prevent CSRF)
  // ... state verification logic

  if (!code || !realmId) {
    return NextResponse.redirect('/integrations?error=no_code');
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_URL}/api/integrations/quickbooks/callback`;
    const tokens = await quickBooksService.getTokensFromCode(code, redirectUri);

    // Get user's organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user?.organizationId) {
      throw new Error('User has no organization');
    }

    // Store connection
    await db.accountingConnection.create({
      data: {
        organizationId: user.organizationId,
        provider: 'QUICKBOOKS',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        realmId,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        config: {
          capitalCallsAccountId: '', // To be configured later
          investorEquityAccountId: '',
          bankAccountId: '',
        },
      },
    });

    return NextResponse.redirect('/integrations?success=quickbooks');
  } catch (error) {
    console.error('QuickBooks OAuth error:', error);
    return NextResponse.redirect('/integrations?error=oauth_failed');
  }
}
```

### Configure Account Mappings

```typescript
// app/api/integrations/quickbooks/configure/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateQuickBooksConfig } from '@/lib/integrations/config';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { organizationId, config } = body;

  await updateQuickBooksConfig(organizationId, {
    capitalCallsAccountId: config.capitalCallsAccountId,
    investorEquityAccountId: config.investorEquityAccountId,
    bankAccountId: config.bankAccountId,
  });

  return NextResponse.json({ success: true });
}
```

### Create Journal Entry for Capital Call

```typescript
// In your capital call approval flow
import { quickBooksService } from '@/lib/integrations';
import { isQuickBooksConfigured } from '@/lib/integrations/config';

async function approveCapitalCall(capitalCallId: string, organizationId: string) {
  // Approve capital call in database
  await db.capitalCall.update({
    where: { id: capitalCallId },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });

  // Create QuickBooks journal entry if configured
  if (await isQuickBooksConfigured(organizationId)) {
    try {
      await quickBooksService.createJournalEntry({
        capitalCallId,
        organizationId,
      });
    } catch (error) {
      console.error('QuickBooks journal entry failed:', error);
      // Don't fail the approval, just log the error
    }
  }
}
```

---

## DocuSign Integration

### Initial Setup

1. **Create DocuSign Integration**
   - Go to [DocuSign Admin](https://admindemo.docusign.com/)
   - Create new app
   - Generate RSA key pair
   - Add redirect URI
   - Enable JWT Grant

2. **Configure Environment**
   ```bash
   DOCUSIGN_INTEGRATION_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   DOCUSIGN_USER_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
   DOCUSIGN_ACCOUNT_ID=zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz
   DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
   DOCUSIGN_OAUTH_BASE_PATH=account-d.docusign.com
   DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   ```

### Send Document for Signature

```typescript
// app/api/capital-calls/[id]/send-for-signature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { docuSignService } from '@/lib/integrations';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const capitalCallId = params.id;
  const body = await req.json();

  try {
    const result = await docuSignService.sendForSignature({
      capitalCallId,
      signers: body.signers,
      emailSubject: body.emailSubject,
      emailMessage: body.emailMessage,
    });

    return NextResponse.json({
      success: true,
      envelopeId: result.envelopeId,
      status: result.status,
    });
  } catch (error: any) {
    console.error('DocuSign error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Check Signature Status

```typescript
// app/api/signatures/[envelopeId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { docuSignService } from '@/lib/integrations';

export async function GET(
  req: NextRequest,
  { params }: { params: { envelopeId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const status = await docuSignService.checkStatus(params.envelopeId);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### DocuSign Webhook Handler

```typescript
// app/api/webhooks/docusign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { docuSignService } from '@/lib/integrations';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('X-DocuSign-Signature-1');

  // Verify signature (if HMAC key configured)
  const hmacKey = process.env.DOCUSIGN_HMAC_KEY;
  if (hmacKey && signature) {
    const isValid = docuSignService.verifyWebhookSignature(
      body,
      signature,
      hmacKey
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const event = JSON.parse(body);

  try {
    await docuSignService.processWebhookEvent(event);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DocuSign webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Webhook Marketplace

### Create Webhook Endpoint (Frontend)

```typescript
// components/webhooks/create-webhook-form.tsx
'use client';

import { useState } from 'react';

const EVENT_TYPES = [
  { value: 'capital_call.created', label: 'Capital Call Created' },
  { value: 'capital_call.approved', label: 'Capital Call Approved' },
  { value: 'capital_call.rejected', label: 'Capital Call Rejected' },
  { value: 'document.uploaded', label: 'Document Uploaded' },
  { value: 'document.processed', label: 'Document Processed' },
  { value: 'payment.received', label: 'Payment Received' },
  { value: 'signature.completed', label: 'Signature Completed' },
];

export function CreateWebhookForm() {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const response = await fetch('/api/webhooks/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, events, enabled: true }),
    });

    const data = await response.json();

    if (data.webhook) {
      setSecret(data.webhook.secret);
      alert('Webhook created! Save your secret key.');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="url"
        placeholder="https://your-domain.com/webhook"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />

      <div>
        {EVENT_TYPES.map((event) => (
          <label key={event.value}>
            <input
              type="checkbox"
              value={event.value}
              onChange={(e) => {
                if (e.target.checked) {
                  setEvents([...events, event.value]);
                } else {
                  setEvents(events.filter((ev) => ev !== event.value));
                }
              }}
            />
            {event.label}
          </label>
        ))}
      </div>

      <button type="submit">Create Webhook</button>

      {secret && (
        <div>
          <strong>Secret Key (save this!):</strong>
          <code>{secret}</code>
        </div>
      )}
    </form>
  );
}
```

### Trigger Webhook on Event

```typescript
// In your business logic
import { triggerWebhook, WEBHOOK_EVENTS } from '@/lib/integrations';

async function onCapitalCallApproved(capitalCall: any, userId: string) {
  // Trigger webhook
  await triggerWebhook({
    type: WEBHOOK_EVENTS.CAPITAL_CALL_APPROVED,
    userId,
    data: {
      id: capitalCall.id,
      fundName: capitalCall.fundName,
      amountDue: capitalCall.amountDue,
      dueDate: capitalCall.dueDate,
      approvedAt: new Date().toISOString(),
    },
  });
}
```

### Receive Webhook (Your External Server)

```javascript
// Your external webhook endpoint
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const payload = req.body.toString();
  const signature = req.headers['x-clearway-signature'];
  const eventType = req.headers['x-clearway-event'];
  const timestamp = req.headers['x-clearway-timestamp'];

  // Verify signature
  const secret = process.env.CLEARWAY_WEBHOOK_SECRET;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(payload);

  console.log('Received event:', eventType);
  console.log('Event data:', event.data);

  // Process event
  // ...

  res.status(200).send('OK');
});
```

---

## Testing Integrations

### Test Webhook Endpoint

```bash
curl -X POST https://your-domain.com/api/webhooks/marketplace/test \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookId": "webhook_xxxxx"}'
```

### Test QuickBooks Connection

```typescript
import { quickBooksService } from '@/lib/integrations';

async function testQuickBooksConnection(organizationId: string) {
  try {
    const companyInfo = await quickBooksService.getCompanyInfo(organizationId);
    console.log('✅ Connected to:', companyInfo.CompanyName);
    console.log('Address:', companyInfo.CompanyAddr);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}
```

### Test DocuSign Connection

```typescript
import { docuSignService } from '@/lib/integrations';

async function testDocuSignConnection() {
  // Send a test envelope to yourself
  try {
    const result = await docuSignService.sendForSignature({
      capitalCallId: 'test_cc_id',
      signers: [
        {
          email: 'your-email@example.com',
          name: 'Test User',
          role: 'Tester',
        },
      ],
      emailSubject: 'Test Envelope - Please Ignore',
    });

    console.log('✅ Test envelope sent:', result.envelopeId);
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}
```

---

## Error Handling

### QuickBooks Errors

```typescript
try {
  await quickBooksService.createJournalEntry({
    capitalCallId,
    organizationId,
  });
} catch (error: any) {
  if (error.message.includes('401')) {
    // Token expired or invalid
    console.error('QuickBooks authentication failed. Please reconnect.');
  } else if (error.message.includes('400')) {
    // Bad request - check account mappings
    console.error('Invalid QuickBooks configuration');
  } else if (error.message.includes('not connected')) {
    // No connection found
    console.error('QuickBooks not connected for this organization');
  } else {
    console.error('QuickBooks error:', error);
  }
}
```

### DocuSign Errors

```typescript
try {
  await docuSignService.sendForSignature(params);
} catch (error: any) {
  if (error.message.includes('access token')) {
    console.error('DocuSign authentication failed');
  } else if (error.message.includes('not found')) {
    console.error('Document not found');
  } else {
    console.error('DocuSign error:', error);
  }
}
```

### Webhook Delivery Errors

```typescript
import { webhookDeliveryService } from '@/lib/integrations';

const results = await webhookDeliveryService.triggerWebhooks(event);

results.forEach((result) => {
  if (!result.success) {
    console.error('Webhook delivery failed:', result.error);

    // Optionally retry
    if (result.deliveryId !== 'failed') {
      setTimeout(() => {
        webhookDeliveryService.retryFailedDelivery(result.deliveryId);
      }, 5000); // Retry after 5 seconds
    }
  }
});
```

---

## Best Practices

### 1. Always Check Connection Status

```typescript
import { isQuickBooksConfigured } from '@/lib/integrations/config';

if (await isQuickBooksConfigured(organizationId)) {
  // Proceed with QuickBooks operation
} else {
  // Show "Connect QuickBooks" button
}
```

### 2. Handle Token Expiration Gracefully

The QuickBooks service automatically refreshes tokens, but you should still handle errors:

```typescript
try {
  await quickBooksService.createJournalEntry(params);
} catch (error) {
  // Log error, notify user, but don't fail the main operation
  console.error('QuickBooks sync failed:', error);
  // Maybe queue for retry later
}
```

### 3. Verify Webhook Signatures

Always verify webhook signatures in production:

```typescript
import { webhookDeliveryService } from '@/lib/integrations';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('X-Clearway-Signature');

  // Get webhook and verify signature
  const webhook = await db.webhookEndpoint.findUnique({
    where: { url: req.url },
  });

  if (!webhookDeliveryService.verifySignature(payload, signature!, webhook.secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Process event
}
```

### 4. Use Background Jobs for Integrations

For long-running operations, use background jobs:

```typescript
import { inngest } from '@/lib/inngest';

// Define background function
export const syncToQuickBooks = inngest.createFunction(
  { id: 'sync-to-quickbooks' },
  { event: 'capital-call/approved' },
  async ({ event }) => {
    await quickBooksService.createJournalEntry({
      capitalCallId: event.data.capitalCallId,
      organizationId: event.data.organizationId,
    });
  }
);

// Trigger from your code
await inngest.send({
  name: 'capital-call/approved',
  data: { capitalCallId, organizationId },
});
```

### 5. Monitor Integration Health

```typescript
import { getIntegrationStatus } from '@/lib/integrations/config';

// Check daily
const integrations = await getIntegrationStatus(organizationId);

integrations.forEach((integration) => {
  if (integration.status === 'error') {
    // Send alert to admin
    sendAlert(`${integration.provider} integration is down: ${integration.message}`);
  } else if (integration.status === 'warning') {
    // Send warning
    sendWarning(`${integration.provider} token expiring soon`);
  }
});
```

---

## Troubleshooting

### QuickBooks Connection Issues

**Problem:** "QuickBooks not connected for this organization"
**Solution:** User needs to complete OAuth flow

**Problem:** "Token refresh failed"
**Solution:** User needs to reconnect QuickBooks

**Problem:** "Invalid account mapping"
**Solution:** Configure account mappings in settings

### DocuSign Issues

**Problem:** "Access token not available"
**Solution:** Set `DOCUSIGN_ACCESS_TOKEN` or implement JWT signing

**Problem:** "Failed to fetch document"
**Solution:** Check document URL is accessible

**Problem:** "Envelope creation failed"
**Solution:** Verify signer emails and document format

### Webhook Issues

**Problem:** Webhooks not triggering
**Solution:** Check webhook is enabled and events are correct

**Problem:** Deliveries failing
**Solution:** Test endpoint URL is accessible and returns 200

**Problem:** Signature verification failing
**Solution:** Ensure secret matches and payload is not modified

---

## Support

For integration issues:
1. Check environment variables
2. Review error logs
3. Test with development credentials
4. Consult API documentation:
   - [QuickBooks API Docs](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account)
   - [DocuSign API Docs](https://developers.docusign.com/docs/esign-rest-api/)

---

**Last Updated:** 2025-11-18
**Version:** 1.0.0

# Webhook Developer Guide

This guide explains how to receive real-time events from Clearway using webhooks.

## Table of Contents

1. [Overview](#overview)
2. [Available Webhook Events](#available-webhook-events)
3. [Creating Webhook Endpoints](#creating-webhook-endpoints)
4. [Webhook Payload Structure](#webhook-payload-structure)
5. [HMAC Signature Verification](#hmac-signature-verification)
6. [Retry Logic](#retry-logic)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks allow your application to receive real-time notifications when events occur in Clearway, eliminating the need for polling.

### Benefits

- **Real-time**: Receive events as they happen
- **Efficient**: No polling required
- **Scalable**: Built for high volume
- **Secure**: HMAC signature verification

### How It Works

```
Event Occurs in Clearway
    ↓
Webhook Payload Created
    ↓
HMAC Signature Generated
    ↓
POST Request to Your Endpoint
    ↓
Your Server Processes Event
    ↓
Returns 200 OK
```

---

## Available Webhook Events

Clearway supports 20+ webhook event types.

### Capital Call Events

| Event | Description | Payload |
|-------|-------------|---------|
| `capital_call.created` | New capital call created | Full capital call object |
| `capital_call.updated` | Capital call modified | Updated fields |
| `capital_call.approved` | Capital call approved | Full capital call object |
| `capital_call.rejected` | Capital call rejected | Capital call ID + reason |
| `capital_call.deleted` | Capital call deleted | Capital call ID |

### Document Events

| Event | Description | Payload |
|-------|-------------|---------|
| `document.uploaded` | Document uploaded | Document metadata |
| `document.processing` | AI processing started | Document ID |
| `document.processed` | AI processing completed | Extraction results |
| `document.failed` | Processing failed | Error details |
| `document.deleted` | Document deleted | Document ID |

### Payment Events

| Event | Description | Payload |
|-------|-------------|---------|
| `payment.received` | Payment received | Payment details |
| `payment.matched` | Payment matched to capital call | Payment + capital call IDs |
| `payment.reconciled` | Payment reconciled | Reconciliation details |
| `payment.failed` | Payment failed | Failure reason |

### Organization Events

| Event | Description | Payload |
|-------|-------------|---------|
| `organization.member.added` | Team member invited | Member details |
| `organization.member.removed` | Team member removed | Member ID |
| `organization.role.updated` | Member role changed | New role |

### Integration Events

| Event | Description | Payload |
|-------|-------------|---------|
| `integration.connected` | Integration connected | Integration type |
| `integration.disconnected` | Integration disconnected | Integration type |
| `integration.sync.completed` | Sync completed | Sync summary |
| `integration.sync.failed` | Sync failed | Error details |

### User Events

| Event | Description | Payload |
|-------|-------------|---------|
| `user.created` | New user signed up | User details |
| `user.updated` | User profile updated | Updated fields |
| `user.deleted` | User account deleted | User ID |

---

## Creating Webhook Endpoints

### Via API

```typescript
const response = await fetch('https://api.clearway.com/api/webhooks/marketplace', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_xxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhooks/clearway',
    events: [
      'capital_call.created',
      'capital_call.approved',
      'payment.received'
    ],
    enabled: true
  })
});

const { data } = await response.json();
console.log('Webhook ID:', data.id);
console.log('Secret:', data.secret); // Save this for signature verification
```

### Via Dashboard

1. Navigate to **Settings** > **Webhooks**
2. Click **"Create Webhook Endpoint"**
3. Enter your endpoint URL
4. Select events to listen to
5. Copy the webhook secret (shown only once!)

---

## Webhook Payload Structure

All webhook events follow a consistent structure:

```typescript
interface WebhookPayload {
  id: string;                    // Event ID (unique)
  type: string;                  // Event type (e.g., "capital_call.created")
  created: number;               // Unix timestamp
  livemode: boolean;             // true for production, false for test
  data: {
    object: any;                 // The actual event data
    previous_attributes?: any;   // For "updated" events
  };
  api_version: string;           // API version (e.g., "2025-01-15")
}
```

### Example: capital_call.created

```json
{
  "id": "evt_1234567890",
  "type": "capital_call.created",
  "created": 1642248000,
  "livemode": true,
  "data": {
    "object": {
      "id": "cc_xxxxxxxxxxxx",
      "fundName": "Acme Ventures Fund III",
      "investorEmail": "investor@example.com",
      "amountDue": 100000.00,
      "currency": "USD",
      "dueDate": "2025-02-15",
      "status": "PENDING_REVIEW",
      "wireInstructions": {
        "bankName": "JP Morgan Chase",
        "accountNumber": "1234567890",
        "routingNumber": "021000021",
        "wireReference": "ACME-CC-001"
      },
      "createdAt": "2025-01-15T10:00:00Z"
    }
  },
  "api_version": "2025-01-15"
}
```

### Example: capital_call.updated

```json
{
  "id": "evt_0987654321",
  "type": "capital_call.updated",
  "created": 1642251600,
  "livemode": true,
  "data": {
    "object": {
      "id": "cc_xxxxxxxxxxxx",
      "status": "APPROVED",
      "approvedAt": "2025-01-15T11:00:00Z"
    },
    "previous_attributes": {
      "status": "PENDING_REVIEW",
      "approvedAt": null
    }
  },
  "api_version": "2025-01-15"
}
```

### Example: payment.received

```json
{
  "id": "evt_1111111111",
  "type": "payment.received",
  "created": 1642255200,
  "livemode": true,
  "data": {
    "object": {
      "id": "pmt_xxxxxxxxxxxx",
      "capitalCallId": "cc_xxxxxxxxxxxx",
      "amount": 100000.00,
      "currency": "USD",
      "paidAt": "2025-01-20T14:30:00Z",
      "paymentMethod": "WIRE",
      "reference": "SWIFT-REF-12345",
      "status": "COMPLETED"
    }
  },
  "api_version": "2025-01-15"
}
```

---

## HMAC Signature Verification

All webhook requests include an HMAC-SHA256 signature for security.

### Signature Header

```
X-Clearway-Signature: t=1642248000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

**Format**: `t={timestamp},v1={signature}`

- `t`: Timestamp when signature was generated
- `v1`: HMAC-SHA256 hex digest

### Verification Steps

1. **Extract timestamp and signature** from header
2. **Construct signed payload**: `{timestamp}.{raw_body}`
3. **Compute HMAC**: Using your webhook secret
4. **Compare signatures**: Use constant-time comparison

### TypeScript Implementation

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Extract timestamp and signature
  const [tPart, v1Part] = signature.split(',');
  const timestamp = tPart.split('=')[1];
  const expectedSignature = v1Part.split('=')[1];

  // Check timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error('Timestamp too old');
  }

  // Construct signed payload
  const signedPayload = `${timestamp}.${payload}`;

  // Compute HMAC
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures (constant-time)
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(computedSignature)
  );
}

// Usage in your webhook handler
app.post('/webhooks/clearway', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-clearway-signature'];
  const payload = req.body.toString();
  const secret = process.env.CLEARWAY_WEBHOOK_SECRET;

  try {
    if (!verifyWebhookSignature(payload, signature, secret)) {
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(payload);

    // Process event
    handleWebhookEvent(event);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Bad request');
  }
});
```

### Python Implementation

```python
import hmac
import hashlib
import time

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    # Extract timestamp and signature
    parts = signature.split(',')
    timestamp = parts[0].split('=')[1]
    expected_signature = parts[1].split('=')[1]

    # Check timestamp is recent (within 5 minutes)
    now = int(time.time())
    if abs(now - int(timestamp)) > 300:
        raise ValueError('Timestamp too old')

    # Construct signed payload
    signed_payload = f"{timestamp}.{payload}"

    # Compute HMAC
    computed_signature = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # Compare signatures (constant-time)
    return hmac.compare_digest(expected_signature, computed_signature)

# Usage in Flask
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhooks/clearway', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Clearway-Signature')
    payload = request.get_data(as_text=True)
    secret = os.environ['CLEARWAY_WEBHOOK_SECRET']

    try:
        if not verify_webhook_signature(payload, signature, secret):
            return 'Invalid signature', 401

        event = request.get_json()

        # Process event
        handle_webhook_event(event)

        return 'OK', 200
    except Exception as e:
        print(f'Webhook error: {e}')
        return 'Bad request', 400
```

---

## Retry Logic

If your webhook endpoint fails, Clearway automatically retries.

### Retry Schedule

1. **Immediate retry**: 1 second after failure
2. **Second retry**: 5 seconds after first retry
3. **Third retry**: 25 seconds after second retry
4. **Fourth retry**: 125 seconds after third retry
5. **Fifth retry**: 10 minutes after fourth retry

**Total attempts**: 5 retries over ~15 minutes

### Retry Conditions

Clearway retries when:
- HTTP status code is 500-599 (server error)
- Request times out (>30 seconds)
- Connection fails

Clearway does **not** retry when:
- HTTP status code is 200-299 (success)
- HTTP status code is 400-499 (client error)

### Idempotency

Your webhook handler should be idempotent (safe to process the same event multiple times):

```typescript
async function handleWebhookEvent(event: WebhookPayload) {
  // Check if event already processed
  const existing = await db.webhookEvents.findOne({ id: event.id });
  if (existing) {
    console.log('Event already processed:', event.id);
    return; // Skip processing
  }

  // Process event
  await processEvent(event);

  // Mark as processed
  await db.webhookEvents.create({
    id: event.id,
    processedAt: new Date()
  });
}
```

---

## Best Practices

### 1. Return 200 Quickly

Process events asynchronously:

```typescript
app.post('/webhooks/clearway', async (req, res) => {
  // Verify signature
  verifySignature(req);

  // Return 200 immediately
  res.status(200).send('OK');

  // Process asynchronously
  const event = req.body;
  processEventAsync(event).catch(err => {
    console.error('Event processing failed:', err);
  });
});
```

### 2. Handle Duplicates

Events may be delivered more than once:

```typescript
const processedEvents = new Set();

function handleEvent(event: WebhookPayload) {
  if (processedEvents.has(event.id)) {
    return; // Already processed
  }

  processedEvents.add(event.id);
  // Process event...
}
```

### 3. Use a Queue

For high-volume webhooks, use a message queue:

```typescript
import { Queue } from 'bullmq';

const webhookQueue = new Queue('webhooks');

app.post('/webhooks/clearway', async (req, res) => {
  verifySignature(req);

  await webhookQueue.add('process-webhook', {
    event: req.body
  });

  res.status(200).send('OK');
});
```

### 4. Log Everything

Log all webhook events for debugging:

```typescript
function logWebhook(event: WebhookPayload, status: string) {
  console.log({
    eventId: event.id,
    eventType: event.type,
    status: status,
    timestamp: new Date().toISOString()
  });
}
```

### 5. Monitor Failures

Set up alerts for webhook failures:

```typescript
async function processEvent(event: WebhookPayload) {
  try {
    // Process event
    await handleEvent(event);
    logWebhook(event, 'SUCCESS');
  } catch (error) {
    logWebhook(event, 'FAILED');

    // Alert on repeated failures
    if (failureCount > 10) {
      await sendAlert('High webhook failure rate');
    }

    throw error;
  }
}
```

---

## Code Examples

### Express.js (TypeScript)

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

app.post('/webhooks/clearway',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-clearway-signature'] as string;
    const payload = req.body.toString();
    const secret = process.env.CLEARWAY_WEBHOOK_SECRET!;

    // Verify signature
    if (!verifyWebhookSignature(payload, signature, secret)) {
      return res.status(401).send('Invalid signature');
    }

    const event: WebhookPayload = JSON.parse(payload);

    // Handle event
    switch (event.type) {
      case 'capital_call.created':
        await handleCapitalCallCreated(event.data.object);
        break;
      case 'capital_call.approved':
        await handleCapitalCallApproved(event.data.object);
        break;
      case 'payment.received':
        await handlePaymentReceived(event.data.object);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }

    res.status(200).send('OK');
});

async function handleCapitalCallCreated(capitalCall: any) {
  console.log('New capital call:', capitalCall.id);
  // Send notification to team
  await sendSlackNotification(`New capital call: ${capitalCall.fundName}`);
}

async function handleCapitalCallApproved(capitalCall: any) {
  console.log('Capital call approved:', capitalCall.id);
  // Sync to accounting system
  await syncToQuickBooks(capitalCall);
}

async function handlePaymentReceived(payment: any) {
  console.log('Payment received:', payment.id);
  // Update internal database
  await updatePaymentStatus(payment);
}

app.listen(3000);
```

### Next.js API Route

```typescript
// app/api/webhooks/clearway/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-clearway-signature');
  const payload = await req.text();
  const secret = process.env.CLEARWAY_WEBHOOK_SECRET!;

  // Verify signature
  if (!signature || !verifyWebhookSignature(payload, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(payload);

  // Process event asynchronously
  processEventAsync(event);

  return NextResponse.json({ received: true });
}

async function processEventAsync(event: any) {
  try {
    // Handle event
    await handleEvent(event);
  } catch (error) {
    console.error('Event processing failed:', error);
  }
}
```

### Python (Flask)

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import os

app = Flask(__name__)

@app.route('/webhooks/clearway', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Clearway-Signature')
    payload = request.get_data(as_text=True)
    secret = os.environ['CLEARWAY_WEBHOOK_SECRET']

    # Verify signature
    if not verify_webhook_signature(payload, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401

    event = request.get_json()

    # Handle event
    event_type = event['type']

    if event_type == 'capital_call.created':
        handle_capital_call_created(event['data']['object'])
    elif event_type == 'payment.received':
        handle_payment_received(event['data']['object'])

    return jsonify({'received': True}), 200

def handle_capital_call_created(capital_call):
    print(f"New capital call: {capital_call['id']}")
    # Send email notification
    send_email_notification(capital_call)

def handle_payment_received(payment):
    print(f"Payment received: {payment['id']}")
    # Update database
    update_payment_status(payment)

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Troubleshooting

### Webhook Not Received

**Possible Causes**:
1. Firewall blocking incoming requests
2. Incorrect URL (check for typos)
3. HTTPS certificate issues
4. Webhook endpoint disabled

**Solutions**:
- Check firewall allows POST requests
- Verify URL is correct and accessible
- Ensure HTTPS certificate is valid
- Verify webhook is enabled in Clearway dashboard

### Signature Verification Fails

**Possible Causes**:
1. Using wrong webhook secret
2. Modifying request body before verification
3. Timestamp too old (>5 minutes)

**Solutions**:
- Verify you're using the correct secret
- Don't parse/modify body before verification
- Ensure server time is synchronized

### Events Being Skipped

**Possible Causes**:
1. Returning non-200 status code
2. Request timing out
3. Event type not handled

**Solutions**:
- Always return 200 OK
- Process events asynchronously
- Add handling for all subscribed event types

### Duplicate Events

**Expected Behavior**: Webhooks may be delivered multiple times

**Solution**: Implement idempotency (check event ID before processing)

---

## Getting Help

**Webhook Support**:
- Email: webhooks@clearway.com
- Documentation: https://docs.clearway.com/webhooks
- API Reference: https://docs.clearway.com/api

**Common Questions**:
- **Q: Can I test webhooks locally?**
  A: Yes! Use ngrok or similar tool to expose localhost. Or use Clearway's webhook testing feature.

- **Q: What's the timeout?**
  A: Webhook requests timeout after 30 seconds.

- **Q: Can I filter events?**
  A: Yes, select only the event types you need when creating the webhook endpoint.

---

**Ready to receive webhooks?** [Create your first webhook endpoint →](https://clearway.com/settings/webhooks)

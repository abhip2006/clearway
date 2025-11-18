# Payment Processing - Quick Start Guide

Get started with payment processing in 5 minutes.

## 1. Install Dependencies (Already Done ✅)

```bash
npm install plaid stripe pdf-parse tesseract.js @aws-sdk/client-kms
```

## 2. Set Environment Variables

Add to `.env`:

```env
# Plaid (get from https://dashboard.plaid.com)
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox

# Stripe (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS KMS (for encrypting bank tokens)
KMS_KEY_ID=your_kms_key_arn
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Resend (for emails)
RESEND_API_KEY=re_...
```

## 3. Run Database Migration

```bash
npm run db:migrate
npm run db:generate
```

This creates the Payment, BankAccount, StatementReconciliation, and AuditLog tables.

## 4. Basic Usage

### Parse a SWIFT Message

```typescript
import { swiftParser } from '@/lib/payment';

const rawMessage = `
MT103
:20:ABC123456789
:32A:251115USD500000.00
:50K:ORDERING CUSTOMER
:59:BENEFICIARY
:70:CAPITAL CALL PAYMENT
`;

const parsed = swiftParser.parseMessage(rawMessage);
// { messageType: 'MT103', senderReference: 'ABC123456789', ... }

const match = await swiftParser.matchToCapitalCall(parsed);
if (match.capitalCallId) {
  console.log(`Matched to: ${match.capitalCallId} (${match.confidence})`);
}
```

### Record a Payment

```typescript
import { paymentService } from '@/lib/payment';

const payment = await paymentService.recordPayment({
  capitalCallId: 'call_123',
  amount: 500000,
  currency: 'USD',
  paidAt: new Date(),
  paymentMethod: 'WIRE',
  reference: 'ABC123456789',
});

console.log(`Payment ${payment.id}: ${payment.status}`);
// Automatically sends email notification
// Automatically creates audit log
// Automatically updates capital call if completed
```

### Set Up ACH Payments

```typescript
import { plaidACHService } from '@/lib/payment';

// 1. Create Link token for user
const linkToken = await plaidACHService.createLinkToken('user_123');

// 2. User completes Plaid Link (in frontend)
// ... Plaid Link UI flow ...

// 3. Exchange public token (when Link completes)
const { accessToken, accountId } = await plaidACHService.exchangePublicToken(
  publicToken,
  'user_123'
);

// 4. Initiate payment
const result = await plaidACHService.initiateACHPayment({
  capitalCallId: 'call_123',
  userId: 'user_123',
  bankAccountId: 'bank_456',
});

console.log(`Payment ${result.paymentId}: ${result.status}`);
```

### Reconcile Bank Statement

```typescript
import { bankStatementReconciler } from '@/lib/payment';

const result = await bankStatementReconciler.reconcileStatement({
  statementPdfUrl: 'https://s3.../statement.pdf',
  bankAccountId: 'bank_123',
  startDate: new Date('2025-10-01'),
  endDate: new Date('2025-10-31'),
});

console.log(`Matched: ${result.matched}, Unmatched: ${result.unmatched}`);

result.discrepancies.forEach((d) => {
  console.log(`${d.date}: ${d.description} - ${d.reason}`);
});
```

### Check for Fraud

```typescript
import { bankStatementReconciler } from '@/lib/payment';

const fraud = await bankStatementReconciler.detectFraudIndicators('payment_123');

if (fraud.riskScore > 0.5) {
  console.warn('HIGH RISK PAYMENT');
  fraud.indicators.forEach((indicator) => {
    console.log(`- ${indicator}`);
  });
  // Trigger manual review
}
```

## 5. Create API Routes

Example Next.js API route:

```typescript
// app/api/payments/record/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payment = await paymentService.recordPayment({
      capitalCallId: body.capitalCallId,
      amount: body.amount,
      currency: body.currency,
      paidAt: new Date(body.paidAt),
      paymentMethod: body.paymentMethod,
      reference: body.reference,
    });

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

## 6. Set Up Stripe Webhooks

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { plaidACHService } from '@/lib/payment';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await plaidACHService.handleACHWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
}
```

Configure in Stripe Dashboard:
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `payment_intent.*`, `charge.refunded`

## 7. Test It

```bash
# Run unit tests
npm test tests/unit/payment

# Test with sample data
npm run db:seed  # If you have seed data
```

## 8. Monitor in Production

Key metrics to watch:
- Payment success rate
- Reconciliation match rate
- Fraud detection alerts
- ACH failure rate
- Processing times

Recommended tools:
- Datadog for metrics
- Sentry for errors
- PagerDuty for critical alerts

## Common Patterns

### Handle Payment Failures

```typescript
import { paymentService } from '@/lib/payment';

try {
  const payment = await paymentService.recordPayment({...});
} catch (error) {
  if (error.message === 'Duplicate payment detected') {
    // Handle duplicate
  } else if (error.message === 'Capital call not found') {
    // Handle missing capital call
  } else {
    // Log and alert
  }
}
```

### Get Payment Status

```typescript
const status = await paymentService.getPaymentStatus('call_123');

console.log(`Due: ${status.amountDue}`);
console.log(`Paid: ${status.totalPaid}`);
console.log(`Remaining: ${status.remaining}`);
console.log(`Status: ${status.status}`);
console.log(`Payments: ${status.payments.length}`);
```

### Manually Reconcile a Payment

```typescript
await paymentService.reconcilePayment('payment_123', {
  reconciledBy: 'admin@example.com',
  notes: 'Verified against bank statement',
  adjustedAmount: 99950, // Optional: adjust if needed
});
```

## Need Help?

1. Check the comprehensive README: `lib/payment/README.md`
2. Review test files for more examples: `tests/unit/payment/`
3. Read the full report: `PAYMENT_AGENT_REPORT.md`
4. Check inline documentation in source files

## Quick Reference

| Task | Function | File |
|------|----------|------|
| Parse SWIFT | `swiftParser.parseMessage()` | swift-parser.ts |
| Match payment | `swiftParser.matchToCapitalCall()` | swift-parser.ts |
| Record payment | `paymentService.recordPayment()` | payment-service.ts |
| Reconcile payment | `paymentService.reconcilePayment()` | payment-service.ts |
| Get status | `paymentService.getPaymentStatus()` | payment-service.ts |
| Create Link token | `plaidACHService.createLinkToken()` | plaid-ach.ts |
| Initiate ACH | `plaidACHService.initiateACHPayment()` | plaid-ach.ts |
| Handle webhook | `plaidACHService.handleACHWebhook()` | plaid-ach.ts |
| Parse statement | `bankStatementReconciler.parseStatement()` | statement-reconciliation.ts |
| Reconcile statement | `bankStatementReconciler.reconcileStatement()` | statement-reconciliation.ts |
| Check fraud | `bankStatementReconciler.detectFraudIndicators()` | statement-reconciliation.ts |

---

**Ready to Process Payments!** 🚀

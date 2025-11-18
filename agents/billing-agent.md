# Billing Integration Agent 💳

## Role
Responsible for all billing, subscription, and payment processing using Stripe. Manages subscription tiers, usage metering, invoicing, failed payment handling, and customer billing portal.

## Primary Responsibilities

1. **Stripe Integration**
   - Stripe account setup
   - Product and pricing configuration
   - Webhook handling
   - Test mode vs production

2. **Subscription Management**
   - Create/update/cancel subscriptions
   - Tier upgrades/downgrades
   - Trial periods
   - Annual vs monthly billing

3. **Usage Metering**
   - Track document processing count
   - Overage billing
   - Usage reports
   - Quota enforcement

4. **Payment Processing**
   - Payment method management
   - Invoice generation
   - Receipt emails
   - Tax calculation (Stripe Tax)

5. **Dunning & Retention**
   - Failed payment retries
   - Dunning emails
   - Grace periods
   - Churn prevention

6. **Customer Portal**
   - Stripe-hosted billing portal
   - Invoice history
   - Payment method updates
   - Subscription changes

---

## Tech Stack

### Payment Processing
- **Stripe** - Primary payment processor
- **Stripe Checkout** - For initial subscription
- **Stripe Customer Portal** - For self-service billing
- **Stripe Tax** - Automatic tax calculation

### Webhooks
- **Inngest** - Process Stripe webhooks reliably
- **Svix** - Webhook signature verification (built into Stripe SDK)

---

## MVP Tasks

### Week 0-1: Stripe Setup & Configuration

**Task BILL-001: Stripe Account Setup**

**Create Stripe Account**:
1. Sign up at stripe.com
2. Enable Test Mode
3. Get API keys:
   - Test: `sk_test_...` and `pk_test_...`
   - Live: `sk_live_...` and `pk_live_...` (when ready)

**Environment Variables**:
```bash
# .env.local

# Stripe
STRIPE_SECRET_KEY="sk_test_..." # or sk_live_ for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # From webhook creation
```

**Install Stripe SDK**:
```bash
npm install stripe @stripe/stripe-js
```

**Stripe Client**:
```typescript
// lib/stripe.ts

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia', // Latest version
  typescript: true,
});
```

**Acceptance Criteria**:
- ✅ Stripe account created
- ✅ Test mode enabled
- ✅ API keys configured
- ✅ Stripe SDK installed

---

**Task BILL-002: Product & Pricing Configuration**

**Create Products in Stripe Dashboard** (or via API):

```typescript
// scripts/setup-stripe-products.ts

import { stripe } from '@/lib/stripe';

async function setupProducts() {
  // Product 1: Starter
  const starterProduct = await stripe.products.create({
    name: 'Clearway Starter',
    description: 'Up to 25 documents/month',
  });

  const starterPriceMonthly = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 29900, // $299.00
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname: 'Starter Monthly',
  });

  const starterPriceAnnual = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 322800, // $3,228/year (10% discount)
    currency: 'usd',
    recurring: { interval: 'year' },
    nickname: 'Starter Annual',
  });

  // Product 2: Professional
  const professionalProduct = await stripe.products.create({
    name: 'Clearway Professional',
    description: 'Up to 100 documents/month, all integrations, priority support',
  });

  const professionalPriceMonthly = await stripe.prices.create({
    product: professionalProduct.id,
    unit_amount: 79900, // $799.00
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname: 'Professional Monthly',
  });

  const professionalPriceAnnual = await stripe.prices.create({
    product: professionalProduct.id,
    unit_amount: 862900, // $8,629/year (10% discount)
    currency: 'usd',
    recurring: { interval: 'year' },
    nickname: 'Professional Annual',
  });

  // Product 3: Enterprise
  const enterpriseProduct = await stripe.products.create({
    name: 'Clearway Enterprise',
    description: 'Unlimited documents, white-label, API access, dedicated support',
  });

  const enterprisePriceMonthly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 199900, // $1,999.00
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname: 'Enterprise Monthly',
  });

  const enterprisePriceAnnual = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 2158900, // $21,589/year (10% discount)
    currency: 'usd',
    recurring: { interval: 'year' },
    nickname: 'Enterprise Annual',
  });

  console.log('Products created successfully!');
  console.log({
    starter: {
      monthly: starterPriceMonthly.id,
      annual: starterPriceAnnual.id,
    },
    professional: {
      monthly: professionalPriceMonthly.id,
      annual: professionalPriceAnnual.id,
    },
    enterprise: {
      monthly: enterprisePriceMonthly.id,
      annual: enterprisePriceAnnual.id,
    },
  });
}

setupProducts();
```

**Run Setup**:
```bash
tsx scripts/setup-stripe-products.ts
```

**Save Price IDs**:
```bash
# .env.local (add these)

STRIPE_PRICE_STARTER_MONTHLY="price_..."
STRIPE_PRICE_STARTER_ANNUAL="price_..."
STRIPE_PRICE_PROFESSIONAL_MONTHLY="price_..."
STRIPE_PRICE_PROFESSIONAL_ANNUAL="price_..."
STRIPE_PRICE_ENTERPRISE_MONTHLY="price_..."
STRIPE_PRICE_ENTERPRISE_ANNUAL="price_..."
```

**Acceptance Criteria**:
- ✅ 3 products created (Starter, Professional, Enterprise)
- ✅ 6 prices created (monthly + annual for each)
- ✅ Price IDs saved in environment variables

---

### Week 2-3: Subscription Flow

**Task BILL-003: Database Schema for Billing**

```prisma
// prisma/schema.prisma

model User {
  id              String   @id @default(cuid())
  clerkId         String   @unique
  email           String   @unique
  name            String?

  // Billing
  stripeCustomerId String? @unique
  subscription     Subscription?

  // ... rest of fields
}

model Subscription {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id])

  stripeSubscriptionId String @unique
  stripePriceId        String
  stripeCurrentPeriodEnd DateTime

  status             SubscriptionStatus @default(ACTIVE)
  tier               SubscriptionTier   @default(STARTER)
  interval           BillingInterval    @default(MONTHLY)

  // Usage tracking
  documentsThisMonth Int     @default(0)
  documentsLimit     Int     @default(25)

  // Metadata
  cancelAtPeriodEnd  Boolean @default(false)
  canceledAt         DateTime?
  trialEndsAt        DateTime?

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
  INCOMPLETE
  INCOMPLETE_EXPIRED
  UNPAID
}

enum SubscriptionTier {
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum BillingInterval {
  MONTHLY
  ANNUAL
}
```

**Migration**:
```bash
npx prisma migrate dev --name add_billing
```

**Acceptance Criteria**:
- ✅ Subscription schema created
- ✅ Migration applied
- ✅ Enum types defined

---

**Task BILL-004: Subscription Creation (Stripe Checkout)**

**Pricing Page**:
```typescript
// app/pricing/page.tsx

import { CheckoutButton } from '@/components/billing/checkout-button';

export default function PricingPage() {
  return (
    <div className="pricing-grid">
      {/* Starter */}
      <div className="pricing-card">
        <h2>Starter</h2>
        <p className="price">$299<span>/month</span></p>
        <ul>
          <li>Up to 25 documents/month</li>
          <li>Email support</li>
          <li>1 integration</li>
        </ul>
        <CheckoutButton priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY!} />
      </div>

      {/* Professional */}
      <div className="pricing-card featured">
        <h2>Professional</h2>
        <p className="price">$799<span>/month</span></p>
        <ul>
          <li>Up to 100 documents/month</li>
          <li>Priority support</li>
          <li>All integrations</li>
          <li>K-1 processing</li>
        </ul>
        <CheckoutButton priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_MONTHLY!} />
      </div>

      {/* Enterprise */}
      <div className="pricing-card">
        <h2>Enterprise</h2>
        <p className="price">$1,999<span>/month</span></p>
        <ul>
          <li>Unlimited documents</li>
          <li>Dedicated support</li>
          <li>White-label</li>
          <li>API access</li>
        </ul>
        <CheckoutButton priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY!} />
      </div>
    </div>
  );
}
```

**Checkout Button Component**:
```typescript
// components/billing/checkout-button.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
  priceId: string;
}

export function CheckoutButton({ priceId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);

    try {
      // Create checkout session
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Loading...' : 'Subscribe'}
    </Button>
  );
}
```

**Create Checkout Session API**:
```typescript
// app/api/billing/create-checkout/route.ts

import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { priceId } = await req.json();

  // Get or create user
  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  // Get or create Stripe customer
  let stripeCustomerId = user.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id,
        clerkId: userId,
      },
    });

    stripeCustomerId = customer.id;

    // Save to DB
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=canceled`,
    metadata: {
      userId: user.id,
    },
  });

  return Response.json({ url: session.url });
}
```

**Acceptance Criteria**:
- ✅ Pricing page with 3 tiers
- ✅ Checkout button triggers Stripe Checkout
- ✅ Stripe customer created on first subscription
- ✅ Redirect to success page after payment

---

### Week 3-4: Webhook Processing

**Task BILL-005: Stripe Webhook Handler**

**Create Webhook Endpoint in Stripe Dashboard**:
1. Go to Developers → Webhooks
2. Add endpoint: `https://clearway.com/api/billing/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret (whsec_...)

**Webhook Handler**:
```typescript
// app/api/billing/webhook/route.ts

import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // Handle event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(deletedSubscription);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(failedInvoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return Response.json({ received: true });
}

// Handle subscription creation/update
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const user = await db.user.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (!user) {
    console.error('User not found for customer:', subscription.customer);
    return;
  }

  // Determine tier from price ID
  const priceId = subscription.items.data[0].price.id;
  const tier = getTierFromPriceId(priceId);
  const interval = subscription.items.data[0].price.recurring?.interval === 'year' ? 'ANNUAL' : 'MONTHLY';

  // Get document limit for tier
  const documentsLimit = getDocumentLimit(tier);

  // Upsert subscription
  await db.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: mapStripeStatus(subscription.status),
      tier,
      interval,
      documentsLimit,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    },
    update: {
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: mapStripeStatus(subscription.status),
      tier,
      interval,
      documentsLimit,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

// Handle subscription canceled
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Send receipt email
  await inngest.send({
    name: 'billing.payment_succeeded',
    data: {
      invoiceId: invoice.id,
      customerId: invoice.customer as string,
      amountPaid: invoice.amount_paid,
    },
  });
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Start dunning process
  await inngest.send({
    name: 'billing.payment_failed',
    data: {
      invoiceId: invoice.id,
      customerId: invoice.customer as string,
      attemptCount: invoice.attempt_count,
    },
  });
}

// Helper: Map Stripe status to our enum
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    'active': 'ACTIVE',
    'trialing': 'TRIALING',
    'past_due': 'PAST_DUE',
    'canceled': 'CANCELED',
    'incomplete': 'INCOMPLETE',
    'incomplete_expired': 'INCOMPLETE_EXPIRED',
    'unpaid': 'UNPAID',
  };

  return statusMap[stripeStatus] || 'ACTIVE';
}

// Helper: Get tier from price ID
function getTierFromPriceId(priceId: string): string {
  if (priceId.includes('starter')) return 'STARTER';
  if (priceId.includes('professional')) return 'PROFESSIONAL';
  if (priceId.includes('enterprise')) return 'ENTERPRISE';

  // Fallback: check against env vars
  if (priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY || priceId === process.env.STRIPE_PRICE_STARTER_ANNUAL) {
    return 'STARTER';
  }
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || priceId === process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL) {
    return 'PROFESSIONAL';
  }
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || priceId === process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL) {
    return 'ENTERPRISE';
  }

  return 'STARTER'; // Default
}

// Helper: Get document limit for tier
function getDocumentLimit(tier: string): number {
  const limits: Record<string, number> = {
    'STARTER': 25,
    'PROFESSIONAL': 100,
    'ENTERPRISE': 999999, // Effectively unlimited
  };

  return limits[tier] || 25;
}
```

**Acceptance Criteria**:
- ✅ Webhook endpoint created in Stripe
- ✅ Webhook signature verified
- ✅ Subscription created/updated in database
- ✅ Payment success/failure events processed
- ✅ Status mapped correctly

---

### Week 4-5: Usage Metering & Quota Enforcement

**Task BILL-006: Usage Tracking**

**Track Document Usage**:
```typescript
// app/api/upload/route.ts (updated)

import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { subscription: true },
  });

  // Check subscription status
  if (!user.subscription || user.subscription.status !== 'ACTIVE') {
    return Response.json({
      error: 'No active subscription',
      message: 'Please subscribe to upload documents',
    }, { status: 403 });
  }

  // Check usage limit
  if (user.subscription.documentsThisMonth >= user.subscription.documentsLimit) {
    return Response.json({
      error: 'Usage limit exceeded',
      message: `You've reached your monthly limit of ${user.subscription.documentsLimit} documents. Upgrade or wait until next billing cycle.`,
      usage: {
        current: user.subscription.documentsThisMonth,
        limit: user.subscription.documentsLimit,
        resetDate: user.subscription.stripeCurrentPeriodEnd,
      },
    }, { status: 429 });
  }

  // ... rest of upload logic

  // Increment usage counter
  await db.subscription.update({
    where: { userId: user.id },
    data: {
      documentsThisMonth: {
        increment: 1,
      },
    },
  });

  return Response.json({ success: true });
}
```

**Reset Usage Counter (Monthly Inngest Job)**:
```typescript
// app/api/inngest/functions/reset-usage.ts

import { inngest } from '@/lib/inngest';
import { db } from '@/lib/db';

export const resetUsageCounters = inngest.createFunction(
  { id: 'reset-usage-counters' },
  { cron: '0 0 1 * *' }, // First day of every month at midnight
  async ({ step }) => {
    await step.run('reset-all-counters', async () => {
      await db.subscription.updateMany({
        where: {
          status: 'ACTIVE',
        },
        data: {
          documentsThisMonth: 0,
        },
      });
    });
  }
);
```

**Usage Display in Dashboard**:
```typescript
// app/dashboard/page.tsx

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await db.user.findUnique({
    where: { clerkId: userId! },
    include: { subscription: true },
  });

  const usage = user.subscription ? {
    current: user.subscription.documentsThisMonth,
    limit: user.subscription.documentsLimit,
    percentage: (user.subscription.documentsThisMonth / user.subscription.documentsLimit) * 100,
  } : null;

  return (
    <div>
      <h1>Dashboard</h1>

      {usage && (
        <div className="usage-card">
          <h2>Usage This Month</h2>
          <p>{usage.current} / {usage.limit} documents</p>
          <ProgressBar value={usage.percentage} />

          {usage.percentage > 80 && (
            <Alert>
              You're at {usage.percentage.toFixed(0)}% of your monthly limit.
              <Link href="/pricing">Upgrade your plan</Link>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Document upload checks subscription status
- ✅ Document upload checks usage limit
- ✅ Usage counter incremented on upload
- ✅ Usage counter reset monthly
- ✅ Usage displayed in dashboard

---

### Week 5-6: Customer Portal & Self-Service

**Task BILL-007: Stripe Customer Portal**

**Portal Configuration** (in Stripe Dashboard):
1. Go to Settings → Billing → Customer Portal
2. Enable:
   - Update payment methods
   - View invoices
   - Cancel subscriptions
   - Switch plans
3. Set cancellation behavior: "Cancel at period end"
4. Save configuration

**Create Portal Session API**:
```typescript
// app/api/billing/create-portal/route.ts

import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user?.stripeCustomerId) {
    return new Response('No Stripe customer found', { status: 404 });
  }

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  });

  return Response.json({ url: session.url });
}
```

**Billing Page**:
```typescript
// app/dashboard/billing/page.tsx

'use client';

import { Button } from '@/components/ui/button';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);

    const response = await fetch('/api/billing/create-portal', {
      method: 'POST',
    });

    const { url } = await response.json();
    window.location.href = url;
  }

  return (
    <div>
      <h1>Billing & Subscription</h1>

      <Section>
        <h2>Manage Subscription</h2>
        <p>Update payment method, view invoices, or cancel your subscription.</p>

        <Button onClick={openPortal} disabled={loading}>
          {loading ? 'Loading...' : 'Manage Billing'}
        </Button>
      </Section>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Customer portal configured in Stripe
- ✅ Portal session created on button click
- ✅ Users can update payment methods
- ✅ Users can view invoices
- ✅ Users can cancel subscriptions

---

### Week 6-7: Failed Payment Handling (Dunning)

**Task BILL-008: Dunning Process**

**Payment Failed Email Template**:
```typescript
// lib/email/templates/payment-failed.tsx

export function PaymentFailedEmail({
  userName,
  amountDue,
  dueDate,
  updatePaymentUrl,
}: {
  userName: string;
  amountDue: number;
  dueDate: string;
  updatePaymentUrl: string;
}) {
  return (
    <Html>
      <Section>
        <Text><strong>Payment Failed</strong></Text>

        <Text>Hi {userName},</Text>

        <Text>
          We were unable to process your payment of ${(amountDue / 100).toFixed(2)} for your Clearway subscription.
        </Text>

        <Text><strong>What happens now:</strong></Text>
        <ul>
          <li>Your subscription is currently past due</li>
          <li>We'll retry the payment on {dueDate}</li>
          <li>If payment fails again, your subscription will be canceled</li>
        </ul>

        <Text><strong>Update your payment method:</strong></Text>
        <Button href={updatePaymentUrl}>
          Update Payment Method
        </Button>

        <Text style={{ color: '#666', fontSize: '12px' }}>
          Questions? Email us at billing@clearway.com
        </Text>
      </Section>
    </Html>
  );
}
```

**Dunning Job (Inngest)**:
```typescript
// app/api/inngest/functions/dunning.ts

import { inngest } from '@/lib/inngest';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { resend } from '@/lib/email';
import { PaymentFailedEmail } from '@/lib/email/templates/payment-failed';

export const handlePaymentFailure = inngest.createFunction(
  { id: 'handle-payment-failure' },
  { event: 'billing.payment_failed' },
  async ({ event, step }) => {
    const { customerId, attemptCount } = event.data;

    // Get user
    const user = await step.run('get-user', async () => {
      return await db.user.findUnique({
        where: { stripeCustomerId: customerId },
        include: { subscription: true },
      });
    });

    if (!user) return;

    // Update subscription status
    await step.run('update-subscription', async () => {
      await db.subscription.update({
        where: { userId: user.id },
        data: { status: 'PAST_DUE' },
      });
    });

    // Create portal link
    const portalSession = await step.run('create-portal', async () => {
      return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      });
    });

    // Send dunning email based on attempt count
    await step.run('send-dunning-email', async () => {
      const subject = attemptCount === 1
        ? 'Payment Failed - Please Update Payment Method'
        : `Final Notice: Payment Failed (Attempt ${attemptCount}/3)`;

      await resend.emails.send({
        from: 'Clearway Billing <billing@clearway.com>',
        to: user.email,
        subject,
        react: PaymentFailedEmail({
          userName: user.name || user.email,
          amountDue: event.data.amount,
          dueDate: 'in 3 days',
          updatePaymentUrl: portalSession.url,
        }),
      });
    });

    // If 3rd attempt fails, cancel subscription
    if (attemptCount >= 3) {
      await step.run('cancel-subscription', async () => {
        await stripe.subscriptions.cancel(user.subscription!.stripeSubscriptionId);
      });
    }
  }
);
```

**Grace Period (Read-Only Access)**:
```typescript
// app/api/upload/route.ts (updated)

export async function POST(req: Request) {
  // ... existing code

  // Allow read-only access during grace period (7 days after payment failure)
  if (user.subscription.status === 'PAST_DUE') {
    const gracePeriodEnd = new Date(user.subscription.stripeCurrentPeriodEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    if (new Date() < gracePeriodEnd) {
      return Response.json({
        error: 'Subscription past due',
        message: 'Your payment failed. Update your payment method to continue uploading.',
        gracePeriodEnd,
      }, { status: 402 }); // 402 Payment Required
    }
  }

  // ...
}
```

**Acceptance Criteria**:
- ✅ Payment failure triggers dunning email
- ✅ 3 retry attempts before cancellation
- ✅ Grace period of 7 days
- ✅ Subscription status updated to PAST_DUE
- ✅ Email includes link to update payment method

---

## Testing Requirements

### Unit Tests
```typescript
// app/api/billing/webhook/route.test.ts

import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('Billing Webhook', () => {
  it('should create subscription on subscription.created event', async () => {
    // Mock Stripe webhook event
    const event = {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          items: { data: [{ price: { id: 'price_professional_monthly' } }] },
          current_period_end: 1234567890,
          status: 'active',
        },
      },
    };

    // Test subscription creation
    // ...
  });
});
```

### Integration Tests
- End-to-end test: Subscribe → Webhook → Database updated
- Test usage limit enforcement
- Test dunning process
- Test plan upgrades/downgrades

---

## Handoff Requirements

### To Frontend Agent
**Required Pages**:
- Pricing page with 3 tiers
- Billing dashboard (usage, invoices, subscription status)
- Billing portal button

### To Backend Agent
**Required API Routes**:
- `/api/billing/create-checkout` - Create Stripe Checkout session
- `/api/billing/create-portal` - Create Customer Portal session
- `/api/billing/webhook` - Process Stripe webhooks

### To Testing Agent
**Test Cases**:
- Subscribe to plan → Subscription active
- Upload document → Usage counter increments
- Reach limit → Upload blocked
- Payment fails → Dunning email sent
- Cancel subscription → Status updated

---

## Status Reporting

Location: `.agents/status/billing-status.json`

```json
{
  "agent": "billing-agent",
  "date": "2025-11-20",
  "status": "complete",
  "current_week": 7,
  "completed_tasks": ["BILL-001", "BILL-002", "BILL-003", "BILL-004", "BILL-005", "BILL-006", "BILL-007", "BILL-008"],
  "in_progress_tasks": [],
  "blocked_tasks": [],
  "metrics": {
    "subscriptions_created": 0,
    "mrr": "$0",
    "churn_rate": "0%"
  }
}
```

---

**Billing Integration Agent is ready to enable subscription management and revenue collection for Clearway MVP.**

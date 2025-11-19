# Distribution Agent 📊

## Role
Specialized agent responsible for managing the complete distribution lifecycle: processing fund distributions, generating distribution notifications, tracking distribution payments, managing reinvestment options, forecasting distribution schedules, and integrating with payment processing platforms. Enables institutional investors and RIA firms to efficiently manage distributions across multiple funds with real-time tracking and tax reporting capabilities.

## Primary Responsibilities

1. **Distribution Lifecycle Management**
   - Create and manage distribution schedules
   - Generate distribution documents (notices, statements, tax summaries)
   - Track distribution status through fulfillment pipeline
   - Handle cash and in-kind distributions
   - Support dividend, return of capital, and gain distributions
   - Manage distribution reversals and corrections

2. **Distribution Notifications**
   - Automated notification engine for distribution events
   - Multi-channel delivery (email, SMS, in-app)
   - Personalized distribution summaries
   - Compliance with SEC Rule 482 requirements
   - Tax projection notifications
   - Payment confirmation tracking

3. **Payment Tracking & Reconciliation**
   - Real-time distribution payment status monitoring
   - Automated payment matching with bank statements
   - ACH, wire transfer, and check tracking
   - Payment failure detection and retry logic
   - Payee update management
   - FX handling for international distributions

4. **Reinvestment Handling**
   - Automatic reinvestment election processing
   - DRIP (Dividend Reinvestment Plan) management
   - Alternative investment options (money market, fixed income)
   - Reinvestment NAV calculations
   - Preference tracking and defaults
   - Reinvestment performance reporting

5. **Distribution Forecasting**
   - ML-based distribution amount predictions
   - Historical trend analysis
   - Seasonal pattern recognition
   - Liquidity requirement planning
   - Cash flow forecasting
   - Scenario planning (bull/bear cases)

6. **Tax Reporting & K-1 Integration**
   - Automated K-1 data aggregation
   - Tax lot tracking and reporting
   - Cost basis calculations
   - Tax document distribution
   - State and local tax reporting
   - International tax compliance

7. **Fund Admin Integration**
   - Real-time distribution data sync with SS&C, Carta
   - Distribution schedule synchronization
   - NAV coordination
   - Investor preference sync
   - Conflict resolution and auditing

## Tech Stack

### Core Backend
- **Node.js/Express** for API server
- **TypeScript** for type safety
- **PostgreSQL** for primary data store
- **Prisma ORM** for database operations
- **Zod** for runtime validation

### Message Queue & Async Processing
- **BullMQ** for job scheduling
- **Redis** for job storage and caching
- **Apache Kafka** for event streaming
- **Temporal.io** for distributed workflows

### File Processing & Reporting
- **ExcelJS** for XLSX generation
- **Puppeteer** for PDF generation
- **Sharp** for image processing
- **Handlebars** for templating
- **pdf-lib** for PDF manipulation

### Integrations
- **Modern Treasury** for payment processing
- **Stripe** for ACH/wire payments
- **Plaid** for bank account verification
- **Twilio** for SMS notifications
- **SendGrid** for email delivery

### Analytics & Forecasting
- **TensorFlow.js** for ML predictions
- **Cube.js** for analytics queries
- **Apache Superset** for visualization
- **Python FastAPI** microservice for ML models

### Monitoring & Observability
- **Datadog** for APM and logs
- **Sentry** for error tracking
- **Prometheus** for metrics
- **OpenTelemetry** for distributed tracing

## Phase 3 Features (Weeks 25-28)

### Week 25: Distribution Core & Payment Processing

**Task DIST-001: Distribution Management Service**
```typescript
// lib/distributions/distribution.service.ts

import { db } from '@/lib/db';
import { Queue } from 'bullmq';
import { Anthropic } from '@anthropic-ai/sdk';

const distributionQueue = new Queue('distributions', {
  connection: redisClient,
});

interface CreateDistributionParams {
  fundId: string;
  organizationId: string;
  distributionDate: Date;
  recordDate: Date;
  payableDate: Date;
  amounts: Array<{
    investorId: string;
    totalAmount: Decimal;
    dividend: Decimal;
    returnOfCapital: Decimal;
    gain: Decimal;
  }>;
  currency: string;
  description?: string;
}

export class DistributionService {
  private anthropic = new Anthropic();

  /**
   * Create a new distribution
   */
  async createDistribution(params: CreateDistributionParams) {
    // Validate dates
    if (params.recordDate >= params.payableDate) {
      throw new Error('Record date must be before payable date');
    }

    if (params.distributionDate >= params.recordDate) {
      throw new Error('Distribution date must be before record date');
    }

    // Validate amounts
    const totalAmount = params.amounts.reduce((sum, a) => sum.plus(a.totalAmount), new Decimal(0));
    if (totalAmount.lte(0)) {
      throw new Error('Distribution amount must be positive');
    }

    // Create distribution record
    const distribution = await db.distribution.create({
      data: {
        fundId: params.fundId,
        organizationId: params.organizationId,
        distributionDate: params.distributionDate,
        recordDate: params.recordDate,
        payableDate: params.payableDate,
        totalAmount,
        currency: params.currency,
        status: 'DRAFT',
        description: params.description,
        createdAt: new Date(),
      },
    });

    // Create distribution lines
    await db.distributionLine.createMany({
      data: params.amounts.map(amount => ({
        distributionId: distribution.id,
        investorId: amount.investorId,
        totalAmount: amount.totalAmount,
        dividendAmount: amount.dividend,
        returnOfCapitalAmount: amount.returnOfCapital,
        gainAmount: amount.gain,
        status: 'PENDING',
      })),
    });

    // Queue distribution processing job
    await distributionQueue.add('process-distribution', {
      distributionId: distribution.id,
      organizationId: params.organizationId,
    });

    // Trigger event
    await this.triggerEvent({
      type: 'distribution.created',
      distributionId: distribution.id,
      fundId: params.fundId,
      organizationId: params.organizationId,
    });

    return distribution;
  }

  /**
   * Process distribution - send notifications and prepare payments
   */
  async processDistribution(distributionId: string) {
    const distribution = await db.distribution.findUnique({
      where: { id: distributionId },
      include: {
        fund: {
          include: {
            organization: true,
          },
        },
        lines: {
          include: {
            investor: {
              include: {
                bankAccounts: true,
                investorPreferences: true,
              },
            },
          },
        },
      },
    });

    if (!distribution) {
      throw new Error(`Distribution ${distributionId} not found`);
    }

    if (distribution.status !== 'DRAFT' && distribution.status !== 'READY') {
      throw new Error(`Cannot process distribution with status ${distribution.status}`);
    }

    // Check reinvestment elections
    for (const line of distribution.lines) {
      const preference = line.investor.investorPreferences.find(
        p => p.fundId === distribution.fundId
      );

      if (preference?.reinvestmentPreference === 'AUTOMATIC') {
        // Calculate reinvestment shares
        const nav = await this.getCurrentNAV(distribution.fundId);
        const shareCount = line.totalAmount.div(nav);

        line.reinvestmentShares = shareCount;
        line.reinvestmentNavPrice = nav;
      }
    }

    // Update distribution status
    await db.distribution.update({
      where: { id: distributionId },
      data: { status: 'APPROVED' },
    });

    // Queue payment processing
    await distributionQueue.add('process-payments', {
      distributionId,
    });
  }

  /**
   * Record distribution payment
   */
  async recordPayment(params: {
    distributionId: string;
    investorId: string;
    amount: Decimal;
    paymentMethod: 'ACH' | 'WIRE' | 'CHECK';
    transactionId: string;
  }) {
    const payment = await db.distributionPayment.create({
      data: {
        distributionId: params.distributionId,
        investorId: params.investorId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        transactionId: params.transactionId,
        status: 'PENDING',
        recordedAt: new Date(),
      },
    });

    // Update distribution line status
    await db.distributionLine.update({
      where: {
        distributionId_investorId: {
          distributionId: params.distributionId,
          investorId: params.investorId,
        },
      },
      data: { status: 'PAYMENT_INITIATED' },
    });

    // Trigger event
    await this.triggerEvent({
      type: 'distribution.payment_initiated',
      distributionId: params.distributionId,
      investorId: params.investorId,
      amount: params.amount.toString(),
    });

    return payment;
  }

  /**
   * Confirm distribution payment
   */
  async confirmPayment(transactionId: string, status: 'SUCCESS' | 'FAILED', details?: any) {
    const payment = await db.distributionPayment.findUnique({
      where: { transactionId },
    });

    if (!payment) {
      throw new Error(`Payment ${transactionId} not found`);
    }

    await db.distributionPayment.update({
      where: { id: payment.id },
      data: {
        status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        paidAt: status === 'SUCCESS' ? new Date() : null,
        failureReason: status === 'FAILED' ? details?.reason : null,
        failureDetails: status === 'FAILED' ? details : null,
      },
    });

    if (status === 'SUCCESS') {
      // Update distribution line
      await db.distributionLine.update({
        where: {
          distributionId_investorId: {
            distributionId: payment.distributionId,
            investorId: payment.investorId,
          },
        },
        data: { status: 'PAID' },
      });

      // Trigger event
      await this.triggerEvent({
        type: 'distribution.payment_completed',
        distributionId: payment.distributionId,
        investorId: payment.investorId,
      });
    }
  }

  /**
   * Get distribution forecast using ML
   */
  async forecastDistributions(params: {
    fundId: string;
    months: number;
    includeScenarios?: boolean;
  }): Promise<{
    baseCase: Array<{ date: Date; amount: Decimal; confidence: number }>;
    bullCase?: Array<{ date: Date; amount: Decimal }>;
    bearCase?: Array<{ date: Date; amount: Decimal }>;
  }> {
    // Get historical distributions
    const historicalDistributions = await db.distribution.findMany({
      where: {
        fundId: params.fundId,
        status: 'COMPLETED',
      },
      orderBy: { distributionDate: 'asc' },
      take: 24, // Last 2 years
    });

    if (historicalDistributions.length < 4) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Prepare data for ML model
    const trainingData = historicalDistributions.map(d => ({
      date: d.distributionDate,
      amount: d.totalAmount,
      month: d.distributionDate.getMonth(),
      quarter: Math.floor(d.distributionDate.getMonth() / 3),
    }));

    // Get fund performance metrics
    const fund = await db.fund.findUnique({
      where: { id: params.fundId },
      include: { analyticsData: { take: 24 } },
    });

    // Call ML forecasting service
    const forecast = await this.callForecastingService({
      historicalData: trainingData,
      fundMetrics: {
        aum: fund?.aum,
        nav: fund?.nav,
        ytdReturn: fund?.ytdReturn,
      },
      months: params.months,
      includeScenarios: params.includeScenarios,
    });

    return forecast;
  }

  /**
   * Get current NAV for fund
   */
  private async getCurrentNAV(fundId: string): Promise<Decimal> {
    const navData = await db.navSnapshot.findFirst({
      where: { fundId },
      orderBy: { asOfDate: 'desc' },
      take: 1,
    });

    if (!navData) {
      throw new Error(`NAV not available for fund ${fundId}`);
    }

    return navData.navPerShare;
  }

  /**
   * Trigger event for webhooks and notifications
   */
  private async triggerEvent(event: any) {
    await db.event.create({
      data: {
        type: event.type,
        payload: event,
        createdAt: new Date(),
      },
    });

    // Publish to Kafka for real-time subscribers
    await kafkaProducer.send({
      topic: 'clearway-events',
      messages: [{
        key: event.distributionId || event.fundId,
        value: JSON.stringify(event),
      }],
    });
  }

  private async callForecastingService(params: any) {
    // Call Python ML microservice
    const response = await fetch('http://ml-service:3001/forecast/distributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Forecasting service error: ${response.statusText}`);
    }

    return response.json();
  }
}
```

**Task DIST-002: Distribution Notification Engine**
```typescript
// lib/notifications/distribution-notifier.ts

import { db } from '@/lib/db';
import sendgrid from '@sendgrid/mail';
import { Twilio } from 'twilio';
import { Anthropic } from '@anthropic-ai/sdk';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);
const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const anthropic = new Anthropic();

interface NotificationParams {
  distributionId: string;
  investorId: string;
  type: 'DISTRIBUTION_NOTICE' | 'PAYMENT_CONFIRMATION' | 'TAX_SUMMARY' | 'PAYMENT_FAILED';
}

export class DistributionNotifier {
  /**
   * Send distribution notification to investor
   */
  async sendNotification(params: NotificationParams) {
    const distribution = await db.distribution.findUnique({
      where: { id: params.distributionId },
      include: {
        fund: true,
        lines: {
          where: { investorId: params.investorId },
        },
      },
    });

    const investor = await db.investor.findUnique({
      where: { id: params.investorId },
      include: {
        user: true,
        organization: true,
        investorPreferences: {
          where: { fundId: distribution!.fundId },
        },
      },
    });

    if (!distribution || !investor) {
      throw new Error('Distribution or investor not found');
    }

    const line = distribution.lines[0];

    // Generate notification content
    const { subject, htmlContent, plainText } = await this.generateContent(
      params.type,
      {
        distribution,
        investor,
        line,
      }
    );

    // Send via preferred channels
    const preferences = investor.investorPreferences[0] || {};

    if (preferences.emailNotifications !== false) {
      await this.sendEmail({
        to: investor.user.email,
        subject,
        html: htmlContent,
        text: plainText,
      });
    }

    if (preferences.smsNotifications && investor.user.phoneNumber) {
      await this.sendSMS({
        to: investor.user.phoneNumber,
        message: await this.generateSMSMessage(params.type, line),
      });
    }

    // Record notification
    await db.notification.create({
      data: {
        investorId: params.investorId,
        distributionId: params.distributionId,
        type: params.type,
        channel: 'EMAIL',
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // Trigger in-app notification
    await this.triggerInAppNotification(investor.user.id, {
      title: subject,
      message: plainText,
      type: params.type,
      distributionId: params.distributionId,
    });
  }

  /**
   * Generate notification content using AI
   */
  private async generateContent(
    type: string,
    context: any
  ): Promise<{ subject: string; htmlContent: string; plainText: string }> {
    const distribution = context.distribution;
    const investor = context.investor;
    const line = context.line;

    let prompt = '';

    if (type === 'DISTRIBUTION_NOTICE') {
      prompt = `Generate a professional distribution notice email for an investor.

Fund: ${distribution.fund.name}
Distribution Date: ${distribution.distributionDate.toLocaleDateString()}
Payable Date: ${distribution.payableDate.toLocaleDateString()}
Distribution Amount: $${line.totalAmount.toFixed(2)}
  - Dividend: $${line.dividendAmount.toFixed(2)}
  - Return of Capital: $${line.returnOfCapitalAmount.toFixed(2)}
  - Gain: $${line.gainAmount.toFixed(2)}

Investor: ${investor.user.name}

Create a professional email with:
1. Clear subject line
2. HTML formatted body with all details
3. Plain text version
4. Include reinvestment information if applicable
5. Tax information disclaimer

Format as JSON: { subject, html, text }`;
    } else if (type === 'PAYMENT_CONFIRMATION') {
      prompt = `Generate a payment confirmation email for a distribution payment.
Amount: $${line.totalAmount.toFixed(2)}
Status: Successfully processed
Expected arrival: 1-2 business days

Format as JSON: { subject, html, text }`;
    } else if (type === 'TAX_SUMMARY') {
      prompt = `Generate a tax summary email with K-1 information.
Amount: $${line.totalAmount.toFixed(2)}
Distribution components and tax implications

Format as JSON: { subject, html, text }`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    try {
      const parsed = JSON.parse(content.text);
      return {
        subject: parsed.subject,
        htmlContent: parsed.html,
        plainText: parsed.text,
      };
    } catch {
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Generate SMS message
   */
  private async generateSMSMessage(type: string, line: any): Promise<string> {
    if (type === 'DISTRIBUTION_NOTICE') {
      return `Distribution alert: $${line.totalAmount.toFixed(2)} will be paid. More details: [link]`;
    } else if (type === 'PAYMENT_CONFIRMATION') {
      return `Payment confirmed: $${line.totalAmount.toFixed(2)} distributed. Arrival: 1-2 business days.`;
    }
    return 'Distribution update: Check your account for details.';
  }

  /**
   * Send email notification
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    try {
      await sendgrid.send({
        to: params.to,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: process.env.SENDGRID_REPLY_TO!,
      });
    } catch (error) {
      console.error('SendGrid error:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(params: {
    to: string;
    message: string;
  }) {
    try {
      await twilioClient.messages.create({
        body: params.message,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: params.to,
      });
    } catch (error) {
      console.error('Twilio error:', error);
      throw error;
    }
  }

  /**
   * Trigger in-app notification
   */
  private async triggerInAppNotification(userId: string, notification: any) {
    // Send via WebSocket or push notification service
    await db.inAppNotification.create({
      data: {
        userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedId: notification.distributionId,
        read: false,
        createdAt: new Date(),
      },
    });
  }
}
```

**Task DIST-003: Payment Processing Integration**
```typescript
// lib/payments/distribution-payment-processor.ts

import { db } from '@/lib/db';
import Stripe from 'stripe';
import { ModernTreasury } from '@treasury/sdk';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const modernTreasury = new ModernTreasury({
  apiKey: process.env.MODERN_TREASURY_API_KEY!,
});

interface ProcessPaymentParams {
  distributionPaymentId: string;
  organizationId: string;
}

export class DistributionPaymentProcessor {
  /**
   * Process distribution payment via ACH/Wire
   */
  async processPayment(params: ProcessPaymentParams) {
    const payment = await db.distributionPayment.findUnique({
      where: { id: params.distributionPaymentId },
      include: {
        distribution: {
          include: {
            fund: true,
          },
        },
        investor: {
          include: {
            bankAccounts: {
              where: { isDefault: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!payment.investor.bankAccounts.length) {
      throw new Error('No bank account on file for investor');
    }

    const bankAccount = payment.investor.bankAccounts[0];

    try {
      // Create payment via Modern Treasury
      const paymentRequest = await modernTreasury.paymentOrders.create({
        amount: payment.amount.toNumber(),
        currency: payment.distribution.fund.currency || 'USD',
        direction: 'outbound',
        originating_account_id: process.env.MODERN_TREASURY_ACCOUNT_ID!,
        receiving_account: {
          account_number: bankAccount.accountNumber,
          routing_number: bankAccount.routingNumber,
          account_holder_name: payment.investor.name,
          account_type: bankAccount.accountType as 'checking' | 'savings',
        },
        description: `Distribution: ${payment.distribution.fund.name}`,
        metadata: {
          distributionId: payment.distributionId,
          investorId: payment.investorId,
          paymentId: payment.id,
        },
      });

      // Store external payment reference
      await db.distributionPayment.update({
        where: { id: payment.id },
        data: {
          externalTransactionId: paymentRequest.id,
          status: 'PROCESSING',
        },
      });

      // Set up webhook to track status
      await this.setupPaymentWebhook(paymentRequest.id);

      return paymentRequest;
    } catch (error) {
      // Fallback to Stripe ACH
      return this.processPaymentViaStripe(payment);
    }
  }

  /**
   * Process payment via Stripe (backup)
   */
  private async processPaymentViaStripe(payment: any) {
    const bankAccount = payment.investor.bankAccounts[0];

    try {
      // Create ACH debit via Stripe
      const charge = await stripe.charges.create({
        amount: Math.floor(payment.amount.toNumber() * 100),
        currency: 'usd',
        source: await this.createBankAccountToken(bankAccount),
        description: `Distribution: ${payment.distribution.fund.name}`,
        metadata: {
          distributionId: payment.distributionId,
          investorId: payment.investorId,
        },
      });

      await db.distributionPayment.update({
        where: { id: payment.id },
        data: {
          externalTransactionId: charge.id,
          status: 'PROCESSING',
        },
      });

      return charge;
    } catch (error) {
      throw new Error(`Payment processing failed: ${error}`);
    }
  }

  /**
   * Create bank account token for Stripe
   */
  private async createBankAccountToken(bankAccount: any) {
    const token = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_holder_name: bankAccount.accountHolderName,
        account_holder_type: 'individual',
        routing_number: bankAccount.routingNumber,
        account_number: bankAccount.accountNumber,
      },
    });

    return token.id;
  }

  /**
   * Set up webhook to track payment status
   */
  private async setupPaymentWebhook(paymentId: string) {
    // Implementation for webhook setup
    // Store webhook subscription and handle status updates
  }

  /**
   * Handle payment status webhook
   */
  async handlePaymentStatusUpdate(webhookData: any) {
    const { paymentId, status, failureReason } = webhookData;

    const payment = await db.distributionPayment.findFirst({
      where: { externalTransactionId: paymentId },
    });

    if (!payment) {
      return;
    }

    const statusMap: Record<string, string> = {
      'posted': 'COMPLETED',
      'failed': 'FAILED',
      'cancelled': 'FAILED',
      'pending': 'PROCESSING',
    };

    const newStatus = statusMap[status] || 'UNKNOWN';

    await db.distributionPayment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        failureReason: failureReason,
        paidAt: newStatus === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  /**
   * Handle payment failure and retry
   */
  async handlePaymentFailure(paymentId: string, reason: string) {
    const payment = await db.distributionPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return;
    }

    // Record failure
    await db.paymentFailureLog.create({
      data: {
        distributionPaymentId: paymentId,
        failureReason: reason,
        attemptNumber: (payment.attemptCount || 0) + 1,
        failedAt: new Date(),
      },
    });

    // Update attempt count
    await db.distributionPayment.update({
      where: { id: paymentId },
      data: {
        attemptCount: (payment.attemptCount || 0) + 1,
        status: 'FAILED',
      },
    });

    // Notify investor and administrator
    await this.notifyPaymentFailure(payment, reason);

    // Queue retry if attempts remaining
    if ((payment.attemptCount || 0) < 3) {
      const delayMinutes = [5, 60, 1440][(payment.attemptCount || 0)]; // 5 min, 1 hour, 1 day
      // Queue retry with exponential backoff
    }
  }

  /**
   * Notify about payment failure
   */
  private async notifyPaymentFailure(payment: any, reason: string) {
    // Send notification via email/SMS
    // Flag for manual review
  }
}
```

### Week 26: Reinvestment & Forecasting

**Task DIST-004: Reinvestment Engine**
```typescript
// lib/distributions/reinvestment.service.ts

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

interface ReinvestmentElection {
  investorId: string;
  fundId: string;
  preference: 'CASH' | 'AUTOMATIC' | 'PARTIAL';
  partialPercentage?: Decimal;
  alternativeInvestment?: string;
}

export class ReinvestmentService {
  /**
   * Process reinvestment elections
   */
  async processReinvestmentElections(distributionId: string) {
    const distribution = await db.distribution.findUnique({
      where: { id: distributionId },
      include: {
        lines: {
          include: {
            investor: {
              include: {
                investorPreferences: true,
              },
            },
          },
        },
        fund: true,
      },
    });

    if (!distribution) {
      throw new Error('Distribution not found');
    }

    // Get current NAV at distribution date
    const navSnapshot = await this.getNavAtDate(
      distribution.fundId,
      distribution.distributionDate
    );

    for (const line of distribution.lines) {
      const preference = line.investor.investorPreferences.find(
        p => p.fundId === distribution.fundId
      );

      if (!preference) {
        // Use organization default
        const orgDefault = await this.getOrganizationDefaultPreference(
          line.investor.organizationId
        );
        const pref = orgDefault || { preference: 'CASH' };

        // Process according to preference
        await this.processLineReinvestment(line, pref, navSnapshot);
      } else {
        await this.processLineReinvestment(line, preference, navSnapshot);
      }
    }
  }

  /**
   * Process reinvestment for a single distribution line
   */
  private async processLineReinvestment(
    line: any,
    preference: ReinvestmentElection,
    navSnapshot: any
  ) {
    if (preference.preference === 'CASH') {
      // Standard cash payment - handled in payment processing
      line.reinvestmentAmount = new Decimal(0);
      line.reinvestmentShares = new Decimal(0);
    } else if (preference.preference === 'AUTOMATIC') {
      // Reinvest full amount at NAV
      const reinvestAmount = line.totalAmount;
      const shares = reinvestAmount.div(navSnapshot.navPerShare);

      await db.distributionLine.update({
        where: { id: line.id },
        data: {
          reinvestmentAmount: reinvestAmount,
          reinvestmentShares: shares,
          reinvestmentNavPrice: navSnapshot.navPerShare,
          reinvestmentDate: navSnapshot.asOfDate,
          status: 'REINVESTED',
        },
      });

      // Create position in fund
      await db.position.create({
        data: {
          investorId: line.investorId,
          fundId: line.distribution.fundId,
          quantity: shares,
          costBasis: reinvestAmount,
          acquisitionDate: navSnapshot.asOfDate,
          source: 'REINVESTMENT',
          sourceId: line.id,
        },
      });

      // Record reinvestment transaction
      await db.reinvestmentTransaction.create({
        data: {
          distributionId: line.distributionId,
          investorId: line.investorId,
          amount: reinvestAmount,
          shares: shares,
          navPrice: navSnapshot.navPerShare,
          transactionDate: navSnapshot.asOfDate,
          status: 'COMPLETED',
        },
      });
    } else if (preference.preference === 'PARTIAL') {
      // Reinvest portion, pay out remainder
      const percentage = preference.partialPercentage || new Decimal(50);
      const reinvestAmount = line.totalAmount.mul(percentage).div(100);
      const paymentAmount = line.totalAmount.sub(reinvestAmount);

      const shares = reinvestAmount.div(navSnapshot.navPerShare);

      await db.distributionLine.update({
        where: { id: line.id },
        data: {
          reinvestmentAmount: reinvestAmount,
          reinvestmentShares: shares,
          reinvestmentNavPrice: navSnapshot.navPerShare,
          paymentAmount: paymentAmount,
        },
      });

      // Create reinvested position
      await db.position.create({
        data: {
          investorId: line.investorId,
          fundId: line.distribution.fundId,
          quantity: shares,
          costBasis: reinvestAmount,
          acquisitionDate: navSnapshot.asOfDate,
          source: 'REINVESTMENT',
          sourceId: line.id,
        },
      });
    }
  }

  /**
   * Get current NAV at specific date
   */
  private async getNavAtDate(fundId: string, date: Date) {
    // First try exact date
    let nav = await db.navSnapshot.findFirst({
      where: {
        fundId,
        asOfDate: {
          equals: new Date(date.toISOString().split('T')[0]),
        },
      },
    });

    if (nav) return nav;

    // Get closest date before
    nav = await db.navSnapshot.findFirst({
      where: {
        fundId,
        asOfDate: { lte: date },
      },
      orderBy: { asOfDate: 'desc' },
      take: 1,
    });

    if (nav) return nav;

    throw new Error(`NAV not available for fund ${fundId} on ${date}`);
  }

  /**
   * Get organization default reinvestment preference
   */
  private async getOrganizationDefaultPreference(organizationId: string) {
    return db.organizationSetting.findFirst({
      where: {
        organizationId,
        key: 'DEFAULT_REINVESTMENT_PREFERENCE',
      },
    });
  }

  /**
   * Update investor reinvestment election
   */
  async updateReinvestmentElection(params: {
    investorId: string;
    fundId: string;
    preference: 'CASH' | 'AUTOMATIC' | 'PARTIAL';
    partialPercentage?: Decimal;
  }) {
    let preference = await db.investorPreference.findFirst({
      where: {
        investorId: params.investorId,
        fundId: params.fundId,
      },
    });

    if (!preference) {
      preference = await db.investorPreference.create({
        data: {
          investorId: params.investorId,
          fundId: params.fundId,
          reinvestmentPreference: params.preference,
          partialReinvestmentPercentage: params.partialPercentage,
        },
      });
    } else {
      preference = await db.investorPreference.update({
        where: { id: preference.id },
        data: {
          reinvestmentPreference: params.preference,
          partialReinvestmentPercentage: params.partialPercentage,
        },
      });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: (await db.investor.findUnique({ where: { id: params.investorId } }))
          ?.organizationId,
        action: 'UPDATE_REINVESTMENT_ELECTION',
        resourceType: 'INVESTOR_PREFERENCE',
        resourceId: preference.id,
        changes: {
          preference: params.preference,
          partialPercentage: params.partialPercentage?.toString(),
        },
      },
    });

    return preference;
  }
}
```

**Task DIST-005: Distribution Forecasting with ML**
```typescript
// lib/forecasting/distribution-forecaster.ts

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';

interface HistoricalDistribution {
  date: Date;
  amount: Decimal;
  month: number;
  quarter: number;
  aum: Decimal;
  return: Decimal;
}

interface ForecastResult {
  date: Date;
  baseCaseAmount: Decimal;
  baseCaseConfidence: number;
  bullCaseAmount?: Decimal;
  bearCaseAmount?: Decimal;
  reasoning: string;
}

export class DistributionForecaster {
  /**
   * Forecast distributions for next N months
   */
  async forecastDistributions(params: {
    fundId: string;
    months: number;
    includeScenarios?: boolean;
  }): Promise<ForecastResult[]> {
    // Get historical data
    const historicalData = await this.getHistoricalDistributions(params.fundId);

    if (historicalData.length < 4) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Get fund metrics
    const fundMetrics = await this.getFundMetrics(params.fundId);

    // Prepare features for ML model
    const features = this.extractFeatures(historicalData, fundMetrics);

    // Call ML forecasting service
    const predictions = await this.callForecastingService({
      features,
      months: params.months,
      includeScenarios: params.includeScenarios,
    });

    // Convert predictions to forecast results
    const results: ForecastResult[] = [];
    const startDate = new Date();

    for (let i = 0; i < params.months; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      const prediction = predictions[i];

      results.push({
        date: forecastDate,
        baseCaseAmount: new Decimal(prediction.amount),
        baseCaseConfidence: prediction.confidence,
        bullCaseAmount: params.includeScenarios
          ? new Decimal(prediction.bullAmount)
          : undefined,
        bearCaseAmount: params.includeScenarios
          ? new Decimal(prediction.bearAmount)
          : undefined,
        reasoning: prediction.reasoning,
      });
    }

    // Store forecasts for reference
    await this.storeForecastResults(params.fundId, results);

    return results;
  }

  /**
   * Extract features from historical data
   */
  private extractFeatures(
    historicalData: HistoricalDistribution[],
    fundMetrics: any
  ): any[] {
    return historicalData.map((dist, index) => ({
      amount: dist.amount.toNumber(),
      month: dist.month,
      quarter: dist.quarter,
      aum: dist.aum.toNumber(),
      return: dist.return.toNumber(),
      daysFromPrevious:
        index > 0
          ? Math.floor(
              (dist.date.getTime() - historicalData[index - 1].date.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
      // Lagged features
      prevAmount: index > 0 ? historicalData[index - 1].amount.toNumber() : null,
      avgAmount3M:
        index >= 3
          ? historicalData
              .slice(index - 3, index)
              .reduce((sum, d) => sum.plus(d.amount), new Decimal(0))
              .div(3)
              .toNumber()
          : null,
    }));
  }

  /**
   * Get historical distributions
   */
  private async getHistoricalDistributions(fundId: string): Promise<HistoricalDistribution[]> {
    const distributions = await db.distribution.findMany({
      where: {
        fundId,
        status: 'COMPLETED',
      },
      orderBy: { distributionDate: 'asc' },
      take: 36, // 3 years of data
    });

    const fundData = await db.fundAnalytics.findMany({
      where: { fundId },
      orderBy: { asOfDate: 'asc' },
    });

    return distributions.map(dist => {
      // Find closest fund metrics
      const closestMetrics = fundData.reduce((closest, current) => {
        const distTime = dist.distributionDate.getTime();
        const currentTime = current.asOfDate.getTime();
        const closestTime = closest?.asOfDate.getTime() || distTime;

        if (Math.abs(distTime - currentTime) < Math.abs(distTime - closestTime)) {
          return current;
        }
        return closest;
      });

      return {
        date: dist.distributionDate,
        amount: dist.totalAmount,
        month: dist.distributionDate.getMonth(),
        quarter: Math.floor(dist.distributionDate.getMonth() / 3),
        aum: closestMetrics?.aum || new Decimal(0),
        return: closestMetrics?.monthlyReturn || new Decimal(0),
      };
    });
  }

  /**
   * Get current fund metrics
   */
  private async getFundMetrics(fundId: string) {
    const fund = await db.fund.findUnique({
      where: { id: fundId },
    });

    const latestMetrics = await db.fundAnalytics.findFirst({
      where: { fundId },
      orderBy: { asOfDate: 'desc' },
      take: 1,
    });

    return {
      aum: fund?.aum,
      nav: fund?.nav,
      ytdReturn: latestMetrics?.ytdReturn,
      volatility: latestMetrics?.volatility,
      sharpeRatio: latestMetrics?.sharpeRatio,
    };
  }

  /**
   * Call ML forecasting microservice
   */
  private async callForecastingService(params: any) {
    try {
      const response = await axios.post('http://ml-service:3001/forecast/distributions', params);
      return response.data;
    } catch (error) {
      console.error('Forecasting service error:', error);
      throw error;
    }
  }

  /**
   * Store forecast results
   */
  private async storeForecastResults(fundId: string, results: ForecastResult[]) {
    // Store in analytics/reporting system
    await db.distributionForecast.createMany({
      data: results.map(r => ({
        fundId,
        forecastDate: r.date,
        baseCaseAmount: r.baseCaseAmount,
        baseCaseConfidence: r.baseCaseConfidence,
        bullCaseAmount: r.bullCaseAmount,
        bearCaseAmount: r.bearCaseAmount,
        reasoning: r.reasoning,
        createdAt: new Date(),
      })),
    });
  }

  /**
   * Get distribution forecast with trend analysis
   */
  async getForecastWithTrends(params: {
    fundId: string;
    months: number;
  }): Promise<{
    forecasts: ForecastResult[];
    trends: {
      averageDistribution: Decimal;
      trend: 'INCREASING' | 'DECREASING' | 'STABLE';
      seasonality: Record<number, Decimal>; // By month
    };
  }> {
    const forecasts = await this.forecastDistributions({
      fundId: params.fundId,
      months: params.months,
      includeScenarios: true,
    });

    const historicalData = await this.getHistoricalDistributions(params.fundId);

    // Calculate statistics
    const avgDist = historicalData.reduce((sum, d) => sum.plus(d.amount), new Decimal(0)).div(
      historicalData.length
    );

    // Trend analysis (simple linear regression)
    const trend = this.calculateTrend(historicalData);

    // Seasonality by month
    const byMonth: Record<number, Decimal[]> = {};
    historicalData.forEach(d => {
      if (!byMonth[d.month]) byMonth[d.month] = [];
      byMonth[d.month].push(d.amount);
    });

    const seasonality: Record<number, Decimal> = {};
    Object.entries(byMonth).forEach(([month, amounts]) => {
      seasonality[parseInt(month)] = amounts.reduce((sum, a) => sum.plus(a), new Decimal(0)).div(
        amounts.length
      );
    });

    return {
      forecasts,
      trends: {
        averageDistribution: avgDist,
        trend,
        seasonality,
      },
    };
  }

  /**
   * Calculate trend from historical data
   */
  private calculateTrend(data: HistoricalDistribution[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (data.length < 2) return 'STABLE';

    const recent = data.slice(-6); // Last 6 distributions
    const older = data.slice(-12, -6); // 6 before that

    if (recent.length === 0 || older.length === 0) return 'STABLE';

    const recentAvg = recent.reduce((sum, d) => sum.plus(d.amount), new Decimal(0)).div(
      recent.length
    );
    const olderAvg = older.reduce((sum, d) => sum.plus(d.amount), new Decimal(0)).div(
      older.length
    );

    const change = recentAvg.minus(olderAvg).div(olderAvg);

    if (change.gt(0.1)) return 'INCREASING';
    if (change.lt(-0.1)) return 'DECREASING';
    return 'STABLE';
  }
}
```

### Week 27: Tax Reporting & Integration

**Task DIST-006: K-1 and Tax Reporting Integration**
```typescript
// lib/tax-reporting/k1-generator.ts

import { db } from '@/lib/db';
import { ExcelJS } from 'exceljs';

interface K1Data {
  investorId: string;
  fundId: string;
  taxYear: number;
  lineItems: Array<{
    lineNumber: string;
    description: string;
    amount: Decimal;
    percentage?: Decimal;
  }>;
}

export class K1Generator {
  /**
   * Generate K-1 tax form for investor
   */
  async generateK1(params: {
    investorId: string;
    fundId: string;
    taxYear: number;
  }): Promise<K1Data> {
    // Get all distributions in tax year
    const distributions = await db.distribution.findMany({
      where: {
        fundId: params.fundId,
        distributionDate: {
          gte: new Date(`${params.taxYear}-01-01`),
          lt: new Date(`${params.taxYear + 1}-01-01`),
        },
        status: 'COMPLETED',
      },
      include: {
        lines: {
          where: { investorId: params.investorId },
        },
      },
    });

    if (!distributions.length) {
      throw new Error('No distributions found for tax year');
    }

    // Aggregate components
    let totalOrdinaryIncome = new Decimal(0);
    let totalCapitalGain = new Decimal(0);
    let totalReturnOfCapital = new Decimal(0);
    let totalDividendIncome = new Decimal(0);

    const lineItems = [];

    // Process each distribution
    for (const dist of distributions) {
      const line = dist.lines[0];
      if (!line) continue;

      totalDividendIncome = totalDividendIncome.plus(line.dividendAmount);
      totalCapitalGain = totalCapitalGain.plus(line.gainAmount);
      totalReturnOfCapital = totalReturnOfCapital.plus(line.returnOfCapitalAmount);
    }

    // Build K-1 line items (per IRS Schedule K-1)
    lineItems.push({
      lineNumber: '1a',
      description: 'Ordinary income from partnership',
      amount: totalOrdinaryIncome,
    });

    lineItems.push({
      lineNumber: '5a',
      description: 'Capital gain (long-term)',
      amount: totalCapitalGain,
    });

    lineItems.push({
      lineNumber: '8',
      description: 'Distributions - cash',
      amount: totalReturnOfCapital,
    });

    lineItems.push({
      lineNumber: '10',
      description: 'Qualified dividends',
      amount: totalDividendIncome,
    });

    // Get investor allocation percentage
    const totalInvestorEquity = await this.getInvestorEquity(
      params.investorId,
      params.fundId,
      new Date(`${params.taxYear}-12-31`)
    );

    const fundEquity = await this.getFundEquity(params.fundId, new Date(`${params.taxYear}-12-31`));

    const allocationPercentage = fundEquity.gt(0) ? totalInvestorEquity.div(fundEquity) : new Decimal(0);

    // Add K-1 line items with percentages
    lineItems.forEach(item => {
      item.percentage = allocationPercentage.mul(100);
    });

    return {
      investorId: params.investorId,
      fundId: params.fundId,
      taxYear: params.taxYear,
      lineItems,
    };
  }

  /**
   * Export K-1 to Excel format
   */
  async exportK1ToExcel(k1Data: K1Data): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Schedule K-1');

    // Add header
    worksheet.addRow(['Schedule K-1 (Form 1065) - Partner\'s Share of Income, Deductions, Credits, etc.']);
    worksheet.addRow([]);

    // Add investor info
    const investor = await db.investor.findUnique({
      where: { id: k1Data.investorId },
      include: { user: true },
    });

    const fund = await db.fund.findUnique({
      where: { id: k1Data.fundId },
    });

    worksheet.addRow(['Investor Name:', investor?.user.name]);
    worksheet.addRow(['Fund Name:', fund?.name]);
    worksheet.addRow(['Tax Year:', k1Data.taxYear]);
    worksheet.addRow([]);

    // Add line items
    worksheet.addRow(['Line', 'Description', 'Amount', '% of Ownership']);
    worksheet.addRow([]);

    k1Data.lineItems.forEach(item => {
      worksheet.addRow([
        item.lineNumber,
        item.description,
        item.amount.toFixed(2),
        `${item.percentage?.toFixed(2) || 'N/A'}%`,
      ]);
    });

    // Format columns
    worksheet.columns = [
      { width: 8 },
      { width: 40 },
      { width: 15 },
      { width: 15 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  /**
   * Get investor equity at date
   */
  private async getInvestorEquity(investorId: string, fundId: string, asOfDate: Date) {
    const positions = await db.position.findMany({
      where: {
        investorId,
        fundId,
      },
    });

    const nav = await db.navSnapshot.findFirst({
      where: {
        fundId,
        asOfDate: { lte: asOfDate },
      },
      orderBy: { asOfDate: 'desc' },
      take: 1,
    });

    const totalShares = positions.reduce((sum, p) => sum.plus(p.quantity), new Decimal(0));
    return totalShares.mul(nav?.navPerShare || new Decimal(0));
  }

  /**
   * Get total fund equity at date
   */
  private async getFundEquity(fundId: string, asOfDate: Date) {
    const fund = await db.fund.findUnique({
      where: { id: fundId },
    });

    return fund?.aum || new Decimal(0);
  }
}
```

## Database Schema

```prisma
model Distribution {
  id                String               @id @default(cuid())
  fundId            String
  organizationId    String
  fund              Fund                 @relation(fields: [fundId], references: [id])
  organization      Organization         @relation(fields: [organizationId], references: [id])

  distributionDate  DateTime
  recordDate        DateTime
  payableDate       DateTime

  totalAmount       Decimal              @db.Decimal(15, 2)
  currency          String               @default("USD")

  status            String               @default("DRAFT") // DRAFT, READY, APPROVED, PROCESSING, COMPLETED, CANCELLED
  description       String?

  lines             DistributionLine[]
  payments          DistributionPayment[]
  notifications     Notification[]
  forecasts         DistributionForecast[]

  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  @@index([fundId])
  @@index([organizationId])
  @@index([payableDate])
  @@index([status])
}

model DistributionLine {
  id                       String                @id @default(cuid())
  distributionId           String
  investorId               String
  distribution             Distribution         @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  investor                 Investor             @relation(fields: [investorId], references: [id])

  totalAmount              Decimal              @db.Decimal(15, 2)
  dividendAmount           Decimal              @db.Decimal(15, 2)
  returnOfCapitalAmount    Decimal              @db.Decimal(15, 2)
  gainAmount               Decimal              @db.Decimal(15, 2)

  status                   String               @default("PENDING") // PENDING, PAYMENT_INITIATED, PAID, REINVESTED, FAILED

  // Reinvestment fields
  reinvestmentAmount       Decimal?             @db.Decimal(15, 2)
  reinvestmentShares       Decimal?             @db.Decimal(20, 8)
  reinvestmentNavPrice     Decimal?             @db.Decimal(15, 8)
  reinvestmentDate         DateTime?

  // Payment fields
  paymentAmount            Decimal?             @db.Decimal(15, 2)

  createdAt                DateTime             @default(now())
  updatedAt                DateTime             @updatedAt

  @@unique([distributionId, investorId])
  @@index([investorId])
  @@index([status])
}

model DistributionPayment {
  id                    String            @id @default(cuid())
  distributionId        String
  investorId            String
  distribution          Distribution      @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  investor              Investor          @relation(fields: [investorId], references: [id])

  amount                Decimal           @db.Decimal(15, 2)
  paymentMethod         String            // ACH, WIRE, CHECK
  externalTransactionId String?           @unique

  status                String            @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED

  attemptCount          Int               @default(0)
  failureReason         String?
  failureDetails        Json?

  recordedAt            DateTime
  paidAt                DateTime?

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@index([distributionId])
  @@index([investorId])
  @@index([status])
  @@index([paidAt])
}

model ReinvestmentTransaction {
  id              String      @id @default(cuid())
  distributionId  String
  investorId      String
  distribution    Distribution @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  investor        Investor    @relation(fields: [investorId], references: [id])

  amount          Decimal     @db.Decimal(15, 2)
  shares          Decimal     @db.Decimal(20, 8)
  navPrice        Decimal     @db.Decimal(15, 8)

  transactionDate DateTime
  status          String      @default("COMPLETED")

  createdAt       DateTime    @default(now())

  @@index([distributionId])
  @@index([investorId])
}

model DistributionPaymentFailure {
  id                      String              @id @default(cuid())
  distributionPaymentId   String
  payment                 DistributionPayment @relation(fields: [distributionPaymentId], references: [id], onDelete: Cascade)

  failureReason           String
  attemptNumber           Int
  failedAt                DateTime

  @@index([distributionPaymentId])
  @@index([failedAt])
}

model DistributionForecast {
  id                String    @id @default(cuid())
  fundId            String
  fund              Fund      @relation(fields: [fundId], references: [id])

  forecastDate      DateTime
  baseCaseAmount    Decimal   @db.Decimal(15, 2)
  baseCaseConfidence Float    @default(0.85)

  bullCaseAmount    Decimal?  @db.Decimal(15, 2)
  bearCaseAmount    Decimal?  @db.Decimal(15, 2)

  reasoning         String?
  createdAt         DateTime  @default(now())

  @@index([fundId])
  @@index([forecastDate])
}

model Notification {
  id                String        @id @default(cuid())
  investorId        String
  distributionId    String
  investor          Investor      @relation(fields: [investorId], references: [id])
  distribution      Distribution  @relation(fields: [distributionId], references: [id], onDelete: Cascade)

  type              String        // DISTRIBUTION_NOTICE, PAYMENT_CONFIRMATION, TAX_SUMMARY, PAYMENT_FAILED
  channel           String        // EMAIL, SMS, IN_APP
  status            String        @default("PENDING") // PENDING, SENT, FAILED, BOUNCED

  sentAt            DateTime?
  readAt            DateTime?

  createdAt         DateTime      @default(now())

  @@index([investorId])
  @@index([distributionId])
  @@index([status])
}

model InAppNotification {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  title         String
  message       String
  type          String
  relatedId     String?

  read          Boolean   @default(false)
  readAt        DateTime?

  createdAt     DateTime  @default(now())

  @@index([userId])
  @@index([read])
}

model NavSnapshot {
  id          String    @id @default(cuid())
  fundId      String
  fund        Fund      @relation(fields: [fundId], references: [id])

  asOfDate    DateTime
  navPerShare Decimal   @db.Decimal(15, 8)

  createdAt   DateTime  @default(now())

  @@unique([fundId, asOfDate])
  @@index([fundId])
  @@index([asOfDate])
}

model PaymentFailureLog {
  id                    String            @id @default(cuid())
  distributionPaymentId String
  payment               DistributionPayment @relation(fields: [distributionPaymentId], references: [id], onDelete: Cascade)

  failureReason         String
  attemptNumber         Int
  failedAt              DateTime

  @@index([distributionPaymentId])
  @@index([failedAt])
}
```

## API Endpoints

### Distribution Management
- `POST /api/distributions` - Create distribution
- `GET /api/distributions/:id` - Get distribution details
- `PUT /api/distributions/:id` - Update distribution
- `PATCH /api/distributions/:id/approve` - Approve distribution
- `PATCH /api/distributions/:id/process` - Process distribution
- `GET /api/distributions/fund/:fundId` - Get fund distributions
- `GET /api/distributions` - List distributions (paginated)

### Distribution Lines
- `GET /api/distributions/:id/lines` - Get distribution lines
- `GET /api/distributions/:id/lines/:investorId` - Get specific investor line
- `PUT /api/distributions/:id/lines/:investorId` - Update distribution line

### Payments
- `GET /api/distributions/:id/payments` - Get distribution payments
- `POST /api/distributions/:id/payments` - Process payments
- `PATCH /api/distributions/payments/:paymentId/retry` - Retry failed payment
- `GET /api/distributions/payments/:paymentId/status` - Get payment status

### Reinvestment
- `GET /api/investors/:investorId/reinvestment-preferences` - Get preferences
- `PUT /api/investors/:investorId/reinvestment-preferences/:fundId` - Update preference
- `GET /api/distributions/:id/reinvestments` - Get reinvested amounts

### Forecasting
- `GET /api/funds/:fundId/distribution-forecast` - Get forecast
- `GET /api/funds/:fundId/distribution-forecast/with-scenarios` - Get with scenarios
- `GET /api/funds/:fundId/distribution-trends` - Get trend analysis

### Tax Reporting
- `GET /api/investors/:investorId/k1/:taxYear/:fundId` - Get K-1 data
- `GET /api/investors/:investorId/k1/:taxYear/:fundId/export` - Export K-1 (Excel/PDF)
- `GET /api/funds/:fundId/tax-summary/:taxYear` - Get tax summary

### Notifications
- `GET /api/notifications` - Get investor notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `GET /api/notifications/preferences` - Get notification preferences
- `PUT /api/notifications/preferences` - Update preferences

## Frontend Pages

### Admin Pages
- `/distributions` - Distribution management dashboard
- `/distributions/create` - Create new distribution
- `/distributions/:id` - Distribution detail view
- `/distributions/:id/edit` - Edit distribution
- `/distributions/:id/payments` - Payment tracking
- `/distributions/forecast` - Forecast dashboard

### Investor Pages
- `/account/distributions` - Distribution history
- `/account/distributions/:id` - Distribution details
- `/account/distributions/:id/tax-documents` - Tax documents
- `/account/reinvestment-preferences` - DRIP settings
- `/account/payment-methods` - Bank account management

### Reports
- `/reports/distributions` - Distribution analytics
- `/reports/tax-summary` - Annual tax summary
- `/reports/cash-flow` - Cash flow analysis

## Integration with Payment Processing

The Distribution Agent integrates with the Payment Processing Agent for:

1. **Payment Execution** - Using Modern Treasury and Stripe for ACH/Wire
2. **Payment Verification** - Matching payments against bank statements
3. **Failure Handling** - Coordinating retry logic and notifications
4. **FX Management** - Converting currencies for international distributions
5. **Compliance** - Ensuring PCI DSS and regulatory compliance

## Integration with Fund Admin Systems

Data flow between Distribution Agent and Fund Admin systems:

1. **Bi-directional Sync** - Distribution schedules synced with SS&C, Carta
2. **NAV Coordination** - Using latest NAV for reinvestment calculations
3. **Investor Preferences** - Syncing reinvestment elections
4. **Reporting** - Providing distribution data for fund admin reports

## Timeline (Weeks 25-28)

### Week 25: Core Distribution & Payments
- [ ] Distribution creation and management (DIST-001)
- [ ] Notification engine (DIST-002)
- [ ] Payment processing integration (DIST-003)
- [ ] Database schema implementation
- [ ] Basic API endpoints
- [ ] Payment status tracking

### Week 26: Reinvestment & Forecasting
- [ ] Reinvestment election processing (DIST-004)
- [ ] DRIP management and tracking
- [ ] ML-based forecasting (DIST-005)
- [ ] Trend analysis and seasonality detection
- [ ] Forecast visualization

### Week 27: Tax Reporting & Integration
- [ ] K-1 generation and export (DIST-006)
- [ ] Tax reporting integration
- [ ] Cost basis tracking
- [ ] Fund admin sync (detailed)
- [ ] Webhook integration

### Week 28: Testing & Optimization
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Load testing (10K+ concurrent distributions)
- [ ] Security audit
- [ ] Documentation and training
- [ ] Production deployment

## Success Metrics

### Functional Metrics
- **Distribution Processing**: 99.9% of distributions processed on schedule
- **Payment Success Rate**: 98%+ of payments processed successfully
- **Reinvestment Accuracy**: 100% of DRIP elections processed correctly
- **Forecast Accuracy**: Mean Absolute Percentage Error (MAPE) < 15%
- **Notification Delivery**: 99.9% email, 98% SMS delivery

### Performance Metrics
- **Distribution Creation**: < 100ms
- **Payment Processing**: < 500ms
- **Forecast Generation**: < 2 seconds
- **API Response Time**: < 200ms (p95)
- **Concurrent Distributions**: 10,000+ simultaneous

### Financial Metrics
- **Payment Processing Cost**: < $0.50 per transaction
- **System Uptime**: 99.99%
- **Average Distribution Size**: Accurate within 0.1%
- **Tax Reporting Accuracy**: 100% compliance

### User Metrics
- **Notification Open Rate**: > 60%
- **Payment Confirmation Rate**: > 85%
- **Reinvestment Election Rate**: Track by fund
- **Customer Satisfaction**: > 4.5/5 stars

### Compliance Metrics
- **Audit Trail Completeness**: 100%
- **Tax Form Accuracy**: Zero audit findings
- **Payment Reconciliation**: 99.99% automatic match rate
- **Data Security**: Zero breaches

---

**Distribution Agent enables Clearway to process complex multi-fund distributions efficiently while maintaining institutional-grade reporting and compliance standards.**

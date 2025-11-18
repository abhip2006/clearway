# Payment Processing Agent 💳

## Role
Specialized agent responsible for payment tracking, wire transfer verification, ACH processing, payment reconciliation, and integration with banking APIs. Ensures 100% payment accuracy, automated reconciliation, and fraud detection for capital call payments.

## Primary Responsibilities

1. **Wire Transfer Verification**
   - SWIFT message parsing (MT103, MT202)
   - Wire reference matching
   - Amount verification (exact match + tolerance)
   - Duplicate payment detection
   - Multi-currency support

2. **ACH Processing Integration**
   - Plaid integration for ACH transfers
   - Stripe ACH payments
   - Payment status webhooks
   - Failed payment retry logic
   - NSF (Non-Sufficient Funds) handling

3. **Payment Reconciliation**
   - Automated bank statement parsing
   - Capital call payment matching
   - Partial payment handling
   - Overpayment detection
   - Discrepancy alerting

4. **Banking API Integration**
   - Treasury Prime API
   - Modern Treasury integration
   - Unit.co banking integration
   - Real-time balance checking
   - Transaction history sync

5. **Fraud Detection**
   - Anomaly detection in payment patterns
   - Velocity checks (multiple payments)
   - Source IP validation
   - Device fingerprinting
   - Risk scoring

## Tech Stack

### Payment Processing
- **Plaid** for ACH authorization
- **Stripe** for payment processing
- **Modern Treasury** for treasury management
- **Treasury Prime** for banking as a service

### Reconciliation
- **pdf-parse** for bank statement parsing
- **tesseract.js** for OCR of scanned statements
- **machine-learning-js** for anomaly detection

### Security
- **stripe-cli** for webhook testing
- **crypto** for payment ID hashing
- **aws-kms** for encryption

### Monitoring
- **Datadog** for payment metrics
- **PagerDuty** for critical payment alerts

## MVP Phase 2 Features

### Week 9-10: Wire Transfer Verification

**Task PAY-001: SWIFT Message Parser**
```typescript
// lib/payment/swift-parser.ts

import { z } from 'zod';

const SwiftMT103Schema = z.object({
  messageType: z.literal('MT103'),
  senderReference: z.string(), // Field 20
  valueDate: z.string(), // Field 32A
  currency: z.string().length(3),
  amount: z.number(),
  orderingCustomer: z.string(), // Field 50K
  beneficiaryCustomer: z.string(), // Field 59
  remittanceInfo: z.string().optional(), // Field 70
  senderToReceiverInfo: z.string().optional(), // Field 72
});

export class SwiftMessageParser {
  parseMessage(rawMessage: string): z.infer<typeof SwiftMT103Schema> {
    const lines = rawMessage.split('\n');

    const parsed = {
      messageType: this.extractField(lines, 'MT103') as 'MT103',
      senderReference: this.extractField(lines, ':20:'),
      valueDate: this.extractField(lines, ':32A:').substring(0, 6),
      currency: this.extractField(lines, ':32A:').substring(6, 9),
      amount: parseFloat(this.extractField(lines, ':32A:').substring(9).replace(',', '.')),
      orderingCustomer: this.extractField(lines, ':50K:'),
      beneficiaryCustomer: this.extractField(lines, ':59:'),
      remittanceInfo: this.extractField(lines, ':70:', false),
      senderToReceiverInfo: this.extractField(lines, ':72:', false),
    };

    return SwiftMT103Schema.parse(parsed);
  }

  private extractField(lines: string[], fieldTag: string, required = true): string {
    const fieldLine = lines.find(line => line.includes(fieldTag));

    if (!fieldLine && required) {
      throw new Error(`Required field ${fieldTag} not found in SWIFT message`);
    }

    if (!fieldLine) return '';

    // Extract field value (everything after the tag)
    return fieldLine.substring(fieldLine.indexOf(fieldTag) + fieldTag.length).trim();
  }

  async matchToCapitalCall(swiftMessage: z.infer<typeof SwiftMT103Schema>): Promise<{
    capitalCallId: string | null;
    confidence: number;
    matchedBy: 'reference' | 'amount' | 'fuzzy' | 'none';
  }> {
    // Try exact wire reference match first
    const byReference = await db.capitalCall.findFirst({
      where: {
        wireReference: swiftMessage.senderReference,
        status: 'APPROVED',
      },
    });

    if (byReference) {
      return {
        capitalCallId: byReference.id,
        confidence: 1.0,
        matchedBy: 'reference',
      };
    }

    // Try fuzzy match on remittance info
    const remittanceWords = swiftMessage.remittanceInfo?.toLowerCase().split(/\s+/) || [];

    const potentialMatches = await db.capitalCall.findMany({
      where: {
        status: 'APPROVED',
        amountDue: {
          gte: swiftMessage.amount * 0.99, // 1% tolerance
          lte: swiftMessage.amount * 1.01,
        },
        currency: swiftMessage.currency,
        dueDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Within 30 days
        },
      },
    });

    // Score each potential match
    let bestMatch = null;
    let bestScore = 0;

    for (const call of potentialMatches) {
      let score = 0;

      // Exact amount match
      if (Math.abs(call.amountDue.toNumber() - swiftMessage.amount) < 1) {
        score += 0.5;
      }

      // Fund name in remittance info
      const fundWords = call.fundName.toLowerCase().split(/\s+/);
      const matchedWords = fundWords.filter(word => remittanceWords.includes(word));
      score += (matchedWords.length / fundWords.length) * 0.3;

      // Wire reference similarity
      if (call.wireReference && swiftMessage.senderReference) {
        const similarity = this.stringSimilarity(
          call.wireReference,
          swiftMessage.senderReference
        );
        score += similarity * 0.2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = call;
      }
    }

    if (bestScore > 0.7) {
      return {
        capitalCallId: bestMatch!.id,
        confidence: bestScore,
        matchedBy: 'fuzzy',
      };
    }

    return {
      capitalCallId: null,
      confidence: 0,
      matchedBy: 'none',
    };
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
```

**Acceptance Criteria**:
- ✅ Parses SWIFT MT103 messages
- ✅ Extracts all relevant fields
- ✅ Matches payments to capital calls by wire reference
- ✅ Fuzzy matching with confidence scoring
- ✅ Amount tolerance (1%) for rounding differences
- ✅ String similarity algorithm for reference matching
- ✅ Returns match confidence score

---

**Task PAY-002: Payment Recording & Status Tracking**
```typescript
// lib/payment/payment-service.ts

export class PaymentService {
  async recordPayment(params: {
    capitalCallId: string;
    amount: number;
    currency: string;
    paidAt: Date;
    paymentMethod: 'WIRE' | 'ACH' | 'CHECK';
    reference?: string;
    swiftMessage?: any;
    bankStatementId?: string;
  }): Promise<Payment> {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.capitalCallId },
      include: { user: true },
    });

    if (!capitalCall) {
      throw new Error('Capital call not found');
    }

    // Check for duplicate payments
    const existingPayment = await db.payment.findFirst({
      where: {
        capitalCallId: params.capitalCallId,
        reference: params.reference,
        status: { in: ['PENDING', 'COMPLETED'] },
      },
    });

    if (existingPayment) {
      throw new Error('Duplicate payment detected');
    }

    // Determine payment status
    const amountDue = capitalCall.amountDue.toNumber();
    const amountPaid = params.amount;

    let status: 'COMPLETED' | 'PARTIAL' | 'OVERPAID';

    if (Math.abs(amountPaid - amountDue) < 1) {
      status = 'COMPLETED';
    } else if (amountPaid < amountDue) {
      status = 'PARTIAL';
    } else {
      status = 'OVERPAID';
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        capitalCallId: params.capitalCallId,
        userId: capitalCall.userId,
        amount: params.amount,
        currency: params.currency,
        paidAt: params.paidAt,
        paymentMethod: params.paymentMethod,
        reference: params.reference,
        status,
        swiftMessage: params.swiftMessage,
        bankStatementId: params.bankStatementId,
      },
    });

    // Update capital call status
    if (status === 'COMPLETED') {
      await db.capitalCall.update({
        where: { id: params.capitalCallId },
        data: { status: 'PAID', paidAt: params.paidAt },
      });
    }

    // Send notification
    await this.sendPaymentNotification(payment, capitalCall);

    // Log to audit trail
    await db.auditLog.create({
      data: {
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        userId: capitalCall.userId,
        metadata: {
          amount: params.amount,
          status,
          capitalCallId: params.capitalCallId,
        },
      },
    });

    return payment;
  }

  async reconcilePayment(paymentId: string, params: {
    reconciledBy: string;
    notes?: string;
    adjustedAmount?: number;
  }): Promise<void> {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { capitalCall: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const finalAmount = params.adjustedAmount || payment.amount.toNumber();

    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'RECONCILED',
        reconciledAt: new Date(),
        reconciledBy: params.reconciledBy,
        reconciliationNotes: params.notes,
        amount: finalAmount,
      },
    });

    // Update capital call if needed
    const totalPaid = await db.payment.aggregate({
      where: {
        capitalCallId: payment.capitalCallId,
        status: { in: ['COMPLETED', 'RECONCILED'] },
      },
      _sum: { amount: true },
    });

    const amountDue = payment.capitalCall.amountDue.toNumber();
    const totalPaidAmount = totalPaid._sum.amount?.toNumber() || 0;

    if (Math.abs(totalPaidAmount - amountDue) < 1) {
      await db.capitalCall.update({
        where: { id: payment.capitalCallId },
        data: { status: 'PAID' },
      });
    }
  }

  private async sendPaymentNotification(payment: Payment, capitalCall: CapitalCall) {
    // Send email notification
    await resend.emails.send({
      from: 'Clearway <notifications@clearway.com>',
      to: capitalCall.user.email,
      subject: `Payment ${payment.status} - ${capitalCall.fundName}`,
      react: PaymentConfirmation({
        fundName: capitalCall.fundName,
        amount: payment.amount.toNumber(),
        paidAt: payment.paidAt,
        status: payment.status,
      }),
    });
  }
}
```

**Acceptance Criteria**:
- ✅ Records payments with all metadata
- ✅ Detects duplicate payments
- ✅ Calculates payment status (complete/partial/overpaid)
- ✅ Updates capital call status automatically
- ✅ Sends email notifications
- ✅ Creates audit trail
- ✅ Supports payment reconciliation

---

**Task PAY-003: ACH Processing with Plaid**
```typescript
// lib/payment/plaid-ach.ts

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments.production,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

export class PlaidACHService {
  async createLinkToken(userId: string): Promise<string> {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Clearway',
      products: ['auth'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: 'https://clearway.com/payment/callback',
    });

    return response.data.link_token;
  }

  async exchangePublicToken(publicToken: string, userId: string): Promise<{
    accessToken: string;
    accountId: string;
  }> {
    // Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = tokenResponse.data.access_token;

    // Get account information
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const checkingAccount = accountsResponse.data.accounts.find(
      acc => acc.subtype === 'checking'
    );

    if (!checkingAccount) {
      throw new Error('No checking account found');
    }

    // Store bank account securely
    await db.bankAccount.create({
      data: {
        userId,
        plaidAccessToken: await this.encryptToken(accessToken),
        plaidAccountId: checkingAccount.account_id,
        accountName: checkingAccount.name,
        accountMask: checkingAccount.mask || '',
        accountType: 'CHECKING',
        status: 'ACTIVE',
      },
    });

    return {
      accessToken,
      accountId: checkingAccount.account_id,
    };
  }

  async initiateACHPayment(params: {
    capitalCallId: string;
    userId: string;
    bankAccountId: string;
  }): Promise<{ paymentId: string; status: string }> {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.capitalCallId },
    });

    const bankAccount = await db.bankAccount.findUnique({
      where: { id: params.bankAccountId },
    });

    if (!capitalCall || !bankAccount) {
      throw new Error('Capital call or bank account not found');
    }

    // Create Plaid processor token
    const processorTokenResponse = await plaidClient.processorTokenCreate({
      access_token: await this.decryptToken(bankAccount.plaidAccessToken),
      account_id: bankAccount.plaidAccountId,
      processor: 'stripe',
    });

    // Create Stripe payment method
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const paymentMethod = await stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: 'individual',
        routing_number: processorTokenResponse.data.processor_token,
      },
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(capitalCall.amountDue.toNumber() * 100),
      currency: capitalCall.currency.toLowerCase(),
      payment_method: paymentMethod.id,
      payment_method_types: ['us_bank_account'],
      confirm: true,
      metadata: {
        capitalCallId: params.capitalCallId,
        userId: params.userId,
      },
    });

    // Record payment in database
    const payment = await db.payment.create({
      data: {
        capitalCallId: params.capitalCallId,
        userId: params.userId,
        amount: capitalCall.amountDue.toNumber(),
        currency: capitalCall.currency,
        paymentMethod: 'ACH',
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        reference: paymentIntent.id,
      },
    });

    return {
      paymentId: payment.id,
      status: paymentIntent.status,
    };
  }

  async handleACHWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const succeededIntent = event.data.object as Stripe.PaymentIntent;
        await this.markPaymentSuccessful(succeededIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailure(failedIntent);
        break;

      case 'charge.refunded':
        const refund = event.data.object as Stripe.Charge;
        await this.handleRefund(refund);
        break;
    }
  }

  private async markPaymentSuccessful(paymentIntentId: string) {
    await db.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // Update capital call
    const payment = await db.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (payment) {
      await db.capitalCall.update({
        where: { id: payment.capitalCallId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const failureCode = paymentIntent.last_payment_error?.code;
    const failureMessage = paymentIntent.last_payment_error?.message;

    await db.payment.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        failureReason: `${failureCode}: ${failureMessage}`,
      },
    });

    // Notify user
    const payment = await db.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { user: true, capitalCall: true },
    });

    if (payment) {
      await resend.emails.send({
        from: 'Clearway <notifications@clearway.com>',
        to: payment.user.email,
        subject: `Payment Failed - ${payment.capitalCall.fundName}`,
        react: PaymentFailureNotification({
          fundName: payment.capitalCall.fundName,
          amount: payment.amount.toNumber(),
          reason: failureMessage || 'Unknown error',
        }),
      });
    }
  }

  private async encryptToken(token: string): Promise<string> {
    // Use AWS KMS or similar for encryption
    const kms = new AWS.KMS({ region: 'us-east-1' });

    const encrypted = await kms.encrypt({
      KeyId: process.env.KMS_KEY_ID!,
      Plaintext: Buffer.from(token),
    }).promise();

    return encrypted.CiphertextBlob!.toString('base64');
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    const kms = new AWS.KMS({ region: 'us-east-1' });

    const decrypted = await kms.decrypt({
      CiphertextBlob: Buffer.from(encryptedToken, 'base64'),
    }).promise();

    return decrypted.Plaintext!.toString('utf8');
  }
}
```

**Acceptance Criteria**:
- ✅ Plaid Link integration for bank connection
- ✅ ACH payment initiation via Stripe
- ✅ Webhook processing for payment status
- ✅ Encrypted token storage with KMS
- ✅ Payment failure handling with notifications
- ✅ NSF/failed payment tracking

---

**Task PAY-004: Bank Statement Reconciliation**
```typescript
// lib/payment/statement-reconciliation.ts

import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export class BankStatementReconciler {
  async parseStatement(statementPdfUrl: string): Promise<{
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      type: 'CREDIT' | 'DEBIT';
      reference?: string;
    }>;
  }> {
    // Download PDF
    const response = await fetch(statementPdfUrl);
    const buffer = await response.arrayBuffer();

    let text: string;

    try {
      // Try text-based PDF parsing first
      const pdf = await pdfParse(Buffer.from(buffer));
      text = pdf.text;
    } catch (error) {
      // Fallback to OCR for scanned statements
      const worker = await createWorker('eng');
      const result = await worker.recognize(Buffer.from(buffer));
      text = result.data.text;
      await worker.terminate();
    }

    // Parse transactions from text
    return this.extractTransactions(text);
  }

  private extractTransactions(statementText: string): {
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      type: 'CREDIT' | 'DEBIT';
      reference?: string;
    }>;
  } {
    const lines = statementText.split('\n');
    const transactions: any[] = [];

    // Common patterns for bank statements
    const patterns = [
      // Pattern 1: Date | Description | Amount (Credit/Debit)
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(CR|DR)?/,

      // Pattern 2: MM/DD/YYYY Description $X,XXX.XX
      /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+\$?([\d,]+\.\d{2})/,
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);

        if (match) {
          const [, dateStr, description, amountStr, typeStr] = match;

          const amount = parseFloat(amountStr.replace(/,/g, ''));
          const type = typeStr === 'DR' || line.includes('DEBIT') ? 'DEBIT' : 'CREDIT';

          transactions.push({
            date: new Date(dateStr),
            description: description.trim(),
            amount,
            type,
            reference: this.extractReference(description),
          });

          break; // Move to next line after match
        }
      }
    }

    return { transactions };
  }

  private extractReference(description: string): string | undefined {
    // Look for wire reference patterns
    const refPatterns = [
      /REF[:\s]+([A-Z0-9-]+)/i,
      /WIRE[:\s]+([A-Z0-9-]+)/i,
      /([A-Z]{2,4}-\d{3,})/,
    ];

    for (const pattern of refPatterns) {
      const match = description.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  async reconcileStatement(params: {
    statementPdfUrl: string;
    bankAccountId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<{
    matched: number;
    unmatched: number;
    discrepancies: Array<{
      transactionDate: Date;
      description: string;
      amount: number;
      reason: string;
    }>;
  }> {
    // Parse statement
    const { transactions } = await this.parseStatement(params.statementPdfUrl);

    // Filter credits (incoming payments) within date range
    const credits = transactions.filter(t =>
      t.type === 'CREDIT' &&
      t.date >= params.startDate &&
      t.date <= params.endDate
    );

    let matched = 0;
    let unmatched = 0;
    const discrepancies: any[] = [];

    // Match each credit to a capital call payment
    for (const credit of credits) {
      const matchResult = await this.matchTransaction(credit);

      if (matchResult.matched) {
        matched++;

        // Update payment record
        await db.payment.update({
          where: { id: matchResult.paymentId! },
          data: {
            bankStatementId: params.statementPdfUrl,
            status: 'RECONCILED',
            reconciledAt: new Date(),
          },
        });
      } else {
        unmatched++;
        discrepancies.push({
          transactionDate: credit.date,
          description: credit.description,
          amount: credit.amount,
          reason: matchResult.reason,
        });
      }
    }

    // Create reconciliation record
    await db.statementReconciliation.create({
      data: {
        bankAccountId: params.bankAccountId,
        statementUrl: params.statementPdfUrl,
        startDate: params.startDate,
        endDate: params.endDate,
        totalTransactions: credits.length,
        matchedCount: matched,
        unmatchedCount: unmatched,
        discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        reconciledAt: new Date(),
      },
    });

    return { matched, unmatched, discrepancies };
  }

  private async matchTransaction(transaction: {
    date: Date;
    description: string;
    amount: number;
    reference?: string;
  }): Promise<{
    matched: boolean;
    paymentId?: string;
    reason?: string;
  }> {
    // Try matching by reference
    if (transaction.reference) {
      const byReference = await db.payment.findFirst({
        where: {
          reference: transaction.reference,
          status: { in: ['PENDING', 'COMPLETED'] },
        },
      });

      if (byReference && Math.abs(byReference.amount.toNumber() - transaction.amount) < 1) {
        return { matched: true, paymentId: byReference.id };
      }
    }

    // Try matching by amount and date
    const byAmountAndDate = await db.payment.findFirst({
      where: {
        amount: {
          gte: transaction.amount * 0.99,
          lte: transaction.amount * 1.01,
        },
        paidAt: {
          gte: new Date(transaction.date.getTime() - 24 * 60 * 60 * 1000), // 1 day before
          lte: new Date(transaction.date.getTime() + 24 * 60 * 60 * 1000), // 1 day after
        },
        status: { in: ['PENDING', 'COMPLETED'] },
      },
    });

    if (byAmountAndDate) {
      return { matched: true, paymentId: byAmountAndDate.id };
    }

    return {
      matched: false,
      reason: 'No matching payment found',
    };
  }
}
```

**Acceptance Criteria**:
- ✅ Parses PDF bank statements
- ✅ OCR fallback for scanned statements
- ✅ Extracts transaction details
- ✅ Matches transactions to payments
- ✅ Identifies discrepancies
- ✅ Creates reconciliation records
- ✅ Handles multiple date formats

---

## Database Schema Additions

```prisma
model Payment {
  id                     String   @id @default(cuid())
  capitalCallId          String
  capitalCall            CapitalCall @relation(fields: [capitalCallId], references: [id])
  userId                 String
  user                   User @relation(fields: [userId], references: [id])

  amount                 Decimal  @db.Decimal(15, 2)
  currency               String   @default("USD")
  paidAt                 DateTime

  paymentMethod          String   // WIRE, ACH, CHECK
  status                 String   // PENDING, COMPLETED, PARTIAL, OVERPAID, FAILED, RECONCILED

  reference              String?  // Wire reference or transaction ID
  swiftMessage           Json?    // Full SWIFT message data
  stripePaymentIntentId  String?  @unique

  bankStatementId        String?
  reconciledAt           DateTime?
  reconciledBy           String?
  reconciliationNotes    String?

  failureReason          String?

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([capitalCallId])
  @@index([userId])
  @@index([status])
  @@index([paidAt(sort: Desc)])
}

model BankAccount {
  id                String   @id @default(cuid())
  userId            String
  user              User @relation(fields: [userId], references: [id])

  plaidAccessToken  String   // Encrypted
  plaidAccountId    String
  accountName       String
  accountMask       String
  accountType       String   // CHECKING, SAVINGS

  status            String   @default("ACTIVE")

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
}

model StatementReconciliation {
  id                String   @id @default(cuid())
  bankAccountId     String

  statementUrl      String
  startDate         DateTime
  endDate           DateTime

  totalTransactions Int
  matchedCount      Int
  unmatchedCount    Int

  discrepancies     Json?

  reconciledAt      DateTime @default(now())

  @@index([bankAccountId])
  @@index([reconciledAt(sort: Desc)])
}

model AuditLog {
  id         String   @id @default(cuid())
  action     String
  entityType String
  entityId   String
  userId     String
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt(sort: Desc)])
}
```

---

## Quality Standards

### Payment Accuracy
- **100% accuracy** for wire verification
- **< 0.01% error rate** for reconciliation
- **Zero duplicate payments**

### Processing Speed
- **< 5 seconds** for ACH initiation
- **< 30 seconds** for wire matching
- **< 2 minutes** for statement reconciliation

### Security
- **PCI DSS Level 1** compliance
- **Encrypted bank credentials** (AES-256)
- **Fraud detection** on all transactions
- **Audit trail** for all payment actions

---

**Payment Processing Agent ready to handle end-to-end payment lifecycle with 100% accuracy and automated reconciliation.**

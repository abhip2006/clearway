// Payment Processing Agent - Task PAY-004: Bank Statement Reconciliation
// Handles PDF parsing, OCR fallback, and transaction matching for reconciliation

import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { db } from '@/lib/db';

export interface Transaction {
  date: Date;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reference?: string;
}

export interface ReconciliationResult {
  matched: number;
  unmatched: number;
  discrepancies: Array<{
    transactionDate: Date;
    description: string;
    amount: number;
    reason: string;
  }>;
}

export interface ReconcileStatementParams {
  statementPdfUrl: string;
  bankAccountId: string;
  startDate: Date;
  endDate: Date;
}

export class BankStatementReconciler {
  /**
   * Parse a bank statement PDF to extract transactions
   * Tries text-based parsing first, falls back to OCR if needed
   * @param statementPdfUrl - URL to the bank statement PDF
   * @returns Parsed transactions
   */
  async parseStatement(statementPdfUrl: string): Promise<{
    transactions: Transaction[];
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
      console.log('Text parsing failed, falling back to OCR');
      // Fallback to OCR for scanned statements
      const worker = await createWorker('eng');
      const result = await worker.recognize(Buffer.from(buffer));
      text = result.data.text;
      await worker.terminate();
    }

    // Parse transactions from text
    return this.extractTransactions(text);
  }

  /**
   * Extract transactions from statement text using pattern matching
   * @param statementText - Raw text from bank statement
   * @returns Extracted transactions
   */
  private extractTransactions(statementText: string): {
    transactions: Transaction[];
  } {
    const lines = statementText.split('\n');
    const transactions: Transaction[] = [];

    // Common patterns for bank statements
    const patterns = [
      // Pattern 1: Date | Description | Amount (Credit/Debit)
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(CR|DR)?/,

      // Pattern 2: MM/DD/YYYY Description $X,XXX.XX
      /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+\$?([\d,]+\.\d{2})/,

      // Pattern 3: YYYY-MM-DD format
      /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/,
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);

        if (match) {
          const [, dateStr, description, amountStr, typeStr] = match;

          const amount = parseFloat(amountStr.replace(/,/g, ''));
          const type =
            typeStr === 'DR' || line.includes('DEBIT') ? 'DEBIT' : 'CREDIT';

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

  /**
   * Extract wire reference from transaction description
   * @param description - Transaction description
   * @returns Extracted reference or undefined
   */
  private extractReference(description: string): string | undefined {
    // Look for wire reference patterns
    const refPatterns = [
      /REF[:\s]+([A-Z0-9-]+)/i,
      /WIRE[:\s]+([A-Z0-9-]+)/i,
      /([A-Z]{2,4}-\d{3,})/,
      /REF\s*#?\s*([A-Z0-9]+)/i,
    ];

    for (const pattern of refPatterns) {
      const match = description.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  /**
   * Reconcile a bank statement against recorded payments
   * @param params - Reconciliation parameters
   * @returns Reconciliation results
   */
  async reconcileStatement(
    params: ReconcileStatementParams
  ): Promise<ReconciliationResult> {
    // Parse statement
    const { transactions } = await this.parseStatement(params.statementPdfUrl);

    // Filter credits (incoming payments) within date range
    const credits = transactions.filter(
      (t) =>
        t.type === 'CREDIT' &&
        t.date >= params.startDate &&
        t.date <= params.endDate
    );

    let matched = 0;
    let unmatched = 0;
    const discrepancies: ReconciliationResult['discrepancies'] = [];

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
          reason: matchResult.reason || 'No matching payment found',
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
      },
    });

    return { matched, unmatched, discrepancies };
  }

  /**
   * Match a bank transaction to a payment record
   * @param transaction - Bank transaction to match
   * @returns Match result
   */
  private async matchTransaction(transaction: Transaction): Promise<{
    matched: boolean;
    paymentId?: string;
    reason?: string;
  }> {
    // Strategy 1: Try matching by reference
    if (transaction.reference) {
      const byReference = await db.payment.findFirst({
        where: {
          reference: transaction.reference,
          status: { in: ['PENDING', 'COMPLETED'] },
        },
      });

      if (
        byReference &&
        Math.abs(byReference.amount.toNumber() - transaction.amount) < 1
      ) {
        return { matched: true, paymentId: byReference.id };
      }
    }

    // Strategy 2: Try matching by amount and date (with tolerance)
    const byAmountAndDate = await db.payment.findFirst({
      where: {
        amount: {
          gte: transaction.amount * 0.99, // 1% tolerance
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

    // Strategy 3: Try matching by amount only (less reliable)
    const byAmountOnly = await db.payment.findFirst({
      where: {
        amount: {
          gte: transaction.amount * 0.99,
          lte: transaction.amount * 1.01,
        },
        status: { in: ['PENDING', 'COMPLETED'] },
        paidAt: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Within 60 days
        },
      },
    });

    if (byAmountOnly) {
      return { matched: true, paymentId: byAmountOnly.id };
    }

    return {
      matched: false,
      reason: 'No matching payment found in database',
    };
  }

  /**
   * Get reconciliation history for a bank account
   * @param bankAccountId - Bank account ID
   * @returns Reconciliation history
   */
  async getReconciliationHistory(bankAccountId: string) {
    return db.statementReconciliation.findMany({
      where: { bankAccountId },
      orderBy: { reconciledAt: 'desc' },
      take: 10,
    });
  }

  /**
   * Get unreconciled payments
   * @returns List of payments that haven't been reconciled
   */
  async getUnreconciledPayments() {
    return db.payment.findMany({
      where: {
        status: { in: ['PENDING', 'COMPLETED'] },
        reconciledAt: null,
      },
      include: {
        capitalCall: true,
        user: true,
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  /**
   * Detect potential fraud indicators in payments
   * @param paymentId - Payment ID to analyze
   * @returns Fraud indicators
   */
  async detectFraudIndicators(paymentId: string): Promise<{
    riskScore: number;
    indicators: string[];
  }> {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        capitalCall: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const indicators: string[] = [];
    let riskScore = 0;

    // Check 1: Multiple payments in short time
    const recentPayments = await db.payment.count({
      where: {
        userId: payment.userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentPayments > 3) {
      indicators.push('Multiple payments in 24 hours');
      riskScore += 0.3;
    }

    // Check 2: Amount significantly different from expected
    const amountDiff = Math.abs(
      payment.amount.toNumber() - payment.capitalCall.amountDue.toNumber()
    );
    const percentDiff =
      amountDiff / payment.capitalCall.amountDue.toNumber();

    if (percentDiff > 0.1) {
      indicators.push('Payment amount differs by >10% from expected');
      riskScore += 0.2;
    }

    // Check 3: Payment after extended delay
    const daysOverdue = Math.floor(
      (payment.paidAt.getTime() - payment.capitalCall.dueDate.getTime()) /
        (24 * 60 * 60 * 1000)
    );

    if (daysOverdue > 60) {
      indicators.push('Payment more than 60 days overdue');
      riskScore += 0.15;
    }

    // Check 4: First-time payer with large amount
    const previousPayments = await db.payment.count({
      where: {
        userId: payment.userId,
        status: { in: ['COMPLETED', 'RECONCILED'] },
        createdAt: {
          lt: payment.createdAt,
        },
      },
    });

    if (previousPayments === 0 && payment.amount.toNumber() > 100000) {
      indicators.push('First-time payment over $100,000');
      riskScore += 0.25;
    }

    // Check 5: Failed payments from same user
    const failedPayments = await db.payment.count({
      where: {
        userId: payment.userId,
        status: 'FAILED',
      },
    });

    if (failedPayments > 2) {
      indicators.push('Multiple failed payment attempts');
      riskScore += 0.1;
    }

    return {
      riskScore: Math.min(riskScore, 1.0), // Cap at 1.0
      indicators,
    };
  }
}

// Export singleton instance
export const bankStatementReconciler = new BankStatementReconciler();

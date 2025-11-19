// Distribution Agent - Task DIST-003: Payment Processing Integration
// ACH/Wire payment processing using Modern Treasury and Stripe

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

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
              where: { isPrimary: true, isActive: true },
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
      // In production, integrate with Modern Treasury or Stripe
      // For now, simulate the payment
      const paymentRequest = await this.simulatePaymentProcessing(payment, bankAccount);

      // Store external payment reference
      await db.distributionPayment.update({
        where: { id: payment.id },
        data: {
          externalTransactionId: paymentRequest.id,
          status: 'PROCESSING',
        },
      });

      return paymentRequest;
    } catch (error) {
      // Handle payment failure
      await this.handlePaymentFailure(payment.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Simulate payment processing
   */
  private async simulatePaymentProcessing(payment: any, bankAccount: any) {
    // Simulate payment ID
    const paymentId = `pay_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: paymentId,
      amount: payment.amount,
      status: 'processing',
      method: payment.paymentMethod,
    };
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
      posted: 'COMPLETED',
      failed: 'FAILED',
      cancelled: 'FAILED',
      pending: 'PROCESSING',
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

    // Update distribution line status
    if (newStatus === 'COMPLETED') {
      await db.distributionLine.update({
        where: {
          distributionId_investorId: {
            distributionId: payment.distributionId,
            investorId: payment.investorId,
          },
        },
        data: { status: 'PAID' },
      });
    }
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
        failureReason: reason,
      },
    });
  }

  /**
   * Batch process payments for a distribution
   */
  async batchProcessPayments(distributionId: string) {
    const payments = await db.distributionPayment.findMany({
      where: {
        distributionId,
        status: 'PENDING',
      },
    });

    const results = await Promise.allSettled(
      payments.map((payment) =>
        this.processPayment({
          distributionPaymentId: payment.id,
          organizationId: '',
        })
      )
    );

    return {
      total: payments.length,
      successful: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }
}

export const distributionPaymentProcessor = new DistributionPaymentProcessor();

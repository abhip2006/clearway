// Payment Processing Agent - Task PAY-002: Payment Recording & Status Tracking
// Handles payment recording, duplicate detection, status updates, and reconciliation

import { db } from '@/lib/db';
import { Resend } from 'resend';
import type { Payment, CapitalCall } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface RecordPaymentParams {
  capitalCallId: string;
  amount: number;
  currency: string;
  paidAt: Date;
  paymentMethod: 'WIRE' | 'ACH' | 'CHECK';
  reference?: string;
  swiftMessage?: any;
  bankStatementId?: string;
}

export interface ReconcilePaymentParams {
  reconciledBy: string;
  notes?: string;
  adjustedAmount?: number;
}

export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'OVERPAID'
  | 'FAILED'
  | 'RECONCILED';

export class PaymentService {
  /**
   * Record a new payment for a capital call
   * Handles duplicate detection, status calculation, and notifications
   * @param params - Payment recording parameters
   * @returns Created payment record
   */
  async recordPayment(params: RecordPaymentParams): Promise<Payment> {
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

    let status: PaymentStatus;

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

  /**
   * Reconcile a payment with actual bank records
   * Updates payment status and capital call if needed
   * @param paymentId - Payment ID to reconcile
   * @param params - Reconciliation parameters
   */
  async reconcilePayment(
    paymentId: string,
    params: ReconcilePaymentParams
  ): Promise<void> {
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

  /**
   * Get payment status for a capital call
   * @param capitalCallId - Capital call ID
   * @returns Payment status summary
   */
  async getPaymentStatus(capitalCallId: string) {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: capitalCallId },
      include: {
        payments: true,
      },
    });

    if (!capitalCall) {
      throw new Error('Capital call not found');
    }

    const totalPaid = capitalCall.payments
      .filter((p) => ['COMPLETED', 'RECONCILED'].includes(p.status))
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);

    const amountDue = capitalCall.amountDue.toNumber();
    const remaining = amountDue - totalPaid;

    return {
      capitalCallId,
      amountDue,
      totalPaid,
      remaining,
      status: capitalCall.status,
      payments: capitalCall.payments,
    };
  }

  /**
   * Send payment notification email
   * @param payment - Payment record
   * @param capitalCall - Associated capital call
   */
  private async sendPaymentNotification(
    payment: Payment,
    capitalCall: CapitalCall & { user: { email: string; name: string | null } }
  ) {
    try {
      await resend.emails.send({
        from: 'Clearway <notifications@clearway.com>',
        to: capitalCall.user.email,
        subject: `Payment ${payment.status} - ${capitalCall.fundName}`,
        html: this.generatePaymentEmailHtml(payment, capitalCall),
      });
    } catch (error) {
      console.error('Failed to send payment notification:', error);
      // Don't throw - notification failure shouldn't break payment recording
    }
  }

  /**
   * Generate payment confirmation email HTML
   * @param payment - Payment record
   * @param capitalCall - Associated capital call
   * @returns HTML email content
   */
  private generatePaymentEmailHtml(
    payment: Payment,
    capitalCall: CapitalCall
  ): string {
    const statusMessages = {
      PENDING: 'Your payment is being processed',
      COMPLETED: 'Your payment has been received and confirmed',
      PARTIAL: 'We received a partial payment',
      OVERPAID: 'We received an overpayment',
      FAILED: 'Your payment has failed',
      RECONCILED: 'Your payment has been reconciled',
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .status { padding: 15px; background-color: white; border-radius: 6px; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #4F46E5; }
            .details { margin-top: 20px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Confirmation</h1>
            </div>
            <div class="content">
              <p>Hello ${capitalCall.user.name || 'Investor'},</p>
              <p>${statusMessages[payment.status as keyof typeof statusMessages]}</p>

              <div class="status">
                <h2>Payment Details</h2>
                <div class="details">
                  <div class="detail-row">
                    <span>Fund Name:</span>
                    <strong>${capitalCall.fundName}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Amount:</span>
                    <span class="amount">${payment.currency} ${payment.amount.toFixed(2)}</span>
                  </div>
                  <div class="detail-row">
                    <span>Amount Due:</span>
                    <strong>${capitalCall.currency} ${capitalCall.amountDue.toFixed(2)}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Payment Method:</span>
                    <strong>${payment.paymentMethod}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Payment Date:</span>
                    <strong>${payment.paidAt.toLocaleDateString()}</strong>
                  </div>
                  ${payment.reference ? `
                  <div class="detail-row">
                    <span>Reference:</span>
                    <strong>${payment.reference}</strong>
                  </div>
                  ` : ''}
                  <div class="detail-row">
                    <span>Status:</span>
                    <strong>${payment.status}</strong>
                  </div>
                </div>
              </div>

              <p>If you have any questions about this payment, please contact our support team.</p>
              <p>Best regards,<br>The Clearway Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

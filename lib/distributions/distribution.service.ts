// Distribution Agent - Task DIST-001: Distribution Management Service
// Handles complete distribution lifecycle: creation, approval, processing, and payment coordination

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
    const totalAmount = params.amounts.reduce(
      (sum, a) => sum.plus(a.totalAmount),
      new Decimal(0)
    );
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
      data: params.amounts.map((amount) => ({
        distributionId: distribution.id,
        investorId: amount.investorId,
        totalAmount: amount.totalAmount,
        dividendAmount: amount.dividend,
        returnOfCapitalAmount: amount.returnOfCapital,
        gainAmount: amount.gain,
        status: 'PENDING',
      })),
    });

    // Trigger event for audit trail and notifications
    await this.triggerEvent({
      type: 'distribution.created',
      distributionId: distribution.id,
      fundId: params.fundId,
      organizationId: params.organizationId,
      totalAmount: totalAmount.toString(),
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
        fund: true,
        lines: {
          include: {
            investor: {
              include: {
                bankAccounts: true,
                preferences: {
                  where: { fundId: String },
                },
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
      const preference = line.investor.preferences.find(
        (p) => p.fundId === distribution.fundId
      );

      if (preference?.reinvestmentPreference === 'AUTOMATIC') {
        // Calculate reinvestment shares
        const nav = await this.getCurrentNAV(distribution.fundId);
        const shareCount = new Decimal(line.totalAmount).div(nav);

        await db.distributionLine.update({
          where: { id: line.id },
          data: {
            reinvestmentShares: shareCount,
            reinvestmentNavPrice: nav,
          },
        });
      }
    }

    // Update distribution status
    await db.distribution.update({
      where: { id: distributionId },
      data: { status: 'APPROVED' },
    });

    // Trigger event for payment processing
    await this.triggerEvent({
      type: 'distribution.approved',
      distributionId,
      organizationId: distribution.organizationId,
    });

    return distribution;
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
        externalTransactionId: params.transactionId,
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
  async confirmPayment(
    transactionId: string,
    status: 'SUCCESS' | 'FAILED',
    details?: any
  ) {
    const payment = await db.distributionPayment.findUnique({
      where: { externalTransactionId: transactionId },
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
    } else {
      // Handle payment failure
      await this.triggerEvent({
        type: 'distribution.payment_failed',
        distributionId: payment.distributionId,
        investorId: payment.investorId,
        reason: details?.reason,
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
    const trainingData = historicalDistributions.map((d) => ({
      date: d.distributionDate,
      amount: d.totalAmount.toString(),
      month: d.distributionDate.getMonth(),
      quarter: Math.floor(d.distributionDate.getMonth() / 3),
    }));

    // Get fund performance metrics
    const fund = await db.fund.findUnique({
      where: { id: params.fundId },
      include: { analytics: { take: 24, orderBy: { asOfDate: 'desc' } } },
    });

    // Call ML forecasting service (would be a separate microservice)
    try {
      const response = await fetch('http://ml-service:3001/forecast/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicalData: trainingData,
          fundMetrics: {
            aum: fund?.aum?.toString(),
            nav: fund?.nav?.toString(),
            ytdReturn: fund?.ytdReturn?.toString(),
          },
          months: params.months,
          includeScenarios: params.includeScenarios,
        }),
      });

      if (!response.ok) {
        throw new Error(`Forecasting service error: ${response.statusText}`);
      }

      const forecast = await response.json();
      return {
        baseCase: forecast.baseCase.map((f: any) => ({
          date: new Date(f.date),
          amount: new Decimal(f.amount),
          confidence: f.confidence,
        })),
        bullCase: forecast.bullCase?.map((f: any) => ({
          date: new Date(f.date),
          amount: new Decimal(f.amount),
        })),
        bearCase: forecast.bearCase?.map((f: any) => ({
          date: new Date(f.date),
          amount: new Decimal(f.amount),
        })),
      };
    } catch (error) {
      console.error('Forecasting service error:', error);
      // Fallback to simple moving average if ML service unavailable
      return this.fallbackForecast(historicalDistributions, params.months);
    }
  }

  /**
   * Fallback forecast using simple moving average
   */
  private fallbackForecast(
    historicalDistributions: any[],
    months: number
  ): {
    baseCase: Array<{ date: Date; amount: Decimal; confidence: number }>;
  } {
    const recentDistributions = historicalDistributions.slice(-6);
    const avgAmount = recentDistributions
      .reduce((sum, d) => sum.plus(new Decimal(d.totalAmount)), new Decimal(0))
      .div(recentDistributions.length);

    const baseCase = [];
    const startDate = new Date();

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      baseCase.push({
        date: forecastDate,
        amount: avgAmount,
        confidence: 0.7, // Lower confidence for simple forecast
      });
    }

    return { baseCase };
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
    await db.auditLog.create({
      data: {
        action: event.type,
        entityType: 'DISTRIBUTION',
        entityId: event.distributionId,
        metadata: event,
      },
    });

    // In a production system, this would publish to a message queue
    // like Kafka or trigger webhooks
    console.log('Event triggered:', event.type);
  }

  /**
   * Get distribution by ID with all related data
   */
  async getDistribution(distributionId: string) {
    return db.distribution.findUnique({
      where: { id: distributionId },
      include: {
        fund: true,
        lines: {
          include: {
            investor: {
              include: {
                preferences: true,
              },
            },
          },
        },
        payments: true,
        notifications: true,
      },
    });
  }

  /**
   * List distributions for a fund
   */
  async listDistributions(params: {
    fundId?: string;
    organizationId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params.fundId) where.fundId = params.fundId;
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.status) where.status = params.status;

    const [distributions, total] = await Promise.all([
      db.distribution.findMany({
        where,
        include: {
          fund: true,
          lines: { include: { investor: true } },
        },
        orderBy: { distributionDate: 'desc' },
        take: params.limit || 20,
        skip: params.offset || 0,
      }),
      db.distribution.count({ where }),
    ]);

    return {
      distributions,
      total,
      limit: params.limit || 20,
      offset: params.offset || 0,
    };
  }

  /**
   * Approve distribution (admin action)
   */
  async approveDistribution(distributionId: string, approvedBy: string) {
    const distribution = await db.distribution.findUnique({
      where: { id: distributionId },
    });

    if (!distribution) {
      throw new Error('Distribution not found');
    }

    if (distribution.status !== 'DRAFT' && distribution.status !== 'READY') {
      throw new Error('Distribution is not in approvable state');
    }

    await db.distribution.update({
      where: { id: distributionId },
      data: { status: 'READY' },
    });

    await this.triggerEvent({
      type: 'distribution.approved',
      distributionId,
      approvedBy,
    });

    return distribution;
  }

  /**
   * Cancel distribution
   */
  async cancelDistribution(distributionId: string, reason: string) {
    const distribution = await db.distribution.findUnique({
      where: { id: distributionId },
    });

    if (!distribution) {
      throw new Error('Distribution not found');
    }

    if (distribution.status === 'COMPLETED') {
      throw new Error('Cannot cancel completed distribution');
    }

    await db.distribution.update({
      where: { id: distributionId },
      data: { status: 'CANCELLED', description: reason },
    });

    await this.triggerEvent({
      type: 'distribution.cancelled',
      distributionId,
      reason,
    });

    return distribution;
  }
}

export const distributionService = new DistributionService();

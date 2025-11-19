// Distribution Agent - Task DIST-004: Reinvestment Engine
// DRIP (Dividend Reinvestment Plan) management and processing

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

interface ReinvestmentElection {
  investorId: string;
  fundId: string;
  preference: 'CASH' | 'AUTOMATIC' | 'PARTIAL';
  partialPercentage?: Decimal;
}

export class ReinvestmentService {
  /**
   * Process reinvestment elections for a distribution
   */
  async processReinvestmentElections(distributionId: string) {
    const distribution = await db.distribution.findUnique({
      where: { id: distributionId },
      include: {
        lines: {
          include: {
            investor: {
              include: {
                preferences: true,
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
      const preference = line.investor.preferences.find(
        (p) => p.fundId === distribution.fundId
      );

      if (preference) {
        await this.processLineReinvestment(line, preference, navSnapshot);
      } else {
        // Default to cash if no preference set
        await this.processLineReinvestment(
          line,
          { preference: 'CASH' } as any,
          navSnapshot
        );
      }
    }
  }

  /**
   * Process reinvestment for a single distribution line
   */
  private async processLineReinvestment(line: any, preference: any, navSnapshot: any) {
    if (preference.reinvestmentPreference === 'CASH') {
      // Standard cash payment - handled in payment processing
      await db.distributionLine.update({
        where: { id: line.id },
        data: {
          reinvestmentAmount: new Decimal(0),
          reinvestmentShares: new Decimal(0),
          paymentAmount: line.totalAmount,
        },
      });
    } else if (preference.reinvestmentPreference === 'AUTOMATIC') {
      // Reinvest full amount at NAV
      const reinvestAmount = new Decimal(line.totalAmount);
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
    } else if (preference.reinvestmentPreference === 'PARTIAL') {
      // Reinvest portion, pay out remainder
      const percentage = preference.partialReinvestmentPercentage || new Decimal(50);
      const reinvestAmount = new Decimal(line.totalAmount).mul(percentage).div(100);
      const paymentAmount = new Decimal(line.totalAmount).sub(reinvestAmount);
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
   * Get NAV at specific date
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
        action: 'UPDATE_REINVESTMENT_ELECTION',
        entityType: 'INVESTOR_PREFERENCE',
        entityId: preference.id,
        metadata: {
          preference: params.preference,
          partialPercentage: params.partialPercentage?.toString(),
        },
      },
    });

    return preference;
  }
}

export const reinvestmentService = new ReinvestmentService();

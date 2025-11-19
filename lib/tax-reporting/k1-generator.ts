// Distribution Agent - Task DIST-006: K-1 and Tax Reporting Integration
// Generates K-1 tax forms (Schedule K-1 Form 1065) for investors

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

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

    const fundEquity = await this.getFundEquity(
      params.fundId,
      new Date(`${params.taxYear}-12-31`)
    );

    const allocationPercentage = fundEquity.gt(0)
      ? totalInvestorEquity.div(fundEquity)
      : new Decimal(0);

    // Add allocation percentage to line items
    lineItems.forEach((item) => {
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
   * Export K-1 to JSON format (for frontend rendering or PDF generation)
   */
  async exportK1ToJSON(k1Data: K1Data): Promise<any> {
    const investor = await db.investor.findUnique({
      where: { id: k1Data.investorId },
    });

    const fund = await db.fund.findUnique({
      where: { id: k1Data.fundId },
    });

    return {
      investorName: investor?.name,
      fundName: fund?.name,
      taxYear: k1Data.taxYear,
      lineItems: k1Data.lineItems.map((item) => ({
        lineNumber: item.lineNumber,
        description: item.description,
        amount: item.amount.toFixed(2),
        percentage: item.percentage?.toFixed(2) || 'N/A',
      })),
    };
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

  /**
   * Generate K-1 for all investors in a fund
   */
  async generateK1ForAllInvestors(fundId: string, taxYear: number) {
    const investors = await db.investor.findMany({
      where: {
        positions: {
          some: {
            fundId: fundId,
          },
        },
      },
    });

    const k1Results = await Promise.allSettled(
      investors.map((investor) =>
        this.generateK1({
          investorId: investor.id,
          fundId,
          taxYear,
        })
      )
    );

    return {
      total: investors.length,
      successful: k1Results.filter((r) => r.status === 'fulfilled').length,
      failed: k1Results.filter((r) => r.status === 'rejected').length,
      results: k1Results,
    };
  }
}

export const k1Generator = new K1Generator();

// Distribution Agent - Task DIST-005: Distribution Forecasting with ML
// ML-based distribution predictions with historical trend analysis

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

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
      throw new Error('Insufficient historical data for forecasting (minimum 4 distributions required)');
    }

    // Get fund metrics
    const fundMetrics = await this.getFundMetrics(params.fundId);

    // Extract features for ML model
    const features = this.extractFeatures(historicalData, fundMetrics);

    // Call ML forecasting service (would be a separate microservice)
    try {
      const response = await fetch('http://ml-service:3001/forecast/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features,
          months: params.months,
          includeScenarios: params.includeScenarios,
        }),
      });

      if (!response.ok) {
        throw new Error(`Forecasting service error: ${response.statusText}`);
      }

      const predictions = await response.json();

      // Convert predictions to forecast results
      const results = this.convertPredictionsToResults(predictions, params.months);

      // Store forecasts for reference
      await this.storeForecastResults(params.fundId, results);

      return results;
    } catch (error) {
      console.error('ML forecasting service error:', error);
      // Fallback to simple statistical forecast
      return this.fallbackForecast(historicalData, params.months);
    }
  }

  /**
   * Extract features from historical data
   */
  private extractFeatures(historicalData: HistoricalDistribution[], fundMetrics: any): any[] {
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
      prevAmount: index > 0 ? historicalData[index - 1].amount.toNumber() : null,
      avgAmount3M:
        index >= 3
          ? historicalData
              .slice(index - 3, index)
              .reduce((sum, d) => sum + d.amount.toNumber(), 0) / 3
          : null,
    }));
  }

  /**
   * Get historical distributions with performance metrics
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

    return distributions.map((dist) => {
      const closestMetrics = this.findClosestMetrics(dist.distributionDate, fundData);

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
   * Find closest fund metrics to a date
   */
  private findClosestMetrics(targetDate: Date, fundData: any[]) {
    return fundData.reduce((closest, current) => {
      const distTime = targetDate.getTime();
      const currentTime = current.asOfDate.getTime();
      const closestTime = closest?.asOfDate.getTime() || distTime;

      if (Math.abs(distTime - currentTime) < Math.abs(distTime - closestTime)) {
        return current;
      }
      return closest;
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
   * Convert ML predictions to forecast results
   */
  private convertPredictionsToResults(predictions: any, months: number): ForecastResult[] {
    const results: ForecastResult[] = [];
    const startDate = new Date();

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      const prediction = predictions[i];

      results.push({
        date: forecastDate,
        baseCaseAmount: new Decimal(prediction.amount),
        baseCaseConfidence: prediction.confidence,
        bullCaseAmount: prediction.bullAmount ? new Decimal(prediction.bullAmount) : undefined,
        bearCaseAmount: prediction.bearAmount ? new Decimal(prediction.bearAmount) : undefined,
        reasoning: prediction.reasoning || 'ML-based forecast',
      });
    }

    return results;
  }

  /**
   * Fallback forecast using statistical methods
   */
  private fallbackForecast(
    historicalDistributions: HistoricalDistribution[],
    months: number
  ): ForecastResult[] {
    const recentDistributions = historicalDistributions.slice(-6);
    const avgAmount = recentDistributions
      .reduce((sum, d) => sum.plus(d.amount), new Decimal(0))
      .div(recentDistributions.length);

    // Calculate trend
    const trend = this.calculateTrend(historicalDistributions);
    const trendMultiplier = trend === 'INCREASING' ? 1.05 : trend === 'DECREASING' ? 0.95 : 1.0;

    const results: ForecastResult[] = [];
    const startDate = new Date();

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      // Apply trend multiplier
      const forecastAmount = avgAmount.mul(Math.pow(trendMultiplier, i));

      results.push({
        date: forecastDate,
        baseCaseAmount: forecastAmount,
        baseCaseConfidence: 0.7, // Lower confidence for statistical forecast
        reasoning: 'Statistical forecast based on moving average and trend',
      });
    }

    return results;
  }

  /**
   * Calculate trend from historical data
   */
  private calculateTrend(data: HistoricalDistribution[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (data.length < 2) return 'STABLE';

    const recent = data.slice(-6); // Last 6 distributions
    const older = data.slice(-12, -6); // 6 before that

    if (recent.length === 0 || older.length === 0) return 'STABLE';

    const recentAvg = recent.reduce((sum, d) => sum.plus(d.amount), new Decimal(0)).div(recent.length);
    const olderAvg = older.reduce((sum, d) => sum.plus(d.amount), new Decimal(0)).div(older.length);

    const change = recentAvg.minus(olderAvg).div(olderAvg);

    if (change.gt(0.1)) return 'INCREASING';
    if (change.lt(-0.1)) return 'DECREASING';
    return 'STABLE';
  }

  /**
   * Store forecast results
   */
  private async storeForecastResults(fundId: string, results: ForecastResult[]) {
    await db.distributionForecast.createMany({
      data: results.map((r) => ({
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
  async getForecastWithTrends(params: { fundId: string; months: number }) {
    const forecasts = await this.forecastDistributions({
      fundId: params.fundId,
      months: params.months,
      includeScenarios: true,
    });

    const historicalData = await this.getHistoricalDistributions(params.fundId);

    // Calculate statistics
    const avgDist = historicalData
      .reduce((sum, d) => sum.plus(d.amount), new Decimal(0))
      .div(historicalData.length);

    // Trend analysis
    const trend = this.calculateTrend(historicalData);

    // Seasonality by month
    const byMonth: Record<number, Decimal[]> = {};
    historicalData.forEach((d) => {
      if (!byMonth[d.month]) byMonth[d.month] = [];
      byMonth[d.month].push(d.amount);
    });

    const seasonality: Record<number, Decimal> = {};
    Object.entries(byMonth).forEach(([month, amounts]) => {
      seasonality[parseInt(month)] = amounts
        .reduce((sum, a) => sum.plus(a), new Decimal(0))
        .div(amounts.length);
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
}

export const distributionForecaster = new DistributionForecaster();

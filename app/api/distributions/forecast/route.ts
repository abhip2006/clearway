// Distribution Agent - Forecasting API
// GET /api/distributions/forecast - Get distribution forecast for a fund

import { NextRequest, NextResponse } from 'next/server';
import { distributionForecaster } from '@/lib/forecasting/distribution-forecaster';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fundId = searchParams.get('fundId');
    const months = parseInt(searchParams.get('months') || '12');
    const includeScenarios = searchParams.get('includeScenarios') === 'true';

    if (!fundId) {
      return NextResponse.json(
        { error: 'fundId is required' },
        { status: 400 }
      );
    }

    const forecast = await distributionForecaster.getForecastWithTrends({
      fundId,
      months,
    });

    // Convert Decimal to string for JSON
    const serializedForecast = {
      forecasts: forecast.forecasts.map((f) => ({
        date: f.date.toISOString(),
        baseCaseAmount: f.baseCaseAmount.toString(),
        baseCaseConfidence: f.baseCaseConfidence,
        bullCaseAmount: f.bullCaseAmount?.toString(),
        bearCaseAmount: f.bearCaseAmount?.toString(),
        reasoning: f.reasoning,
      })),
      trends: {
        averageDistribution: forecast.trends.averageDistribution.toString(),
        trend: forecast.trends.trend,
        seasonality: Object.entries(forecast.trends.seasonality).reduce(
          (acc, [month, amount]) => ({
            ...acc,
            [month]: amount.toString(),
          }),
          {}
        ),
      },
    };

    return NextResponse.json(serializedForecast);
  } catch (error) {
    console.error('Error generating forecast:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

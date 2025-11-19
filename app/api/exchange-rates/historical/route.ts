// GET /api/exchange-rates/historical
// Retrieve historical exchange rates for a currency pair
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const days = parseInt(searchParams.get('days') || '30');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing currency parameters (from and to required)' },
        { status: 400 }
      );
    }

    // Get currency details
    const fromCurr = await prisma.currency.findUnique({ where: { code: from } });
    const toCurr = await prisma.currency.findUnique({ where: { code: to } });

    if (!fromCurr || !toCurr) {
      return NextResponse.json(
        { error: 'Invalid currency code' },
        { status: 400 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const rates = await prisma.exchangeRate.findMany({
      where: {
        fromCurrencyId: fromCurr.id,
        toCurrencyId: toCurr.id,
        rateTimestamp: { gte: startDate },
      },
      orderBy: { rateTimestamp: 'asc' },
    });

    // Calculate stats
    const rateValues = rates.map(r => parseFloat(r.rate.toString()));
    const avgRate = rateValues.reduce((a, b) => a + b, 0) / rateValues.length;
    const minRate = Math.min(...rateValues);
    const maxRate = Math.max(...rateValues);

    return NextResponse.json({
      pair: `${from}/${to}`,
      period: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        days,
      },
      statistics: {
        average: avgRate.toFixed(8),
        minimum: minRate.toFixed(8),
        maximum: maxRate.toFixed(8),
        volatility: ((maxRate - minRate) / avgRate * 100).toFixed(2) + '%',
      },
      rates: rates.map(r => ({
        date: r.rateTimestamp.toISOString(),
        rate: r.rate.toString(),
        source: r.source,
        confidence: r.confidenceScore?.toNumber(),
      })),
      count: rates.length,
    });
  } catch (error) {
    console.error('Error fetching historical rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical exchange rates' },
      { status: 500 }
    );
  }
}

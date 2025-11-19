// POST /api/exchange-rates/convert
// Convert amount between currencies with real-time rates
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { z } from 'zod';

const prisma = new PrismaClient();

const ConvertSchema = z.object({
  amount: z.string().or(z.number()),
  fromCurrency: z.string().length(3), // USD, EUR, etc.
  toCurrency: z.string().length(3),
  date: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, fromCurrency, toCurrency, date } = ConvertSchema.parse(body);

    // Get currency details
    const fromCurr = await prisma.currency.findUnique({
      where: { code: fromCurrency },
    });
    const toCurr = await prisma.currency.findUnique({
      where: { code: toCurrency },
    });

    if (!fromCurr || !toCurr) {
      return NextResponse.json(
        { error: 'Invalid currency code' },
        { status: 400 }
      );
    }

    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return NextResponse.json({
        originalAmount: amount.toString(),
        fromCurrency,
        toCurrency,
        exchangeRate: '1.00000000',
        convertedAmount: amount.toString(),
        rateTimestamp: new Date().toISOString(),
        source: 'same_currency',
        confidence: 1.0,
      });
    }

    // Get exchange rate
    const rateQuery = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyId: fromCurr.id,
        toCurrencyId: toCurr.id,
        rateTimestamp: date
          ? { lte: new Date(date) }
          : { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { rateTimestamp: 'desc' },
    });

    if (!rateQuery) {
      return NextResponse.json(
        { error: 'Exchange rate not found for this currency pair' },
        { status: 404 }
      );
    }

    // Calculate converted amount with precision
    const amountDec = new Decimal(amount);
    const rateDec = new Decimal(rateQuery.rate.toString());
    const convertedAmount = amountDec.times(rateDec);

    return NextResponse.json({
      originalAmount: amount.toString(),
      fromCurrency,
      toCurrency,
      exchangeRate: rateDec.toFixed(8),
      convertedAmount: convertedAmount.toFixed(toCurr.decimalPlaces),
      rateTimestamp: rateQuery.rateTimestamp.toISOString(),
      source: rateQuery.source,
      confidence: rateQuery.confidenceScore?.toNumber() || 1.0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: 'Conversion failed' },
      { status: 500 }
    );
  }
}

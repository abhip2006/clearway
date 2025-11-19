// GET /api/currencies
// Retrieve all supported currencies with localization
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const locale = req.headers.get('accept-language')?.split(',')[0] || 'en';

    const currencies = await prisma.currency.findMany({
      where: { enabled: true },
      include: {
        exchangeRatesFrom: {
          where: {
            rateTimestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
            },
          },
          take: 10,
          orderBy: { rateTimestamp: 'desc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    const formattedCurrencies = currencies.map(currency => ({
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
      region: currency.region,
      isCrypto: currency.isCrypto,
      latestExchangeRates: currency.exchangeRatesFrom.map(rate => ({
        toCurrency: rate.toCurrencyId,
        rate: rate.rate.toString(),
        timestamp: rate.rateTimestamp,
        source: rate.source,
      })),
    }));

    return NextResponse.json({
      currencies: formattedCurrencies,
      total: formattedCurrencies.length,
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currencies' },
      { status: 500 }
    );
  }
}

// Distribution Agent - K-1 Tax Reporting API
// GET /api/distributions/k1 - Generate K-1 for investor

import { NextRequest, NextResponse } from 'next/server';
import { k1Generator } from '@/lib/tax-reporting/k1-generator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const investorId = searchParams.get('investorId');
    const fundId = searchParams.get('fundId');
    const taxYear = parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString());

    if (!investorId || !fundId) {
      return NextResponse.json(
        { error: 'investorId and fundId are required' },
        { status: 400 }
      );
    }

    const k1Data = await k1Generator.generateK1({
      investorId,
      fundId,
      taxYear,
    });

    const k1JSON = await k1Generator.exportK1ToJSON(k1Data);

    return NextResponse.json(k1JSON);
  } catch (error) {
    console.error('Error generating K-1:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

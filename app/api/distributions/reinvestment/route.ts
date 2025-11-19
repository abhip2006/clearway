// Distribution Agent - Reinvestment API
// PUT /api/distributions/reinvestment - Update investor reinvestment preference

import { NextRequest, NextResponse } from 'next/server';
import { reinvestmentService } from '@/lib/distributions/reinvestment.service';
import { Decimal } from '@prisma/client/runtime/library';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { investorId, fundId, preference, partialPercentage } = body;

    if (!investorId || !fundId || !preference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['CASH', 'AUTOMATIC', 'PARTIAL'].includes(preference)) {
      return NextResponse.json(
        { error: 'Invalid reinvestment preference' },
        { status: 400 }
      );
    }

    const result = await reinvestmentService.updateReinvestmentElection({
      investorId,
      fundId,
      preference,
      partialPercentage: partialPercentage ? new Decimal(partialPercentage) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating reinvestment preference:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

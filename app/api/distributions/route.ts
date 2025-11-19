// Distribution Agent - API Routes
// POST /api/distributions - Create distribution
// GET /api/distributions - List distributions

import { NextRequest, NextResponse } from 'next/server';
import { distributionService } from '@/lib/distributions/distribution.service';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fundId,
      organizationId,
      distributionDate,
      recordDate,
      payableDate,
      amounts,
      currency,
      description,
    } = body;

    // Validate required fields
    if (!fundId || !organizationId || !distributionDate || !recordDate || !payableDate || !amounts) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert amounts to Decimal
    const processedAmounts = amounts.map((a: any) => ({
      investorId: a.investorId,
      totalAmount: new Decimal(a.totalAmount),
      dividend: new Decimal(a.dividend || 0),
      returnOfCapital: new Decimal(a.returnOfCapital || 0),
      gain: new Decimal(a.gain || 0),
    }));

    const distribution = await distributionService.createDistribution({
      fundId,
      organizationId,
      distributionDate: new Date(distributionDate),
      recordDate: new Date(recordDate),
      payableDate: new Date(payableDate),
      amounts: processedAmounts,
      currency: currency || 'USD',
      description,
    });

    return NextResponse.json(distribution, { status: 201 });
  } catch (error) {
    console.error('Error creating distribution:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fundId = searchParams.get('fundId') || undefined;
    const organizationId = searchParams.get('organizationId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await distributionService.listDistributions({
      fundId,
      organizationId,
      status,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing distributions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

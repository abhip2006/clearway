// Distribution Agent - API Routes
// GET /api/distributions/:id - Get distribution details
// PATCH /api/distributions/:id - Update distribution
// DELETE /api/distributions/:id - Cancel distribution

import { NextRequest, NextResponse } from 'next/server';
import { distributionService } from '@/lib/distributions/distribution.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const distribution = await distributionService.getDistribution(params.id);

    if (!distribution) {
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(distribution);
  } catch (error) {
    console.error('Error fetching distribution:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === 'approve') {
      const distribution = await distributionService.approveDistribution(
        params.id,
        data.approvedBy || 'system'
      );
      return NextResponse.json(distribution);
    } else if (action === 'process') {
      const distribution = await distributionService.processDistribution(params.id);
      return NextResponse.json(distribution);
    } else if (action === 'cancel') {
      const distribution = await distributionService.cancelDistribution(
        params.id,
        data.reason || 'No reason provided'
      );
      return NextResponse.json(distribution);
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating distribution:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

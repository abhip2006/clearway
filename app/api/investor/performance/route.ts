import { NextRequest, NextResponse } from 'next/server';
import { authenticateInvestor, unauthorizedResponse, errorResponse } from '@/lib/investor/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');

    // Get investor's fund participations
    const participations = await prisma.investorFundParticipation.findMany({
      where: {
        investorId: auth.investor!.id,
        ...(fundId && { fundId }),
      },
    });

    if (participations.length === 0) {
      return NextResponse.json({
        message: 'No fund participations found',
        participations: [],
      });
    }

    const fundIds = participations.map(p => p.fundId);

    // Get latest performance snapshots for each fund
    const snapshots = await prisma.investorPerformanceSnapshot.findMany({
      where: {
        investorId: auth.investor!.id,
        fundId: { in: fundIds },
      },
      orderBy: {
        asOfDate: 'desc',
      },
      distinct: ['fundId'],
    });

    // Get fund performance metrics
    const fundMetrics = await prisma.fundPerformanceMetric.findMany({
      where: {
        fundId: { in: fundIds },
      },
      orderBy: {
        asOfDate: 'desc',
      },
      distinct: ['fundId'],
    });

    return NextResponse.json({
      participations: participations.map(p => {
        const snapshot = snapshots.find(s => s.fundId === p.fundId);
        const metrics = fundMetrics.find(m => m.fundId === p.fundId);

        return {
          fundId: p.fundId,
          commitmentAmount: p.commitmentAmount,
          fundedAmount: p.fundedAmount,
          capitalAccountBalance: p.capitalAccountBalance,
          entryDate: p.entryDate,
          status: p.status,
          performance: snapshot
            ? {
                currentValue: snapshot.currentValue,
                distributionsReceived: snapshot.distributionsReceived,
                grossReturn: snapshot.grossReturn,
                netReturn: snapshot.netReturn,
                irr: snapshot.irr,
                moic: snapshot.moic,
                asOfDate: snapshot.asOfDate,
              }
            : null,
          fundMetrics: metrics
            ? {
                navPerUnit: metrics.navPerUnit,
                netIrr: metrics.netIrr,
                moic: metrics.moic,
                dpi: metrics.dpi,
                asOfDate: metrics.asOfDate,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return errorResponse();
  }
}

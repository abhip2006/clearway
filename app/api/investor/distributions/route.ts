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
    const year = searchParams.get('year');

    const where: any = {
      investorId: auth.investor!.id,
    };

    if (fundId) {
      where.distribution = {
        fundId,
      };
    }

    if (year) {
      const yearNum = parseInt(year);
      where.distribution = {
        ...where.distribution,
        distributionDate: {
          gte: new Date(`${yearNum}-01-01`),
          lt: new Date(`${yearNum + 1}-01-01`),
        },
      };
    }

    const distributions = await prisma.investorDistribution.findMany({
      where,
      include: {
        distribution: true,
      },
      orderBy: {
        distribution: {
          distributionDate: 'desc',
        },
      },
    });

    return NextResponse.json({
      distributions: distributions.map(d => ({
        id: d.id,
        fundId: d.distribution.fundId,
        distributionDate: d.distribution.distributionDate,
        paymentDate: d.distribution.paymentDate,
        distributionType: d.distribution.distributionType,
        distributionAmount: d.distributionAmount,
        ordinaryIncome: d.ordinaryIncome,
        longTermCapitalGain: d.longTermCapitalGain,
        shortTermCapitalGain: d.shortTermCapitalGain,
        returnOfCapital: d.returnOfCapital,
        paymentMethod: d.paymentMethod,
        paymentStatus: d.paymentStatus,
        paymentReference: d.paymentReference,
      })),
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return errorResponse();
  }
}

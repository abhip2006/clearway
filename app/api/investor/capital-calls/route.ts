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
    const status = searchParams.get('status');
    const fundId = searchParams.get('fundId');

    const where: any = {
      investorId: auth.investor!.id,
    };

    if (status) {
      where.status = status;
    }

    if (fundId) {
      where.capitalCall = {
        fundId,
      };
    }

    const capitalCalls = await prisma.investorCapitalCallStatus.findMany({
      where,
      include: {
        capitalCall: true,
      },
      orderBy: {
        capitalCall: {
          dueDate: 'desc',
        },
      },
    });

    return NextResponse.json({
      capitalCalls: capitalCalls.map(cc => ({
        id: cc.id,
        callNumber: cc.capitalCall.callNumber,
        fundId: cc.capitalCall.fundId,
        callDate: cc.capitalCall.callDate,
        dueDate: cc.capitalCall.dueDate,
        investorAmount: cc.investorAmount,
        amountPaid: cc.amountPaid,
        status: cc.status,
        paymentDate: cc.paymentDate,
        paymentMethod: cc.paymentMethod,
        paymentReference: cc.paymentReference,
        wireInstructions: cc.capitalCall.wireInstructions,
        referenceCode: cc.capitalCall.referenceCode,
        callType: cc.capitalCall.callType,
      })),
    });
  } catch (error) {
    console.error('Error fetching capital calls:', error);
    return errorResponse();
  }
}

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
    const taxYear = searchParams.get('taxYear');
    const documentType = searchParams.get('documentType');
    const fundId = searchParams.get('fundId');

    const where: any = {
      investorId: auth.investor!.id,
    };

    if (taxYear || documentType || fundId) {
      where.taxDocument = {};
      if (taxYear) {
        where.taxDocument.taxYear = parseInt(taxYear);
      }
      if (documentType) {
        where.taxDocument.documentType = documentType;
      }
      if (fundId) {
        where.taxDocument.fundId = fundId;
      }
    }

    const taxDocuments = await prisma.investorTaxDocument.findMany({
      where,
      include: {
        taxDocument: true,
      },
      orderBy: {
        taxDocument: {
          taxYear: 'desc',
        },
      },
    });

    return NextResponse.json({
      documents: taxDocuments.map(td => ({
        id: td.id,
        fundId: td.taxDocument.fundId,
        taxYear: td.taxDocument.taxYear,
        documentType: td.taxDocument.documentType,
        version: td.taxDocument.version,
        isAmended: td.taxDocument.isAmended,
        availableDate: td.taxDocument.availableDate,
        downloadCount: td.downloadCount,
        lastDownloadDate: td.lastDownloadDate,
        viewedDate: td.viewedDate,
      })),
    });
  } catch (error) {
    console.error('Error fetching tax documents:', error);
    return errorResponse();
  }
}

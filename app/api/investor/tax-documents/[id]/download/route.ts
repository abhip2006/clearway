import { NextRequest, NextResponse } from 'next/server';
import { authenticateInvestor, unauthorizedResponse, errorResponse, forbiddenResponse } from '@/lib/investor/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const { id } = params;

    const taxDoc = await prisma.investorTaxDocument.findFirst({
      where: {
        id,
        investorId: auth.investor!.id,
      },
      include: {
        taxDocument: true,
      },
    });

    if (!taxDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update download count
    await prisma.investorTaxDocument.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadDate: new Date(),
      },
    });

    // Log access
    await prisma.investorAccessAuditLog.create({
      data: {
        investorId: auth.investor!.id,
        action: 'DOWNLOAD_TAX_DOCUMENT',
        resourceType: 'TAX_DOCUMENT',
        resourceId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        status: 'SUCCESS',
      },
    });

    // Return download URL (in production, generate signed S3 URL)
    return NextResponse.json({
      downloadUrl: taxDoc.taxDocument.filePath,
      fileName: `${taxDoc.taxDocument.documentType}_${taxDoc.taxDocument.taxYear}.pdf`,
    });
  } catch (error) {
    console.error('Error downloading tax document:', error);
    return errorResponse();
  }
}

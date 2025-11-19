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
    const category = searchParams.get('category');
    const fundId = searchParams.get('fundId');

    const where: any = {
      isArchived: false,
      OR: [
        { expiresDate: null },
        { expiresDate: { gt: new Date() } },
      ],
    };

    if (category) {
      where.category = category;
    }

    if (fundId) {
      where.OR = [
        { fundId },
        { fundId: null }, // Include general announcements
      ];
    }

    const announcements = await prisma.investorAnnouncement.findMany({
      where,
      orderBy: {
        publishedDate: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      announcements: announcements.map(a => ({
        id: a.id,
        fundId: a.fundId,
        title: a.title,
        content: a.content,
        announcementType: a.announcementType,
        category: a.category,
        publishedDate: a.publishedDate,
        attachmentUrls: a.attachmentUrls,
      })),
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return errorResponse();
  }
}

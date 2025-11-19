// GET /api/languages
// Get all supported languages
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const languages = await prisma.language.findMany({
      where: { enabled: true },
      select: {
        id: true,
        code: true,
        name: true,
        nativeName: true,
        rtl: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      languages,
      total: languages.length,
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch languages' },
      { status: 500 }
    );
  }
}

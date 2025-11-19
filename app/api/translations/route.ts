// GET /api/translations
// Get translated strings for a specific namespace and language
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const namespace = searchParams.get('namespace');
    const languageCode = searchParams.get('lang') || 'en';

    if (!namespace) {
      return NextResponse.json(
        { error: 'Missing namespace parameter' },
        { status: 400 }
      );
    }

    // Get language
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
    });

    if (!language) {
      return NextResponse.json(
        { error: 'Language not found' },
        { status: 404 }
      );
    }

    // Get approved translations
    const translations = await prisma.translationString.findMany({
      where: {
        namespace,
        languageId: language.id,
        reviewStatus: 'approved',
      },
    });

    // Convert to key-value object
    const result = translations.reduce((acc, t) => {
      acc[t.keyPath] = t.translationText;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      namespace,
      language: languageCode,
      translations: result,
      count: translations.length,
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch translations' },
      { status: 500 }
    );
  }
}

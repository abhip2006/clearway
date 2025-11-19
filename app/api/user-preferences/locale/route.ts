// POST /api/user-preferences/locale
// Set user language, currency, and timezone preferences
// GET /api/user-preferences/locale
// Get user locale preferences
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const LocalePreferencesSchema = z.object({
  languageCode: z.string().min(2).max(5), // en or zh-CN
  currencyCode: z.string().length(3),
  timezone: z.string(),
  dateFormat: z.string().optional(),
  numberFormat: z.string().optional(),
  localeCountry: z.string().length(2).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const body = await req.json();
    const prefs = LocalePreferencesSchema.parse(body);

    // Validate language and currency exist
    const language = await prisma.language.findUnique({
      where: { code: prefs.languageCode },
    });
    const currency = await prisma.currency.findUnique({
      where: { code: prefs.currencyCode },
    });

    if (!language || !currency) {
      return NextResponse.json(
        { error: 'Invalid language or currency code' },
        { status: 400 }
      );
    }

    // Upsert user preferences
    const updated = await prisma.userLocalePreference.upsert({
      where: { userId },
      create: {
        userId,
        languageId: language.id,
        currencyId: currency.id,
        timezone: prefs.timezone,
        dateFormat: prefs.dateFormat,
        numberFormat: prefs.numberFormat,
        localeCountry: prefs.localeCountry,
      },
      update: {
        languageId: language.id,
        currencyId: currency.id,
        timezone: prefs.timezone,
        dateFormat: prefs.dateFormat,
        numberFormat: prefs.numberFormat,
        localeCountry: prefs.localeCountry,
      },
      include: {
        language: true,
        currency: true,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: {
        language: {
          code: updated.language.code,
          name: updated.language.name,
          nativeName: updated.language.nativeName,
        },
        currency: {
          code: updated.currency.code,
          name: updated.currency.name,
          symbol: updated.currency.symbol,
        },
        timezone: updated.timezone,
        dateFormat: updated.dateFormat,
        numberFormat: updated.numberFormat,
        localeCountry: updated.localeCountry,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating locale preferences:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const preferences = await prisma.userLocalePreference.findUnique({
      where: { userId },
      include: {
        language: true,
        currency: true,
      },
    });

    if (!preferences) {
      return NextResponse.json({
        success: false,
        message: 'No preferences set',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        language: {
          code: preferences.language.code,
          name: preferences.language.name,
          nativeName: preferences.language.nativeName,
        },
        currency: {
          code: preferences.currency.code,
          name: preferences.currency.name,
          symbol: preferences.currency.symbol,
        },
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat,
        numberFormat: preferences.numberFormat,
        localeCountry: preferences.localeCountry,
      },
    });
  } catch (error) {
    console.error('Error fetching locale preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

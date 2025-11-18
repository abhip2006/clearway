// Seasonal Patterns API
// Task AN-003: Predictive Analytics Engine

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { CashflowForecastService } from '@/lib/analytics/predictive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const forecastService = new CashflowForecastService();
    const patterns = await forecastService.detectSeasonalPatterns(user.id);

    return Response.json(patterns);
  } catch (error) {
    console.error('Patterns API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

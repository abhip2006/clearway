// app/api/tax/export/summary/[taxYear]/route.ts
// Export tax summary report

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { exportTaxSummary } from '@/lib/tax/turbotax-export';

export async function GET(
  request: NextRequest,
  { params }: { params: { taxYear: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const taxYear = parseInt(params.taxYear);

    // Generate summary
    const summary = await exportTaxSummary(user.id, taxYear);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Tax summary export error:', error);
    return NextResponse.json(
      { error: 'Failed to export tax summary' },
      { status: 500 }
    );
  }
}

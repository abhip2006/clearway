// app/api/tax/export/turbotax/[taxYear]/route.ts
// Export K-1 data to TurboTax format

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { exportToTurboTax } from '@/lib/tax/turbotax-export';

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

    // Generate TurboTax export
    const txfContent = await exportToTurboTax(user.id, taxYear);

    // Return as downloadable file
    return new NextResponse(txfContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="K1_Export_${taxYear}.txf"`,
      },
    });
  } catch (error) {
    console.error('TurboTax export error:', error);
    return NextResponse.json(
      { error: 'Failed to export to TurboTax' },
      { status: 500 }
    );
  }
}

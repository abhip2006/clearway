// app/api/tax/k1/[id]/distribute/route.ts
// Distribute K-1 to investor

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { distributeK1ByEmail } from '@/lib/tax/email-distribution';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taxDocument = await db.taxDocument.findUnique({
      where: { id: params.id },
      include: {
        document: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!taxDocument) {
      return NextResponse.json({ error: 'K-1 not found' }, { status: 404 });
    }

    if (taxDocument.status !== 'VALIDATED') {
      return NextResponse.json(
        { error: 'K-1 must be validated before distribution' },
        { status: 400 }
      );
    }

    // Distribute via email
    const result = await distributeK1ByEmail(
      params.id,
      taxDocument.document.user.email,
      taxDocument.document.user.name || 'Investor'
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Distribute K-1 error:', error);
    return NextResponse.json(
      { error: 'Failed to distribute K-1' },
      { status: 500 }
    );
  }
}

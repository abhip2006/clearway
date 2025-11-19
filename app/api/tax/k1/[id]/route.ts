// app/api/tax/k1/[id]/route.ts
// Get, update, validate, distribute, amend K-1

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { validateK1 } from '@/lib/tax/k1-validation';
import { distributeK1ByEmail } from '@/lib/tax/email-distribution';

export async function GET(
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
        document: true,
        distributions: true,
      },
    });

    if (!taxDocument) {
      return NextResponse.json({ error: 'K-1 not found' }, { status: 404 });
    }

    return NextResponse.json(taxDocument);
  } catch (error) {
    console.error('Get K-1 error:', error);
    return NextResponse.json({ error: 'Failed to get K-1' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { k1Data } = body;

    const taxDocument = await db.taxDocument.update({
      where: { id: params.id },
      data: {
        k1Data,
        status: 'EXTRACTED',
      },
    });

    return NextResponse.json(taxDocument);
  } catch (error) {
    console.error('Update K-1 error:', error);
    return NextResponse.json({ error: 'Failed to update K-1' }, { status: 500 });
  }
}

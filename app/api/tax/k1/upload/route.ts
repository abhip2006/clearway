// app/api/tax/k1/upload/route.ts
// Upload K-1 document and trigger extraction

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { extractK1 } from '@/lib/ai/k1-extract';
import { inngest } from '@/lib/inngest';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, fundId, investorId, taxYear } = body;

    if (!documentId || !fundId || !investorId || !taxYear) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create tax document record
    const taxDocument = await db.taxDocument.create({
      data: {
        documentId,
        fundId,
        investorId,
        taxYear,
        formType: 'K1_1065', // Will be detected by AI
        status: 'PENDING_EXTRACTION',
        createdBy: userId,
      },
    });

    // Trigger async K-1 extraction via Inngest
    await inngest.send({
      name: 'tax/k1.extract',
      data: {
        taxDocumentId: taxDocument.id,
        documentId,
      },
    });

    return NextResponse.json({
      success: true,
      taxDocumentId: taxDocument.id,
      status: 'PENDING_EXTRACTION',
    });
  } catch (error) {
    console.error('K-1 upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload K-1' },
      { status: 500 }
    );
  }
}

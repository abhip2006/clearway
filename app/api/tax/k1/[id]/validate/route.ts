// app/api/tax/k1/[id]/validate/route.ts
// Validate K-1 document

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { validateK1 } from '@/lib/tax/k1-validation';
import { K1Extraction } from '@/lib/ai/k1-extract';

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
    });

    if (!taxDocument || !taxDocument.k1Data) {
      return NextResponse.json({ error: 'K-1 not found' }, { status: 404 });
    }

    // Validate K-1
    const validationResult = await validateK1(
      taxDocument.k1Data as K1Extraction,
      params.id
    );

    // Update tax document with validation results
    await db.taxDocument.update({
      where: { id: params.id },
      data: {
        status: validationResult.isValid ? 'VALIDATED' : 'PENDING_VALIDATION',
        validationErrors: {
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        },
        requiresReview: !validationResult.isValid,
      },
    });

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('Validate K-1 error:', error);
    return NextResponse.json(
      { error: 'Failed to validate K-1' },
      { status: 500 }
    );
  }
}

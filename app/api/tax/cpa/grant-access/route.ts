// app/api/tax/cpa/grant-access/route.ts
// Grant CPA access to tax documents

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { cpaFirmName, cpaEmail, cpaPhone, accessLevel, expiresAt } = body;

    const cpaAccess = await db.cPAAccess.create({
      data: {
        organizationId: user.organizationId,
        cpaFirmName,
        cpaEmail,
        cpaPhone,
        accessLevel: accessLevel || 'READ_ONLY',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowedIps: [],
      },
    });

    return NextResponse.json(cpaAccess);
  } catch (error) {
    console.error('Grant CPA access error:', error);
    return NextResponse.json(
      { error: 'Failed to grant CPA access' },
      { status: 500 }
    );
  }
}

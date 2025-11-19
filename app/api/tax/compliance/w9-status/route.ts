// app/api/tax/compliance/w9-status/route.ts
// W-9 compliance report

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 400 }
      );
    }

    // Get all users in organization with their tax profiles
    const orgUsers = await db.user.findMany({
      where: { organizationId: user.organizationId },
      include: { taxProfile: true },
    });

    const w9Status = {
      total: orgUsers.length,
      received: 0,
      missing: 0,
      missingInvestors: [] as Array<{
        name: string;
        email: string;
        lastContacted: Date | null;
      }>,
    };

    for (const orgUser of orgUsers) {
      if (orgUser.taxProfile?.w9Received) {
        w9Status.received++;
      } else {
        w9Status.missing++;
        w9Status.missingInvestors.push({
          name: orgUser.name || 'Unknown',
          email: orgUser.email,
          lastContacted: null,
        });
      }
    }

    return NextResponse.json(w9Status);
  } catch (error) {
    console.error('W-9 status error:', error);
    return NextResponse.json(
      { error: 'Failed to get W-9 status' },
      { status: 500 }
    );
  }
}

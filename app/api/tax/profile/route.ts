// app/api/tax/profile/route.ts
// Get and update tax profile

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        taxProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user.taxProfile || {});
  } catch (error) {
    console.error('Get tax profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get tax profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const {
      taxIdType,
      taxId,
      entityType,
      preferredFormat,
      cpaEmail,
      cpaCopiesEnabled,
    } = body;

    const taxProfile = await db.taxProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        taxIdType,
        taxId,
        entityType,
        preferredFormat,
        cpaEmail,
        cpaCopiesEnabled,
      },
      update: {
        taxIdType,
        taxId,
        entityType,
        preferredFormat,
        cpaEmail,
        cpaCopiesEnabled,
      },
    });

    return NextResponse.json(taxProfile);
  } catch (error) {
    console.error('Update tax profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update tax profile' },
      { status: 500 }
    );
  }
}

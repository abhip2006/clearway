// Security & Compliance Agent - Audit Logs Statistics API Route
// Get audit log statistics and metrics

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AuditLogger } from '@/lib/security/audit-logger';
import { db } from '@/lib/db';

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get audit statistics
    const stats = await AuditLogger.getAuditStats({
      userId: user.id,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Audit logs stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get audit log statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

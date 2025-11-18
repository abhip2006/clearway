// Security & Compliance Agent - Audit Logs API Route
// Search and retrieve audit logs

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AuditLogger, AuditAction } from '@/lib/security/audit-logger';
import { db } from '@/lib/db';

/**
 * GET /api/audit-logs
 * Search audit logs for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const actions = searchParams.get('actions')?.split(',') as AuditAction[] | undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;
    const securityLevel = searchParams.get('securityLevel')?.split(',') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is admin (can see all logs)
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        members: {
          include: { organization: true },
        },
      },
    });

    const isAdmin =
      user?.members.some((m) => m.role === 'ADMIN' || m.role === 'OWNER') || false;

    // Search audit logs
    const result = await AuditLogger.searchAuditLogs({
      userId: isAdmin ? undefined : user?.id, // Admins can see all logs
      actions,
      entityType,
      entityId,
      startDate,
      endDate,
      securityLevel: securityLevel as any,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error) {
    console.error('Audit logs search error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

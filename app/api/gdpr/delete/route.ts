// Security & Compliance Agent - Data Deletion API Route
// Right to be Forgotten (GDPR Article 17)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GDPRComplianceService } from '@/lib/security/gdpr';
import { AuditLogger, AuditAction } from '@/lib/security/audit-logger';
import { generateDeviceFingerprint } from '@/lib/security/encryption';

const gdprService = new GDPRComplianceService();

/**
 * POST /api/gdpr/delete
 * Delete/anonymize all personal data for a user
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const reason = body.reason || 'User requested deletion';

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason for deletion is required' },
        { status: 400 }
      );
    }

    // Get user's IP and context
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;
    const deviceFingerprint = generateDeviceFingerprint(req);

    // Log the deletion request (before actual deletion)
    await AuditLogger.log({
      action: AuditAction.DATA_DELETION_REQUESTED,
      entityType: 'USER',
      entityId: userId,
      metadata: {
        reason,
        requestedBy: userId,
      },
      context: {
        userId,
        ipAddress,
        userAgent,
        deviceFingerprint,
      },
      securityLevel: 'CRITICAL',
    });

    // Perform deletion
    await gdprService.deletePersonalData(userId, reason, userId);

    return NextResponse.json({
      success: true,
      message: 'Your data has been deleted/anonymized successfully',
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Data deletion error:', error);

    // Check for known error types
    if (error instanceof Error) {
      if (error.message.includes('legal hold')) {
        return NextResponse.json(
          {
            error: 'Cannot delete data',
            message: error.message,
            reason: 'legal_hold',
          },
          { status: 403 }
        );
      }

      if (error.message.includes('active capital calls')) {
        return NextResponse.json(
          {
            error: 'Cannot delete data',
            message: error.message,
            reason: 'active_obligations',
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to delete data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

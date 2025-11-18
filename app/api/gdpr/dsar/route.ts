// Security & Compliance Agent - DSAR API Route
// Data Subject Access Request (GDPR Article 15)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GDPRComplianceService } from '@/lib/security/gdpr';
import { AuditLogger, AuditAction } from '@/lib/security/audit-logger';
import { generateDeviceFingerprint } from '@/lib/security/encryption';

const gdprService = new GDPRComplianceService();

/**
 * GET /api/gdpr/dsar
 * Get Data Subject Access Request for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's IP and context
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;
    const deviceFingerprint = generateDeviceFingerprint(req);

    // Log the DSAR request
    await AuditLogger.log({
      action: AuditAction.DSAR_REQUESTED,
      entityType: 'USER',
      entityId: userId,
      metadata: { requestType: 'access' },
      context: {
        userId,
        ipAddress,
        userAgent,
        deviceFingerprint,
      },
      securityLevel: 'HIGH',
    });

    // Fetch all personal data
    const dsarData = await gdprService.handleDSAR(userId);

    return NextResponse.json({
      success: true,
      data: dsarData,
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DSAR request error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process DSAR request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

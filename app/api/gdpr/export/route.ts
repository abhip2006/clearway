// Security & Compliance Agent - Data Export API Route
// Data Portability (GDPR Article 20)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GDPRComplianceService } from '@/lib/security/gdpr';
import { AuditLogger, AuditAction } from '@/lib/security/audit-logger';
import { generateDeviceFingerprint } from '@/lib/security/encryption';

const gdprService = new GDPRComplianceService();

/**
 * POST /api/gdpr/export
 * Export all personal data in JSON or CSV format
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const format = (body.format || 'JSON').toUpperCase() as 'JSON' | 'CSV';

    if (format !== 'JSON' && format !== 'CSV') {
      return NextResponse.json(
        { error: 'Invalid format. Must be JSON or CSV' },
        { status: 400 }
      );
    }

    // Get user's IP and context
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;
    const deviceFingerprint = generateDeviceFingerprint(req);

    // Log the export request
    await AuditLogger.log({
      action: AuditAction.DATA_EXPORTED,
      entityType: 'USER',
      entityId: userId,
      metadata: { format },
      context: {
        userId,
        ipAddress,
        userAgent,
        deviceFingerprint,
      },
      securityLevel: 'HIGH',
    });

    // Export data
    const exportBuffer = await gdprService.exportPersonalData(userId, format);

    // Set appropriate content type and headers
    const contentType = format === 'JSON' ? 'application/json' : 'text/csv';
    const fileName = `clearway-data-export-${userId}-${Date.now()}.${format.toLowerCase()}`;

    return new NextResponse(exportBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

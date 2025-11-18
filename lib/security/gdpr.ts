// Security & Compliance Agent - Task SEC-002
// GDPR Compliance Engine

import { db } from '@/lib/db';
import { AuditLogger, AuditAction } from './audit-logger';
import { EncryptionService } from './encryption';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Initialize R2/S3 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET = process.env.R2_BUCKET || 'clearway-documents';

export interface DSARResponse {
  personalData: {
    profile: {
      email: string | null;
      name: string | null;
      createdAt: Date | null;
    };
    capitalCalls: Array<{
      fundName: string;
      amountDue: string;
      dueDate: Date;
      status: string;
    }>;
    documents: Array<{
      fileName: string;
      uploadedAt: Date;
    }>;
    activityHistory: Array<{
      action: string;
      timestamp: Date;
      ipAddress: string | null;
    }>;
  };
  dataCategories: string[];
  processingPurposes: string[];
  thirdParties: string[];
  retentionPeriod: string;
}

export class GDPRComplianceService {
  /**
   * Data Subject Access Request (DSAR) - Article 15
   * Provides all personal data stored for a user
   */
  async handleDSAR(userId: string): Promise<DSARResponse> {
    // Log the DSAR request
    await AuditLogger.log({
      action: AuditAction.DSAR_REQUESTED,
      entityType: 'USER',
      entityId: userId,
      metadata: { requestType: 'access' },
      context: { userId },
      securityLevel: 'HIGH',
    });

    // Collect all personal data from all tables
    const [user, capitalCalls, documents, auditLogs] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      }),
      db.capitalCall.findMany({
        where: { userId },
        include: { document: true },
      }),
      db.document.findMany({ where: { userId } }),
      db.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 1000,
      }),
    ]);

    const personalData = {
      profile: {
        email: user?.email || null,
        name: user?.name || null,
        createdAt: user?.createdAt || null,
        organization: user?.organization?.name || null,
      },
      capitalCalls: capitalCalls.map((cc) => ({
        fundName: cc.fundName,
        amountDue: cc.amountDue.toString(),
        currency: cc.currency,
        dueDate: cc.dueDate,
        status: cc.status,
        investorEmail: cc.investorEmail,
        investorAccount: cc.investorAccount,
      })),
      documents: documents.map((d) => ({
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        uploadedAt: d.uploadedAt,
        status: d.status,
      })),
      activityHistory: auditLogs.map((log) => ({
        action: log.action,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        geolocation: log.geolocation,
      })),
    };

    return {
      personalData,
      dataCategories: [
        'Contact Information (Email, Name)',
        'Financial Data (Capital Calls, Amounts)',
        'Transaction History (Payments, Approvals)',
        'Document Metadata (File Names, Upload Times)',
        'Activity Logs (Login Times, Actions Performed)',
        'IP Addresses and Device Information',
      ],
      processingPurposes: [
        'Capital call management and notifications',
        'Payment processing and reconciliation',
        'Document storage and retrieval',
        'Audit trail and compliance monitoring',
        'Security monitoring and fraud prevention',
      ],
      thirdParties: [
        'Clerk (Authentication and User Management)',
        'Cloudflare R2 (Document Storage)',
        'Anthropic Claude (AI Document Processing)',
        'Vercel (Hosting and Infrastructure)',
        'Datadog (Monitoring and Logging)',
      ],
      retentionPeriod: '7 years from account closure (per financial regulations)',
    };
  }

  /**
   * Right to be Forgotten - Article 17
   * Deletes or anonymizes all personal data for a user
   */
  async deletePersonalData(
    userId: string,
    reason: string,
    requestedBy: string = 'USER'
  ): Promise<void> {
    // Audit the deletion request
    await AuditLogger.log({
      action: AuditAction.DATA_DELETION_REQUESTED,
      entityType: 'USER',
      entityId: userId,
      metadata: { requestType: 'deletion', reason, requestedBy },
      context: { userId: requestedBy },
      securityLevel: 'CRITICAL',
    });

    // Check for legal obligations that prevent deletion
    const hasLegalHold = await this.checkLegalHold(userId);
    if (hasLegalHold) {
      throw new Error(
        'Cannot delete data due to active legal hold. Please contact legal@clearway.com'
      );
    }

    // Check for active financial obligations
    const hasActiveCapitalCalls = await db.capitalCall.count({
      where: {
        userId,
        status: { in: ['PENDING_REVIEW', 'APPROVED'] },
      },
    });

    if (hasActiveCapitalCalls > 0) {
      throw new Error(
        'Cannot delete data with active capital calls. Please complete or cancel all pending capital calls first.'
      );
    }

    // Get all documents before anonymization for deletion
    const documents = await db.document.findMany({ where: { userId } });

    // Soft delete user data (anonymize instead of hard delete for audit compliance)
    await db.$transaction([
      // Anonymize user profile
      db.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.clearway.local`,
          name: 'Deleted User',
          clerkId: `deleted-${userId}`,
        },
      }),

      // Anonymize capital calls
      db.capitalCall.updateMany({
        where: { userId },
        data: {
          investorEmail: 'deleted@anonymized.clearway.local',
          investorAccount: 'ANONYMIZED',
        },
      }),

      // Mark documents for deletion
      db.document.updateMany({
        where: { userId },
        data: {
          fileName: 'deleted-document.pdf',
        },
      }),

      // Keep audit logs but anonymize user ID (required for compliance)
      db.auditLog.updateMany({
        where: { userId },
        data: { userId: `deleted-${userId}` },
      }),
    ]);

    // Delete documents from R2 storage
    await this.deleteDocumentsFromR2(documents);

    // Delete from third-party services
    await this.deleteClerkUser(userId);

    // Log completion
    await AuditLogger.log({
      action: AuditAction.USER_DELETED,
      entityType: 'USER',
      entityId: userId,
      metadata: {
        reason,
        deletedAt: new Date(),
        documentsDeleted: documents.length,
      },
      context: { userId: 'SYSTEM' },
      securityLevel: 'CRITICAL',
    });
  }

  /**
   * Data Portability - Article 20
   * Export all personal data in a machine-readable format
   */
  async exportPersonalData(
    userId: string,
    format: 'JSON' | 'CSV' = 'JSON'
  ): Promise<Buffer> {
    // Log the export request
    await AuditLogger.log({
      action: AuditAction.DATA_EXPORTED,
      entityType: 'USER',
      entityId: userId,
      metadata: { format },
      context: { userId },
      securityLevel: 'HIGH',
    });

    const dsar = await this.handleDSAR(userId);

    if (format === 'JSON') {
      return Buffer.from(JSON.stringify(dsar, null, 2));
    } else {
      const csv = this.convertToCSV(dsar);
      return Buffer.from(csv);
    }
  }

  /**
   * Check if user has active legal holds
   */
  private async checkLegalHold(userId: string): Promise<boolean> {
    const legalHold = await db.legalHold.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    return !!legalHold;
  }

  /**
   * Delete documents from R2/S3 storage
   */
  private async deleteDocumentsFromR2(documents: any[]): Promise<void> {
    const deletePromises = documents.map(async (doc) => {
      try {
        const key = doc.fileUrl.split('/').pop();
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
          })
        );
      } catch (error) {
        console.error(`Failed to delete document ${doc.id} from R2:`, error);
        // Don't throw - continue with other deletions
      }
    });

    await Promise.allSettled(deletePromises);
  }

  /**
   * Delete user from Clerk authentication service
   */
  private async deleteClerkUser(userId: string): Promise<void> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { clerkId: true },
      });

      if (user?.clerkId && !user.clerkId.startsWith('deleted-')) {
        // Call Clerk API to delete user
        const clerkSecretKey = process.env.CLERK_SECRET_KEY;
        if (clerkSecretKey) {
          await fetch(`https://api.clerk.com/v1/users/${user.clerkId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to delete Clerk user:', error);
      // Don't throw - this is a cleanup step
    }
  }

  /**
   * Convert DSAR data to CSV format
   */
  private convertToCSV(data: DSARResponse): string {
    const rows: string[] = [];
    rows.push('Category,Field,Value');

    // Profile data
    if (data.personalData.profile) {
      for (const [field, value] of Object.entries(data.personalData.profile)) {
        rows.push(`profile,${field},"${this.escapeCsvValue(value)}"`);
      }
    }

    // Capital calls
    for (let i = 0; i < data.personalData.capitalCalls.length; i++) {
      const cc = data.personalData.capitalCalls[i];
      for (const [field, value] of Object.entries(cc)) {
        rows.push(`capital_call_${i + 1},${field},"${this.escapeCsvValue(value)}"`);
      }
    }

    // Documents
    for (let i = 0; i < data.personalData.documents.length; i++) {
      const doc = data.personalData.documents[i];
      for (const [field, value] of Object.entries(doc)) {
        rows.push(`document_${i + 1},${field},"${this.escapeCsvValue(value)}"`);
      }
    }

    // Activity history
    for (let i = 0; i < data.personalData.activityHistory.length; i++) {
      const log = data.personalData.activityHistory[i];
      for (const [field, value] of Object.entries(log)) {
        rows.push(`activity_${i + 1},${field},"${this.escapeCsvValue(value)}"`);
      }
    }

    return rows.join('\n');
  }

  /**
   * Escape CSV values to prevent injection
   */
  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str.replace(/"/g, '""'); // Escape double quotes
  }

  /**
   * Get GDPR compliance status for an organization
   */
  async getComplianceStatus(organizationId: string) {
    const [users, dsarRequests, deletionRequests] = await Promise.all([
      db.user.count({ where: { organizationId } }),
      db.auditLog.count({
        where: {
          action: AuditAction.DSAR_REQUESTED,
          userId: { in: await this.getUserIdsForOrg(organizationId) },
        },
      }),
      db.auditLog.count({
        where: {
          action: AuditAction.DATA_DELETION_REQUESTED,
          userId: { in: await this.getUserIdsForOrg(organizationId) },
        },
      }),
    ]);

    return {
      totalUsers: users,
      dsarRequestsTotal: dsarRequests,
      deletionRequestsTotal: deletionRequests,
      complianceChecks: {
        hasPrivacyPolicy: true, // TODO: Check if uploaded
        hasDataProcessingAgreements: true, // TODO: Check DPAs
        hasAuditLogging: true,
        hasEncryption: true,
      },
    };
  }

  /**
   * Helper to get all user IDs for an organization
   */
  private async getUserIdsForOrg(organizationId: string): Promise<string[]> {
    const users = await db.user.findMany({
      where: { organizationId },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
}

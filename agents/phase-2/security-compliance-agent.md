# Security & Compliance Agent 🔒

## Role
Specialized agent responsible for SOC 2 compliance, data encryption, audit logging, GDPR compliance, penetration testing, security monitoring, and enterprise-grade security controls. Ensures Clearway meets institutional investor security requirements.

## Primary Responsibilities

1. **SOC 2 Type II Compliance**
   - Security controls implementation
   - Access control policies
   - Data encryption at rest and in transit
   - Audit logging infrastructure
   - Vendor risk management
   - Compliance documentation

2. **Data Privacy & GDPR**
   - Personal data inventory
   - Data subject access requests (DSAR)
   - Right to be forgotten implementation
   - Consent management
   - Data processing agreements
   - Privacy policy automation

3. **Security Monitoring**
   - Real-time threat detection
   - Anomaly detection (login attempts, API abuse)
   - Security event correlation
   - Incident response automation
   - Vulnerability scanning
   - Penetration testing

4. **Access Control & Identity**
   - Role-based access control (RBAC)
   - Multi-factor authentication (MFA) enforcement
   - Session management
   - IP whitelisting
   - Device fingerprinting
   - Privileged access management

5. **Audit & Compliance Reporting**
   - Comprehensive audit trails
   - Compliance dashboards
   - SOC 2 evidence collection
   - Quarterly compliance reports
   - Change management logs

## Tech Stack

### Security Tools
- **Snyk** for dependency vulnerability scanning
- **OWASP ZAP** for penetration testing
- **HashiCorp Vault** for secrets management
- **AWS KMS** for encryption key management

### Monitoring & SIEM
- **Datadog Security Monitoring**
- **AWS GuardDuty**
- **CloudTrail** for AWS audit logs
- **Splunk** for log aggregation

### Compliance
- **Vanta** or **Drata** for SOC 2 automation
- **OneTrust** for privacy management

## Phase 2 Features

### Week 13-14: SOC 2 Controls Implementation

**Task SEC-001: Comprehensive Audit Logging**
```typescript
// lib/security/audit-logger.ts

import { db } from '@/lib/db';
import { z } from 'zod';

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',

  CAPITAL_CALL_VIEWED = 'CAPITAL_CALL_VIEWED',
  CAPITAL_CALL_APPROVED = 'CAPITAL_CALL_APPROVED',
  CAPITAL_CALL_REJECTED = 'CAPITAL_CALL_REJECTED',
  CAPITAL_CALL_EXPORTED = 'CAPITAL_CALL_EXPORTED',

  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  PAYMENT_RECONCILED = 'PAYMENT_RECONCILED',

  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',

  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',

  DATA_EXPORTED = 'DATA_EXPORTED',
  DSAR_REQUESTED = 'DSAR_REQUESTED',
}

interface AuditContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: {
    country: string;
    city?: string;
  };
  deviceFingerprint?: string;
}

export class AuditLogger {
  static async log(params: {
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
    context: AuditContext;
    securityLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }) {
    // Determine security level if not provided
    const securityLevel = params.securityLevel || this.getDefaultSecurityLevel(params.action);

    // Create audit log entry
    const auditLog = await db.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.context.userId,
        sessionId: params.context.sessionId,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
        geolocation: params.context.geolocation,
        deviceFingerprint: params.context.deviceFingerprint,
        metadata: params.metadata,
        securityLevel,
        timestamp: new Date(),
      },
    });

    // Alert on critical actions
    if (securityLevel === 'CRITICAL') {
      await this.sendSecurityAlert(auditLog);
    }

    // Stream to SIEM (Datadog, Splunk, etc.)
    await this.streamToSIEM(auditLog);

    return auditLog;
  }

  private static getDefaultSecurityLevel(action: AuditAction): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalActions = [
      AuditAction.USER_DELETED,
      AuditAction.API_KEY_CREATED,
      AuditAction.DATA_EXPORTED,
      AuditAction.DOCUMENT_DELETED,
    ];

    const highActions = [
      AuditAction.CAPITAL_CALL_APPROVED,
      AuditAction.PAYMENT_RECORDED,
      AuditAction.SETTINGS_CHANGED,
    ];

    const mediumActions = [
      AuditAction.CAPITAL_CALL_VIEWED,
      AuditAction.DOCUMENT_UPLOADED,
      AuditAction.USER_LOGIN,
    ];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highActions.includes(action)) return 'HIGH';
    if (mediumActions.includes(action)) return 'MEDIUM';
    return 'LOW';
  }

  private static async sendSecurityAlert(auditLog: any) {
    // Send to security team via PagerDuty/Slack
    await fetch(process.env.PAGERDUTY_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        payload: {
          summary: `Critical Security Event: ${auditLog.action}`,
          severity: 'critical',
          source: 'Clearway Audit Logger',
          custom_details: auditLog,
        },
      }),
    });
  }

  private static async streamToSIEM(auditLog: any) {
    // Send to Datadog
    if (process.env.DATADOG_API_KEY) {
      await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
        method: 'POST',
        headers: {
          'DD-API-KEY': process.env.DATADOG_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ddsource: 'clearway-audit',
          ddtags: `env:production,action:${auditLog.action}`,
          hostname: 'clearway-api',
          message: JSON.stringify(auditLog),
        }),
      });
    }
  }

  static async searchAuditLogs(params: {
    userId?: string;
    actions?: AuditAction[];
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    securityLevel?: string[];
    ipAddress?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (params.userId) where.userId = params.userId;
    if (params.actions) where.action = { in: params.actions };
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.securityLevel) where.securityLevel = { in: params.securityLevel };
    if (params.ipAddress) where.ipAddress = params.ipAddress;

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = params.startDate;
      if (params.endDate) where.timestamp.lte = params.endDate;
    }

    return db.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
    });
  }
}
```

**Task SEC-002: GDPR Compliance Engine**
```typescript
// lib/security/gdpr.ts

export class GDPRComplianceService {
  /**
   * Data Subject Access Request (DSAR) - Article 15
   */
  async handleDSAR(userId: string): Promise<{
    personalData: any;
    dataCategories: string[];
    processingPurposes: string[];
    thirdParties: string[];
    retentionPeriod: string;
  }> {
    // Collect all personal data
    const [user, capitalCalls, payments, documents, auditLogs] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.capitalCall.findMany({ where: { userId } }),
      db.payment.findMany({ where: { userId } }),
      db.document.findMany({ where: { userId } }),
      db.auditLog.findMany({ where: { userId }, take: 1000 }),
    ]);

    const personalData = {
      profile: {
        email: user?.email,
        name: user?.name,
        createdAt: user?.createdAt,
      },
      capitalCalls: capitalCalls.map(cc => ({
        fundName: cc.fundName,
        amountDue: cc.amountDue,
        dueDate: cc.dueDate,
        status: cc.status,
      })),
      payments: payments.map(p => ({
        amount: p.amount,
        paidAt: p.paidAt,
        paymentMethod: p.paymentMethod,
      })),
      documents: documents.map(d => ({
        fileName: d.fileName,
        uploadedAt: d.createdAt,
      })),
      activityHistory: auditLogs.map(log => ({
        action: log.action,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
      })),
    };

    return {
      personalData,
      dataCategories: [
        'Contact Information',
        'Financial Data',
        'Transaction History',
        'Document Metadata',
        'Activity Logs',
      ],
      processingPurposes: [
        'Capital call management',
        'Payment processing',
        'Document storage',
        'Audit and compliance',
      ],
      thirdParties: [
        'Clerk (Authentication)',
        'Cloudflare R2 (Document Storage)',
        'Stripe (Payment Processing)',
        'Plaid (Bank Account Connection)',
      ],
      retentionPeriod: '7 years (per financial regulations)',
    };
  }

  /**
   * Right to be Forgotten - Article 17
   */
  async deletePersonalData(userId: string, reason: string): Promise<void> {
    // Audit the deletion request
    await AuditLogger.log({
      action: AuditAction.DSAR_REQUESTED,
      entityType: 'USER',
      entityId: userId,
      metadata: { requestType: 'deletion', reason },
      context: { userId },
      securityLevel: 'CRITICAL',
    });

    // Check for legal obligations that prevent deletion
    const hasLegalHold = await this.checkLegalHold(userId);
    if (hasLegalHold) {
      throw new Error('Cannot delete data due to legal hold');
    }

    // Soft delete user data (anonymize instead of hard delete for compliance)
    await db.$transaction([
      // Anonymize user
      db.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.local`,
          name: 'Deleted User',
          clerkId: `deleted-${userId}`,
        },
      }),

      // Anonymize capital calls
      db.capitalCall.updateMany({
        where: { userId },
        data: {
          investorEmail: 'deleted@anonymized.local',
          investorAccount: 'ANONYMIZED',
        },
      }),

      // Delete documents from storage
      // (Handled by separate job to delete from R2)

      // Keep audit logs but anonymize user ID
      db.auditLog.updateMany({
        where: { userId },
        data: { userId: `deleted-${userId}` },
      }),
    ]);

    // Delete documents from R2
    const documents = await db.document.findMany({ where: { userId } });
    for (const doc of documents) {
      await this.deleteFromR2(doc.fileUrl);
    }

    // Delete from third-party services
    await this.deletePlaidData(userId);
    await this.deleteStripeData(userId);

    // Log completion
    await AuditLogger.log({
      action: AuditAction.USER_DELETED,
      entityType: 'USER',
      entityId: userId,
      metadata: { reason, deletedAt: new Date() },
      context: { userId: 'SYSTEM' },
      securityLevel: 'CRITICAL',
    });
  }

  /**
   * Data Portability - Article 20
   */
  async exportPersonalData(userId: string, format: 'JSON' | 'CSV'): Promise<Buffer> {
    const dsar = await this.handleDSAR(userId);

    if (format === 'JSON') {
      return Buffer.from(JSON.stringify(dsar, null, 2));
    } else {
      // Convert to CSV
      const csv = this.convertToCSV(dsar);
      return Buffer.from(csv);
    }
  }

  private async checkLegalHold(userId: string): Promise<boolean> {
    // Check if user has pending legal holds
    const legalHold = await db.legalHold.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    return !!legalHold;
  }

  private async deleteFromR2(fileUrl: string) {
    const key = fileUrl.split('/').pop();
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }));
  }

  private async deletePlaidData(userId: string) {
    // Remove Plaid access tokens
    const bankAccounts = await db.bankAccount.findMany({ where: { userId } });
    for (const account of bankAccounts) {
      await plaidClient.itemRemove({
        access_token: await decryptToken(account.plaidAccessToken),
      });
    }
  }

  private async deleteStripeData(userId: string) {
    // Delete Stripe customer
    // (Implementation depends on Stripe customer ID storage)
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const rows: string[] = [];
    rows.push('Category,Field,Value');

    for (const [category, fields] of Object.entries(data.personalData)) {
      if (Array.isArray(fields)) {
        for (const item of fields) {
          for (const [field, value] of Object.entries(item)) {
            rows.push(`${category},${field},${JSON.stringify(value)}`);
          }
        }
      } else if (typeof fields === 'object') {
        for (const [field, value] of Object.entries(fields as any)) {
          rows.push(`${category},${field},${JSON.stringify(value)}`);
        }
      }
    }

    return rows.join('\n');
  }
}
```

**Task SEC-003: Encryption at Rest and in Transit**
```typescript
// lib/security/encryption.ts

import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

const kmsClient = new KMSClient({ region: 'us-east-1' });

export class EncryptionService {
  /**
   * Encrypt sensitive data using AWS KMS
   */
  static async encrypt(plaintext: string, keyId: string = process.env.KMS_KEY_ID!): Promise<string> {
    const command = new EncryptCommand({
      KeyId: keyId,
      Plaintext: Buffer.from(plaintext),
    });

    const response = await kmsClient.send(command);
    return Buffer.from(response.CiphertextBlob!).toString('base64');
  }

  /**
   * Decrypt sensitive data using AWS KMS
   */
  static async decrypt(ciphertext: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    });

    const response = await kmsClient.send(command);
    return Buffer.from(response.Plaintext!).toString('utf8');
  }

  /**
   * Encrypt field-level data in database
   */
  static async encryptDatabaseField<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T> {
    const encrypted = { ...data };

    for (const field of fieldsToEncrypt) {
      if (encrypted[field]) {
        encrypted[field] = await this.encrypt(String(encrypted[field])) as any;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt field-level data from database
   */
  static async decryptDatabaseField<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
  ): Promise<T> {
    const decrypted = { ...data };

    for (const field of fieldsToDecrypt) {
      if (decrypted[field]) {
        decrypted[field] = await this.decrypt(String(decrypted[field])) as any;
      }
    }

    return decrypted;
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 12);
  }

  /**
   * Verify password hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }
}

// Middleware to enforce HTTPS
export function enforceHTTPS(req: Request): void {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto !== 'https' && process.env.NODE_ENV === 'production') {
    throw new Error('HTTPS required');
  }
}
```

## Database Schema Additions

```prisma
model AuditLog {
  id                String   @id @default(cuid())
  action            String
  entityType        String?
  entityId          String?
  userId            String?
  sessionId         String?

  ipAddress         String?
  userAgent         String?
  geolocation       Json?
  deviceFingerprint String?

  metadata          Json?
  securityLevel     String   @default("LOW")
  timestamp         DateTime @default(now())

  @@index([userId, timestamp(sort: Desc)])
  @@index([action, timestamp(sort: Desc)])
  @@index([securityLevel, timestamp(sort: Desc)])
  @@index([entityType, entityId])
}

model LegalHold {
  id        String   @id @default(cuid())
  userId    String
  reason    String
  status    String   @default("ACTIVE")
  createdBy String
  createdAt DateTime @default(now())
  releasedAt DateTime?

  @@index([userId, status])
}

model DataProcessingAgreement {
  id              String   @id @default(cuid())
  organizationId  String
  processorName   String
  purpose         String
  dataCategories  String[]
  signedAt        DateTime
  expiresAt       DateTime?

  @@index([organizationId])
}
```

---

**Security & Compliance Agent ready to ensure enterprise-grade security and regulatory compliance.**

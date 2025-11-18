# Security & Compliance Agent - Implementation Guide

## Overview

This directory contains the Security & Compliance Agent implementation for Clearway Phase 2, providing enterprise-grade security controls, GDPR compliance, and comprehensive audit logging.

## Components

### 1. Audit Logger (`audit-logger.ts`)

Comprehensive audit logging system with security level classification and SIEM integration.

**Features:**
- Automatic security level classification (LOW, MEDIUM, HIGH, CRITICAL)
- Real-time streaming to SIEM systems (Datadog, Splunk)
- Critical event alerting (PagerDuty, Slack)
- Advanced search and filtering
- Audit statistics and metrics

**Usage:**

```typescript
import { AuditLogger, AuditAction } from '@/lib/security/audit-logger';

// Log an audit event
await AuditLogger.log({
  action: AuditAction.CAPITAL_CALL_APPROVED,
  entityType: 'CAPITAL_CALL',
  entityId: 'cc_123',
  metadata: { amount: 1000000, currency: 'USD' },
  context: {
    userId: 'user_123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    deviceFingerprint: 'abc123',
  },
  securityLevel: 'HIGH', // Optional, auto-determined if not provided
});

// Search audit logs
const result = await AuditLogger.searchAuditLogs({
  userId: 'user_123',
  actions: [AuditAction.CAPITAL_CALL_APPROVED],
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  securityLevel: ['HIGH', 'CRITICAL'],
  limit: 100,
});

// Get audit statistics
const stats = await AuditLogger.getAuditStats({
  userId: 'user_123',
  startDate: new Date('2025-01-01'),
});
```

### 2. GDPR Compliance Service (`gdpr.ts`)

GDPR compliance engine with DSAR, Right to be Forgotten, and Data Portability.

**Features:**
- Data Subject Access Requests (DSAR) - Article 15
- Right to be Forgotten - Article 17
- Data Portability - Article 20
- Legal hold management
- Third-party data deletion

**Usage:**

```typescript
import { GDPRComplianceService } from '@/lib/security/gdpr';

const gdprService = new GDPRComplianceService();

// Handle DSAR - Get all personal data
const dsarData = await gdprService.handleDSAR('user_123');
console.log(dsarData.personalData);
console.log(dsarData.dataCategories);
console.log(dsarData.thirdParties);

// Export personal data
const jsonExport = await gdprService.exportPersonalData('user_123', 'JSON');
const csvExport = await gdprService.exportPersonalData('user_123', 'CSV');

// Delete personal data (with checks)
await gdprService.deletePersonalData(
  'user_123',
  'User requested account closure',
  'user_123'
);

// Get compliance status for organization
const status = await gdprService.getComplianceStatus('org_123');
```

### 3. Encryption Service (`encryption.ts`)

Encryption service with AWS KMS integration and field-level encryption.

**Features:**
- AWS KMS encryption/decryption
- Field-level database encryption
- AES-256-GCM encryption
- Password hashing with bcrypt
- Secure token generation
- HTTPS enforcement
- Security headers

**Usage:**

```typescript
import { EncryptionService } from '@/lib/security/encryption';

// Encrypt with AWS KMS
const encrypted = await EncryptionService.encrypt('sensitive data');
const decrypted = await EncryptionService.decrypt(encrypted);

// Encrypt database fields
const user = {
  email: 'user@example.com',
  ssn: '123-45-6789',
  bankAccount: '1234567890',
};

const encryptedUser = await EncryptionService.encryptDatabaseField(user, [
  'ssn',
  'bankAccount',
]);

// Decrypt database fields
const decryptedUser = await EncryptionService.decryptDatabaseField(
  encryptedUser,
  ['ssn', 'bankAccount']
);

// Hash password
const hash = await EncryptionService.hashPassword('my-password');
const isValid = await EncryptionService.verifyPassword('my-password', hash);

// Generate secure token
const apiKey = EncryptionService.generateSecureToken(32);

// Hash data (SHA-256)
const hash = EncryptionService.hashSHA256('data to hash');
```

## API Routes

### GDPR Compliance APIs

#### 1. Data Subject Access Request
```
GET /api/gdpr/dsar
```

Returns all personal data for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "personalData": { ... },
    "dataCategories": [...],
    "processingPurposes": [...],
    "thirdParties": [...],
    "retentionPeriod": "..."
  },
  "requestedAt": "2025-11-18T07:20:00.000Z"
}
```

#### 2. Data Export
```
POST /api/gdpr/export
Content-Type: application/json

{
  "format": "JSON" // or "CSV"
}
```

Downloads all personal data in the specified format.

#### 3. Data Deletion
```
POST /api/gdpr/delete
Content-Type: application/json

{
  "reason": "No longer using the service"
}
```

Deletes/anonymizes all personal data for the user.

**Checks:**
- Active legal holds
- Pending financial obligations
- Active capital calls

### Audit Log APIs

#### 1. Search Audit Logs
```
GET /api/audit-logs?userId=user_123&actions=USER_LOGIN,CAPITAL_CALL_APPROVED&startDate=2025-01-01&limit=50
```

**Query Parameters:**
- `actions`: Comma-separated list of actions
- `entityType`: Entity type filter
- `entityId`: Entity ID filter
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `securityLevel`: Comma-separated security levels
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)

#### 2. Audit Log Statistics
```
GET /api/audit-logs/stats?startDate=2025-01-01&endDate=2025-12-31
```

Returns audit log statistics and metrics.

## Database Schema

### AuditLog Model

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
```

### LegalHold Model

```prisma
model LegalHold {
  id        String   @id @default(cuid())
  userId    String
  reason    String
  status    String   @default("ACTIVE")
  createdBy String
  createdAt DateTime @default(now())
  releasedAt DateTime?
  caseNumber String?
  notes      String?

  @@index([userId, status])
}
```

### DataProcessingAgreement Model

```prisma
model DataProcessingAgreement {
  id              String   @id @default(cuid())
  organizationId  String
  processorName   String
  purpose         String
  dataCategories  String[]
  signedAt        DateTime
  expiresAt       DateTime?
  agreementUrl    String?
  contactEmail    String?
  status          String   @default("ACTIVE")

  @@index([organizationId])
}
```

## Environment Variables

### Required

```env
# Database
DATABASE_URL=postgresql://...

# Clerk Authentication
CLERK_SECRET_KEY=sk_...

# AWS KMS (for encryption)
KMS_KEY_ID=arn:aws:kms:us-east-1:123456789:key/...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Cloudflare R2 (for document storage)
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=clearway-documents
```

### Optional (SIEM & Alerting)

```env
# Datadog SIEM
DATADOG_API_KEY=...

# Splunk SIEM
SPLUNK_HEC_URL=https://...
SPLUNK_HEC_TOKEN=...

# PagerDuty Alerting
PAGERDUTY_WEBHOOK_URL=https://...
PAGERDUTY_ROUTING_KEY=...

# Slack Alerting
SLACK_SECURITY_WEBHOOK_URL=https://hooks.slack.com/...
```

## Security Best Practices

### 1. Encryption

- **At Rest**: All sensitive data is encrypted using AWS KMS
- **In Transit**: HTTPS enforced in production via middleware
- **Field-Level**: Sensitive fields (SSN, bank accounts) encrypted separately

### 2. Audit Logging

- **Comprehensive**: All user actions are logged
- **Security Levels**: Automatic classification and alerting
- **Retention**: 7 years for compliance
- **Immutable**: Audit logs are never deleted, only archived

### 3. GDPR Compliance

- **DSAR**: Respond within 30 days (automated)
- **Deletion**: Soft delete with anonymization (retains audit trail)
- **Legal Holds**: Prevent deletion when required
- **Portability**: JSON and CSV export formats

### 4. Access Control

- **Authentication**: Clerk-based auth with MFA support
- **Authorization**: Role-based access control (RBAC)
- **IP Tracking**: All requests tracked with IP and device fingerprint
- **Session Management**: Secure session handling

## Testing

Run the security tests:

```bash
npm run test lib/security
```

## SOC 2 Compliance Checklist

- [x] Comprehensive audit logging
- [x] Encryption at rest (AWS KMS)
- [x] Encryption in transit (HTTPS)
- [x] GDPR compliance (DSAR, deletion, export)
- [x] Access control (RBAC)
- [x] Security monitoring (SIEM integration)
- [x] Incident response (alerting)
- [ ] Penetration testing (planned)
- [ ] Vulnerability scanning (planned)
- [ ] Security training (planned)

## Support

For security issues or questions:
- Email: security@clearway.com
- Slack: #security-compliance
- PagerDuty: Critical incidents only

---

**Security & Compliance Agent - Built for Enterprise**

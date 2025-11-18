# Security & Compliance - Quick Start Guide

## 🚀 5-Minute Integration Guide

### 1. Import the Services

```typescript
import { AuditLogger, AuditAction, GDPRComplianceService, EncryptionService } from '@/lib/security';
```

### 2. Add Audit Logging to Any Action

```typescript
// In your API route or server action
import { AuditLogger, AuditAction } from '@/lib/security';

export async function approveCapitalCall(id: string, userId: string, req: Request) {
  // Your business logic
  await db.capitalCall.update({
    where: { id },
    data: { status: 'APPROVED' }
  });

  // Add audit logging
  await AuditLogger.log({
    action: AuditAction.CAPITAL_CALL_APPROVED,
    entityType: 'CAPITAL_CALL',
    entityId: id,
    metadata: { approvedBy: userId },
    context: {
      userId,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || undefined,
    },
  });

  return { success: true };
}
```

### 3. Encrypt Sensitive Data Before Storing

```typescript
import { EncryptionService } from '@/lib/security';

// Before saving to database
const bankAccount = {
  bankName: 'Chase',
  accountNumber: '1234567890',
  routingNumber: '021000021',
};

const encrypted = await EncryptionService.encryptDatabaseField(
  bankAccount,
  ['accountNumber', 'routingNumber']
);

await db.bankAccount.create({
  data: encrypted
});

// When retrieving from database
const decrypted = await EncryptionService.decryptDatabaseField(
  encryptedAccount,
  ['accountNumber', 'routingNumber']
);
```

### 4. Add HTTPS Enforcement to API Routes

```typescript
import { enforceHTTPS, getSecurityHeaders } from '@/lib/security';

export async function GET(req: Request) {
  // Enforce HTTPS in production
  enforceHTTPS(req);

  // Your logic here

  // Return response with security headers
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...getSecurityHeaders(),
    },
  });
}
```

### 5. Implement GDPR Data Export

```typescript
import { GDPRComplianceService } from '@/lib/security';

const gdprService = new GDPRComplianceService();

// User requests their data
const userData = await gdprService.handleDSAR(userId);

// Or export as file
const jsonExport = await gdprService.exportPersonalData(userId, 'JSON');
const csvExport = await gdprService.exportPersonalData(userId, 'CSV');
```

## 📊 Common Audit Actions

```typescript
// User actions
AuditAction.USER_LOGIN
AuditAction.USER_LOGOUT
AuditAction.USER_CREATED
AuditAction.USER_UPDATED
AuditAction.USER_DELETED

// Capital call actions
AuditAction.CAPITAL_CALL_VIEWED
AuditAction.CAPITAL_CALL_APPROVED
AuditAction.CAPITAL_CALL_REJECTED
AuditAction.CAPITAL_CALL_EXPORTED

// Payment actions
AuditAction.PAYMENT_RECORDED
AuditAction.PAYMENT_RECONCILED

// Document actions
AuditAction.DOCUMENT_UPLOADED
AuditAction.DOCUMENT_DOWNLOADED
AuditAction.DOCUMENT_DELETED

// GDPR actions
AuditAction.DSAR_REQUESTED
AuditAction.DATA_EXPORTED
AuditAction.DATA_DELETION_REQUESTED
```

## 🔐 Security Best Practices

### DO ✅
- Always log sensitive actions (approvals, deletions, exports)
- Encrypt sensitive fields (SSN, bank accounts, API keys)
- Use HTTPS in production
- Include security headers in all responses
- Capture IP address and user agent for audit logs
- Use automatic security level classification

### DON'T ❌
- Don't log passwords or secrets in audit logs
- Don't store unencrypted sensitive data
- Don't skip audit logging for critical actions
- Don't bypass GDPR deletion checks
- Don't expose audit logs to unauthorized users

## 🚨 Critical Events That Trigger Alerts

These actions automatically send alerts to PagerDuty/Slack:
- User deletion
- API key creation
- Data export
- Document deletion
- DSAR requests
- Data deletion requests

## 📖 API Usage Examples

### Search Audit Logs

```bash
GET /api/audit-logs?userId=user_123&actions=CAPITAL_CALL_APPROVED,PAYMENT_RECORDED&startDate=2025-01-01&limit=50
```

### Request DSAR

```bash
GET /api/gdpr/dsar
Authorization: Bearer <clerk-token>
```

### Export Data

```bash
POST /api/gdpr/export
Authorization: Bearer <clerk-token>
Content-Type: application/json

{
  "format": "JSON"
}
```

### Delete Data

```bash
POST /api/gdpr/delete
Authorization: Bearer <clerk-token>
Content-Type: application/json

{
  "reason": "No longer using the service"
}
```

## 🔧 Troubleshooting

### Issue: KMS Encryption Fails

**Solution**: Check AWS credentials and KMS key ID
```bash
# Verify environment variables
echo $KMS_KEY_ID
echo $AWS_ACCESS_KEY_ID
echo $AWS_REGION
```

### Issue: Audit Logs Not Appearing in Datadog

**Solution**: Verify Datadog API key
```bash
# Check Datadog integration
curl -X POST https://http-intake.logs.datadoghq.com/api/v2/logs \
  -H "DD-API-KEY: $DATADOG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### Issue: GDPR Deletion Blocked

**Possible Reasons**:
1. Active legal hold
2. Pending capital calls
3. Active financial obligations

**Solution**: Check legal holds and capital call status

## 📚 Additional Resources

- [Full Documentation](./README.md)
- [Implementation Report](../../SECURITY_COMPLIANCE_IMPLEMENTATION.md)
- [Prisma Schema](../../prisma/schema.prisma)

---

**Need Help?** Contact security@clearway.com

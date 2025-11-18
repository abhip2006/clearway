# Security Documentation

This document outlines Clearway's security practices, compliance, and best practices for maintaining a secure system.

## Table of Contents

1. [Security Best Practices](#security-best-practices)
2. [Data Encryption](#data-encryption)
3. [Access Control](#access-control)
4. [Audit Logging](#audit-logging)
5. [GDPR Compliance](#gdpr-compliance)
6. [SOC 2 Controls](#soc-2-controls)
7. [Penetration Testing](#penetration-testing)
8. [Incident Response](#incident-response)
9. [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Security Best Practices

### For Administrators

1. **Enable MFA**: Require multi-factor authentication for all users
2. **Rotate API Keys**: Change API keys quarterly
3. **Monitor Audit Logs**: Review logs weekly for suspicious activity
4. **Limit Admin Access**: Only grant admin privileges when necessary
5. **Use SSO**: Implement SAML/OIDC for enterprise authentication
6. **IP Allowlisting**: Restrict access to known IP ranges (enterprise)

### For Developers

1. **Never Commit Secrets**: Use `.env` files (gitignored)
2. **Validate All Input**: Use Zod schemas for validation
3. **Use Prepared Statements**: Prevent SQL injection (Prisma handles this)
4. **Rate Limit APIs**: Prevent abuse
5. **Sanitize Output**: Prevent XSS attacks
6. **Update Dependencies**: Run `npm audit` regularly

### For Users

1. **Strong Passwords**: Use 12+ characters with mixed case, numbers, symbols
2. **Enable MFA**: Protect your account with two-factor authentication
3. **Review Sessions**: Log out from devices you don't recognize
4. **Verify Emails**: Don't click suspicious links
5. **Report Suspicious Activity**: Contact security@clearway.com

---

## Data Encryption

### Encryption at Rest

**Database**:
- PostgreSQL with AES-256 encryption (Neon)
- Encrypted backups
- Encrypted connection strings (environment variables)

**File Storage**:
- Cloudflare R2 with AES-256 encryption
- Server-side encryption enabled
- Access controlled via signed URLs

**Sensitive Fields**:
- Bank account numbers encrypted using AWS KMS
- API keys hashed before storage
- Passwords hashed with bcrypt (via Clerk)

### Encryption in Transit

**HTTPS/TLS**:
- TLS 1.3 required for all connections
- HSTS (HTTP Strict Transport Security) enabled
- A+ rating on SSL Labs

**API Calls**:
- All API calls must use HTTPS
- Certificate pinning for mobile apps (future)

**Webhook Signatures**:
- HMAC-SHA256 signatures for webhook verification
- Timestamp validation to prevent replay attacks

---

## Access Control

### Authentication

**Clerk Authentication**:
- OAuth 2.0 / OpenID Connect
- Multi-factor authentication (TOTP, SMS, WebAuthn)
- Session management with secure cookies
- SSO via SAML 2.0 (enterprise)

**API Authentication**:
- API key authentication (Bearer token)
- API keys scoped to organizations
- Keys prefixed by environment (`sk_live_`, `sk_test_`)

### Authorization

**Role-Based Access Control (RBAC)**:
- Admin: Full access
- Editor: Read/write access to capital calls
- Viewer: Read-only access

**Permission Scopes**:
```typescript
// Examples
"capital_calls:read"
"capital_calls:write"
"capital_calls:approve"
"users:manage"
"billing:write"
```

**Organization Isolation**:
- Data filtered by `organizationId` at query level
- Row-level security enforced
- No cross-organization access

---

## Audit Logging

All security-relevant actions are logged.

### Logged Events

**User Actions**:
- Login/logout
- MFA enabled/disabled
- Password changes
- API key creation/deletion

**Data Access**:
- Capital call viewed
- Document downloaded
- Payment reconciled
- Export generated

**Security Events**:
- Failed login attempts
- Permission denied
- IP allowlist violations
- Suspicious activity detected

### Audit Log Schema

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: object;
  metadata?: object;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
```

### Retention

- **Starter**: 30 days
- **Professional**: 1 year
- **Enterprise**: 7 years (customizable)

### Access

- Admins can view all audit logs
- Users can view their own activity
- Export to SIEM (Splunk, ELK) for enterprise

---

## GDPR Compliance

Clearway is fully GDPR compliant.

### Data Subject Rights

**Right to Access**:
- Users can export all their data
- Format: JSON or PDF
- API: `GET /api/gdpr/dsar?email=user@example.com`

**Right to Rectification**:
- Users can edit their profile
- Admins can correct data

**Right to Erasure** (Right to be Forgotten):
- Users can request data deletion
- 30-day retention for legal holds
- API: `POST /api/gdpr/delete`

**Right to Data Portability**:
- Export in machine-readable format (JSON)
- Includes all user data

**Right to Restriction**:
- Ability to pause processing
- Legal holds prevent deletion

### Data Processing Agreements (DPAs)

Clearway has DPAs with all sub-processors:
- OpenAI (GPT-4 extraction)
- Azure (Document Intelligence)
- Cloudflare (R2 storage)
- Vercel (hosting)
- Resend (email)

### Privacy Policy

View our privacy policy: https://clearway.com/privacy

### Cookie Consent

- Cookie banner on first visit
- Granular consent (essential, analytics, marketing)
- Consent stored in database

---

## SOC 2 Controls

Clearway implements SOC 2 Type II controls:

### Security

- **Access Control**: RBAC, MFA, SSO
- **Encryption**: At rest and in transit
- **Monitoring**: Sentry, audit logs
- **Incident Response**: Documented procedures

### Availability

- **Uptime**: 99.9% SLA (enterprise)
- **Redundancy**: Multi-region deployment
- **Backups**: Daily automated backups
- **Disaster Recovery**: Tested quarterly

### Processing Integrity

- **Data Validation**: Input validation with Zod
- **Error Handling**: Graceful error recovery
- **Testing**: 95%+ code coverage
- **Monitoring**: Real-time error tracking

### Confidentiality

- **Data Classification**: Public, internal, confidential
- **Encryption**: AES-256 for confidential data
- **Access Logs**: All access logged
- **DLP**: Data loss prevention (enterprise)

### Privacy

- **GDPR**: Full compliance
- **Data Minimization**: Only collect necessary data
- **Retention**: Configurable retention policies
- **Anonymization**: PII anonymized in logs

### SOC 2 Report

Enterprise customers can request SOC 2 report: compliance@clearway.com

---

## Penetration Testing

### Schedule

- **Annual**: Full penetration test by third-party firm
- **Quarterly**: Internal security audits
- **Continuous**: Automated vulnerability scanning

### Scope

- Web application
- API endpoints
- Infrastructure (AWS, Vercel)
- Mobile apps (future)

### Bug Bounty Program

**Coming Soon**: We're launching a bug bounty program.

Interested in participating? Email: security@clearway.com

---

## Incident Response

### Security Incident Response Team (SIRT)

- **Lead**: CTO
- **Members**: Engineering leads, DevOps, Legal
- **On-call**: 24/7 rotation (enterprise)

### Incident Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **Critical** | Data breach, system compromise | < 1 hour |
| **High** | Vulnerability exploited, service down | < 4 hours |
| **Medium** | Potential vulnerability, degraded service | < 24 hours |
| **Low** | Minor issue, no impact | < 1 week |

### Incident Response Process

1. **Detection**: Automated alerts + manual reporting
2. **Assessment**: Severity level assigned
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat
5. **Recovery**: Restore normal operations
6. **Post-Incident**: Review and document lessons learned

### Notification

**Data Breach**:
- Affected users notified within 72 hours
- Regulators notified per GDPR requirements
- Public disclosure if required by law

**Service Outage**:
- Status page updated: https://status.clearway.com
- Email notification to admins
- Post-mortem published

---

## Reporting Vulnerabilities

### Responsible Disclosure

If you discover a security vulnerability:

1. **Email**: security@clearway.com
2. **Do Not**: Publicly disclose until we've addressed it
3. **Include**:
   - Description of vulnerability
   - Steps to reproduce
   - Impact assessment
   - Proof of concept (if applicable)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 3 business days
- **Fix Timeline**: Depends on severity
  - Critical: < 1 week
  - High: < 2 weeks
  - Medium: < 1 month
  - Low: Best effort

### Recognition

We credit security researchers in our security hall of fame (with permission).

---

## Security Contact

**Email**: security@clearway.com
**PGP Key**: https://clearway.com/pgp-key.txt
**Response Time**: < 24 hours

**Emergency (Enterprise only)**:
Phone: 1-800-CLEARWAY
Available 24/7

---

## Resources

- [GDPR Compliance Guide](https://gdpr.eu/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SOC 2 Framework](https://www.aicpa.org/soc2)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: January 2025
**Version**: 1.0

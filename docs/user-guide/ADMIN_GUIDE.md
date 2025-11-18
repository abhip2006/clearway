# Admin Guide

This guide covers administrative features for managing your Clearway organization, including user management, security settings, audit logs, and GDPR compliance.

## Table of Contents

1. [Organization Management](#organization-management)
2. [User Roles and Permissions](#user-roles-and-permissions)
3. [Team Management](#team-management)
4. [Security Settings](#security-settings)
5. [Audit Logs](#audit-logs)
6. [GDPR Compliance](#gdpr-compliance)
7. [Integration Management](#integration-management)
8. [Billing and Subscription](#billing-and-subscription)

---

## Organization Management

### Organization Profile

Configure your organization's profile and branding:

1. Navigate to **Settings** > **Organization** > **Profile**
2. Configure:
   - **Organization Name**: Your company or firm name
   - **URL Slug**: Custom URL (e.g., `clearway.com/acme`)
   - **Custom Domain** (Enterprise): Use your own domain (e.g., `clearway.acme.com`)
   - **Logo**: Upload your company logo (PNG, SVG, max 2MB)
   - **Brand Colors**: Customize primary and secondary colors

### Organization Settings

**General Settings**:
```json
{
  "timezone": "America/New_York",
  "currency": "USD",
  "dateFormat": "MM/DD/YYYY",
  "language": "en-US"
}
```

**Features Configuration**:
- Enable/disable AI extraction
- Set confidence thresholds (default: 85%)
- Configure auto-approval rules
- Set document retention policies

**Notification Defaults**:
- Default notification preferences for new users
- Organization-wide alerts
- System maintenance notifications

### Multi-Tenancy (Enterprise)

For organizations managing multiple entities:

1. **Create Sub-Organizations**:
   - Navigate to **Organization** > **Sub-Organizations**
   - Click **"Create Sub-Organization"**
   - Assign dedicated admins and users

2. **Data Isolation**:
   - Each sub-organization has isolated data
   - Billing rolls up to parent organization
   - Centralized reporting across all entities

---

## User Roles and Permissions

### Built-in Roles

Clearway provides three standard roles:

#### Admin Role

**Full Permissions**:
- `organization:*` - Full organization management
- `users:*` - User and team management
- `capital_calls:*` - All capital call operations
- `documents:*` - Document management
- `integrations:*` - Integration setup and management
- `billing:*` - Billing and subscription management
- `audit:read` - View audit logs
- `reports:*` - Generate and schedule reports
- `settings:*` - Configure all settings

**Use Cases**:
- CFO or Controller
- Operations Manager
- Technical Administrator

#### Editor Role

**Permissions**:
- `capital_calls:read` - View capital calls
- `capital_calls:write` - Create and edit capital calls
- `capital_calls:approve` - Approve capital calls
- `documents:read` - View documents
- `documents:upload` - Upload documents
- `reports:generate` - Generate on-demand reports
- `profile:write` - Edit own profile

**Use Cases**:
- Accounting Staff
- Fund Accountants
- Operations Analysts

#### Viewer Role

**Permissions**:
- `capital_calls:read` - View capital calls
- `documents:read` - View documents
- `reports:read` - View reports
- `profile:write` - Edit own profile

**Use Cases**:
- Investors
- External Auditors
- Read-only Consultants

### Custom Roles (Enterprise)

Create custom roles with granular permissions:

1. Navigate to **Settings** > **Roles** > **Create Role**
2. **Configure Permissions**:

```typescript
{
  "name": "Fund Accountant",
  "description": "Can review and approve capital calls, limited admin access",
  "permissions": [
    "capital_calls:read",
    "capital_calls:write",
    "capital_calls:approve",
    "documents:read",
    "documents:upload",
    "reports:generate",
    "integrations:read"
  ]
}
```

3. **Assign to Users**: Select users to assign this custom role

### Permission Scopes

Permissions follow a resource-based pattern:

| Resource | Actions | Description |
|----------|---------|-------------|
| `organization` | `read`, `write`, `delete` | Organization settings |
| `users` | `read`, `write`, `delete`, `invite` | User management |
| `capital_calls` | `read`, `write`, `approve`, `delete` | Capital call operations |
| `documents` | `read`, `upload`, `delete` | Document management |
| `integrations` | `read`, `write`, `delete` | Third-party integrations |
| `billing` | `read`, `write` | Billing and subscriptions |
| `audit` | `read` | Audit log access |
| `reports` | `read`, `generate`, `schedule` | Reporting |
| `settings` | `read`, `write` | System settings |

---

## Team Management

### Inviting Users

1. **Send Invitations**:
   - Navigate to **Settings** > **Team** > **Invite Member**
   - Enter email addresses (comma-separated for bulk invites)
   - Select role
   - Add optional welcome message
   - Set expiration (default: 7 days)

2. **Invitation Flow**:
   - User receives email invitation
   - Clicks link to create account
   - Automatically added to organization
   - Inherits organization settings

### Managing Existing Users

**View All Users**:
```
Settings > Team > Members
```

**User Actions**:
- **Edit Role**: Change user's role
- **Suspend**: Temporarily disable user access
- **Remove**: Permanently remove from organization
- **View Activity**: See user's recent actions

### Bulk User Management

**CSV Import**:
1. Download CSV template
2. Fill in user information:
   ```csv
   email,name,role
   john@example.com,John Doe,Editor
   jane@example.com,Jane Smith,Admin
   ```
3. Upload CSV to invite multiple users

**Bulk Actions**:
- Select multiple users with checkboxes
- Apply actions:
  - Change role
  - Send notification
  - Suspend/unsuspend
  - Export user list

### User Lifecycle

**Onboarding**:
- Automated welcome email
- Interactive product tour
- Suggested first actions
- Assign to onboarding tasks

**Offboarding**:
1. Suspend user access immediately
2. Transfer owned documents to another user
3. Remove from all teams
4. Archive user data (GDPR compliant)
5. Revoke all API keys and access tokens

---

## Security Settings

### Authentication

**Multi-Factor Authentication (MFA)**:
- Navigate to **Settings** > **Security** > **MFA**
- Options:
  - **Required for All Users**: Enforces MFA organization-wide
  - **Optional**: Users can opt-in
  - **Required for Admins**: Only admins must use MFA

**Supported MFA Methods**:
- Authenticator apps (Google Authenticator, Authy)
- SMS codes
- Hardware security keys (FIDO2/WebAuthn)

### Single Sign-On (SSO) - Enterprise

Configure SAML 2.0 or OIDC for enterprise authentication:

1. **Navigate to**: **Settings** > **Security** > **SSO**
2. **Choose Provider**: Okta, Azure AD, Google Workspace, OneLogin
3. **Configure SAML**:
   ```xml
   Entity ID: https://clearway.com/saml/metadata
   ACS URL: https://clearway.com/saml/acs
   Single Logout URL: https://clearway.com/saml/sls
   ```
4. **Upload Metadata**: Upload IdP metadata XML
5. **Test Connection**: Verify SSO flow works
6. **Enable**: Activate SSO for organization

**JIT Provisioning**:
- Automatically create users on first login
- Map SAML attributes to Clearway roles
- Sync group memberships

### Password Policies

Configure organization password requirements:

```json
{
  "minimumLength": 12,
  "requireUppercase": true,
  "requireLowercase": true,
  "requireNumbers": true,
  "requireSpecialChars": true,
  "preventReuse": 5,
  "expirationDays": 90,
  "requireMFA": true
}
```

### IP Allowlisting (Enterprise)

Restrict access to specific IP ranges:

1. Navigate to **Settings** > **Security** > **IP Allowlist**
2. Add IP ranges:
   ```
   192.168.1.0/24 - Office Network
   10.0.0.0/8 - VPN
   203.0.113.0/24 - Remote Office
   ```
3. **Enforcement Mode**:
   - **Alert Only**: Log violations but allow access
   - **Enforce**: Block access from non-allowlisted IPs

### Session Management

**Configure Session Settings**:
- **Session Timeout**: Auto-logout after inactivity (default: 30 minutes)
- **Maximum Session Duration**: Absolute session limit (default: 12 hours)
- **Concurrent Sessions**: Limit simultaneous logins
- **Remember Me**: Allow users to stay logged in (max 30 days)

**Revoke Sessions**:
- Admin can force logout for all users
- Individual users can revoke their own sessions
- Automatic revocation on password change

---

## Audit Logs

### Viewing Audit Logs

Access comprehensive audit logs:

1. Navigate to **Settings** > **Security** > **Audit Logs**
2. **Filter Options**:
   - Date range
   - User
   - Action type
   - Entity type
   - Security level

### Audit Log Events

**User Events**:
- `user.login` - User logged in
- `user.logout` - User logged out
- `user.mfa_enabled` - MFA was enabled
- `user.password_changed` - Password was updated
- `user.invited` - User was invited
- `user.removed` - User was removed

**Capital Call Events**:
- `capital_call.created` - Capital call created
- `capital_call.updated` - Capital call edited
- `capital_call.approved` - Capital call approved
- `capital_call.rejected` - Capital call rejected
- `capital_call.deleted` - Capital call deleted

**Document Events**:
- `document.uploaded` - Document uploaded
- `document.processed` - AI processing completed
- `document.downloaded` - Document downloaded
- `document.deleted` - Document deleted

**Integration Events**:
- `integration.connected` - Integration connected
- `integration.disconnected` - Integration disconnected
- `integration.sync` - Integration sync performed
- `integration.error` - Integration error occurred

**Security Events**:
- `security.login_failed` - Failed login attempt
- `security.mfa_failed` - Failed MFA verification
- `security.permission_denied` - Unauthorized access attempt
- `security.ip_blocked` - IP allowlist violation

### Audit Log Schema

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  userId?: string;
  sessionId?: string;

  // Entity information
  entityType?: string;
  entityId?: string;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  geolocation?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  deviceFingerprint?: string;

  // Additional data
  metadata?: Record<string, any>;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
```

### Exporting Audit Logs

**Export Formats**:
- CSV
- JSON
- SIEM format (Splunk, ELK)

**Retention Policies**:
- **Starter**: 30 days
- **Professional**: 1 year
- **Enterprise**: 7 years (configurable)

---

## GDPR Compliance

Clearway is fully GDPR compliant. Admins have tools to manage data subject rights.

### Data Subject Access Requests (DSAR)

**Handling DSAR**:
1. Navigate to **Settings** > **Privacy** > **Data Requests**
2. Click **"New DSAR"**
3. Enter user email
4. Select request type:
   - **Access**: Export all user data
   - **Rectification**: Correct inaccurate data
   - **Erasure**: Delete user data (right to be forgotten)
   - **Portability**: Export in machine-readable format
   - **Restriction**: Limit processing

5. **Processing**:
   - Request is logged in audit trail
   - Data is compiled automatically
   - Download report (JSON/PDF)
   - Fulfill within 30 days

### Data Retention

Configure retention policies:

```typescript
{
  "documents": {
    "retentionPeriod": "7_YEARS",
    "autoDelete": true
  },
  "capitalCalls": {
    "retentionPeriod": "7_YEARS",
    "autoDelete": false
  },
  "auditLogs": {
    "retentionPeriod": "7_YEARS",
    "autoDelete": false
  },
  "deletedUsers": {
    "retentionPeriod": "30_DAYS",
    "autoDelete": true
  }
}
```

### Data Processing Agreements (DPA)

View and manage DPAs with third-party processors:

1. Navigate to **Settings** > **Privacy** > **Data Processing Agreements**
2. **View Active DPAs**:
   - OpenAI (GPT-4 extraction)
   - Azure (Document Intelligence)
   - Cloudflare (R2 storage)
   - Vercel (hosting)

3. **DPA Details**:
   - Purpose of processing
   - Data categories processed
   - Retention period
   - Security measures
   - Sub-processors

### Cookie Consent Management

Configure cookie banner and consent tracking:

1. **Cookie Settings**: **Settings** > **Privacy** > **Cookies**
2. **Categories**:
   - **Essential**: Required for functionality (always on)
   - **Analytics**: Usage tracking (opt-in)
   - **Marketing**: Third-party marketing (opt-in)

### Legal Holds

Place legal holds on user data:

1. Navigate to **Settings** > **Privacy** > **Legal Holds**
2. Click **"Create Legal Hold"**
3. Configure:
   - User(s) to place on hold
   - Reason (litigation, investigation)
   - Case number
   - Hold duration

**Effect**:
- Prevents data deletion
- Blocks GDPR erasure requests
- Preserves all versions of documents
- Audit trail of all actions

---

## Integration Management

### Managing Active Integrations

View all connected integrations:

1. Navigate to **Settings** > **Integrations**
2. **View Status**:
   - Active integrations
   - Connection health
   - Last sync time
   - Error count

### Integration Settings

**Per-Integration Settings**:

**QuickBooks**:
- Account mappings
- Sync frequency
- Auto-create invoices
- Tax settings

**Fund Administrators**:
- Sync schedule
- Field mappings
- Notification preferences
- Error handling

**DocuSign**:
- Default templates
- Signer settings
- Notification preferences

### Monitoring Integration Health

**Integration Dashboard**:
- Connection status
- Sync history
- Error logs
- Performance metrics

**Alerts**:
- Email on sync failures
- Slack notifications
- Webhook events

### Troubleshooting Integrations

**Common Issues**:

1. **OAuth Token Expired**:
   - Reconnect integration
   - Refresh access token

2. **Sync Failures**:
   - Check error logs
   - Verify field mappings
   - Contact integration partner

3. **Missing Data**:
   - Check sync filters
   - Verify permissions
   - Manual sync option

---

## Billing and Subscription

### Managing Subscription

1. Navigate to **Settings** > **Billing**
2. **View Current Plan**:
   - Plan name (Starter, Professional, Enterprise)
   - Monthly/annual billing
   - User count
   - Features enabled

### Upgrading/Downgrading

**Upgrade Plan**:
1. Click **"Upgrade Plan"**
2. Select new plan
3. Review feature comparison
4. Enter payment information
5. **Immediate activation**

**Downgrade Plan**:
1. Click **"Change Plan"**
2. Select lower tier
3. Review feature limitations
4. **Effective at end of billing period**

### Usage Monitoring

Track usage against plan limits:

| Metric | Starter | Professional | Enterprise |
|--------|---------|--------------|------------|
| Users | 5 | 25 | Unlimited |
| Documents/month | 100 | 1,000 | Unlimited |
| API calls/month | 10,000 | 100,000 | Unlimited |
| Storage | 10 GB | 100 GB | Unlimited |

**Overage Charges**:
- Additional users: $15/user/month
- Additional documents: $0.10/document
- Additional storage: $0.10/GB/month

### Payment Methods

**Accepted Methods**:
- Credit card (Visa, Mastercard, Amex)
- ACH bank transfer (Enterprise)
- Invoice (Enterprise, annual plans)

**Update Payment Method**:
1. Navigate to **Settings** > **Billing** > **Payment Methods**
2. Add new payment method
3. Set as default

### Invoices and Receipts

**Download Invoices**:
- Navigate to **Settings** > **Billing** > **Invoices**
- Download PDF or CSV
- Email to accounting department

**Tax Information**:
- Update tax ID/VAT number
- Specify tax exemption status

---

## Best Practices for Admins

### Security

1. **Enforce MFA** for all admin users (minimum)
2. **Regular Audit Log Reviews** (weekly)
3. **Limit Admin Access** to necessary personnel only
4. **Use Custom Roles** for fine-grained permissions
5. **Enable IP Allowlisting** for sensitive operations

### User Management

1. **Onboard in Batches** to manage training effectively
2. **Assign Based on Role** not just seniority
3. **Regular Access Reviews** (quarterly)
4. **Document Processes** for user lifecycle management

### Compliance

1. **Document GDPR Processes** for your organization
2. **Regular DPA Reviews** (annually)
3. **Test DSAR Workflow** before you need it
4. **Maintain Audit Trail** of all compliance actions

### Integration Management

1. **Test in Sandbox** before production
2. **Monitor Daily** for sync errors
3. **Document Field Mappings** for reference
4. **Schedule Maintenance Windows** for updates

---

## Getting Help

**Admin Support**:
- Email: admin-support@clearway.com
- Priority support line: 1-800-CLEARWAY
- Dedicated Slack channel (Enterprise)
- Quarterly admin training webinars

**Documentation**:
- [Security Documentation](../security/SECURITY.md)
- [API Reference](../api/API_REFERENCE.md)
- [Integration Guides](../integrations/)

**Emergency Support** (Enterprise):
- 24/7 phone support
- 1-hour response SLA
- Dedicated success manager

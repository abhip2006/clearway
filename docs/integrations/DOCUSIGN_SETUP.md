# DocuSign Integration Setup

This guide explains how to integrate Clearway with DocuSign to electronically sign capital call documents and track envelope status.

## Table of Contents

1. [Overview](#overview)
2. [DocuSign Account Setup](#docusign-account-setup)
3. [JWT Authentication Configuration](#jwt-authentication-configuration)
4. [Template Configuration](#template-configuration)
5. [Envelope Tracking](#envelope-tracking)
6. [Webhook Events](#webhook-events)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The DocuSign integration enables:

- **Electronic Signatures**: Send capital call documents for e-signature
- **Template Management**: Use pre-configured DocuSign templates
- **Status Tracking**: Monitor signing progress in real-time
- **Automatic Updates**: Capital calls update automatically when signed
- **Audit Trail**: Complete signing history and legal compliance

### Integration Flow

```
Capital Call Approved
    ↓
Generate PDF (optional)
    ↓
Send to DocuSign
    ├── Create envelope
    ├── Add signers
    └── Send for signature
    ↓
Track Status
    ├── Sent
    ├── Delivered
    ├── Signed
    └── Completed
    ↓
Update Clearway
```

---

## DocuSign Account Setup

### Step 1: Create DocuSign Developer Account

1. **Go to**: https://developers.docusign.com
2. **Create Account**: Sign up for a free developer account
3. **Verify Email**: Confirm your email address
4. **Access Demo Environment**: You'll get access to a sandbox environment

### Step 2: Understand Environments

DocuSign has two environments:

| Environment | Purpose | URL |
|-------------|---------|-----|
| **Demo/Sandbox** | Testing | https://demo.docusign.net |
| **Production** | Live signatures | https://account.docusign.com |

**Recommendation**: Test in Demo environment before switching to Production.

### Step 3: Choose Authentication Method

DocuSign supports two authentication methods:

1. **JWT (JSON Web Token)** - Recommended for server-to-server
   - No user interaction required
   - Long-lived access
   - Best for automated workflows

2. **OAuth 2.0** - For user-initiated actions
   - Requires user login
   - Short-lived tokens
   - Better for interactive apps

**For Clearway, we recommend JWT authentication** for automated capital call signing.

---

## JWT Authentication Configuration

### Step 1: Create Integration Key

1. **Log in to DocuSign Admin**: https://admindemo.docusign.com (or production)
2. **Navigate to**: **Settings** > **Integrations** > **Apps and Keys**
3. **Click**: **Add App and Integration Key**

**Configure**:
- **App Name**: Clearway Integration
- **Description**: Automated capital call document signing
- **Redirect URIs**: Not needed for JWT

4. **Save** and copy the **Integration Key** (Client ID):
   ```
   Example: 12345678-abcd-1234-abcd-123456789012
   ```

### Step 2: Generate RSA Key Pair

1. **In the Integration Key settings**, click **Generate RSA Key Pair**
2. **Download Private Key**: Save `private.key` file securely
3. **Public Key**: Automatically stored by DocuSign

**Important**: Keep the private key secure. Never commit to version control.

### Step 3: Grant Consent

Before using JWT, you must grant consent:

1. **Generate Consent URL**:
   ```
   https://account-d.docusign.com/oauth/auth?
   response_type=code&
   scope=signature%20impersonation&
   client_id={INTEGRATION_KEY}&
   redirect_uri=https://clearway.com
   ```

2. **Open URL in Browser**: Log in as an admin user
3. **Grant Consent**: Click "Allow"
4. **Consent Granted**: You'll see a success message

**Note**: Consent is required only once per integration key.

### Step 4: Configure in Clearway

1. Navigate to **Settings** > **Integrations** > **DocuSign**
2. **Enter Credentials**:
   ```json
   {
     "integratorKey": "12345678-abcd-1234-abcd-123456789012",
     "userId": "your-docusign-user-id",
     "accountId": "your-docusign-account-id",
     "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
     "environment": "demo" // or "production"
   }
   ```

3. **Test Connection**: Click "Test Connection"
4. **Success**: Green checkmark indicates JWT is configured correctly

### Finding Your User ID and Account ID

**User ID**:
1. In DocuSign, go to **Settings** > **Integrations** > **API and Keys**
2. Copy **User ID** (format: `12345678-1234-1234-1234-123456789012`)

**Account ID**:
1. In DocuSign, go to **Settings** > **Plan and Billing**
2. Copy **Account ID** (format: `12345678`)

---

## Template Configuration

DocuSign templates pre-configure documents with signature fields, making sending faster.

### Step 1: Create Template in DocuSign

1. **Log in to DocuSign**: https://demo.docusign.net (or production)
2. **Navigate to**: **Templates** > **New** > **Create Template**

3. **Upload Document**:
   - Upload capital call PDF template
   - OR use Clearway-generated PDF

4. **Add Recipients**:
   - **Role 1**: "Investor" (Signer)
   - **Role 2**: "Fund Manager" (Carbon Copy) - optional

5. **Add Signature Fields**:
   - Drag "Sign Here" field to investor signature location
   - Add "Date Signed" field
   - Add "Name" field (optional)

6. **Configure Email**:
   - Subject: `Capital Call for {{Fund_Name}}`
   - Message: `Please review and sign the attached capital call document.`

7. **Save Template**: Name it `Clearway - Capital Call Template`

### Step 2: Get Template ID

1. **In Template List**: Click on your template
2. **Copy Template ID** from the URL:
   ```
   https://demo.docusign.net/templates/12345678-1234-1234-1234-123456789012
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        This is your Template ID
   ```

### Step 3: Configure Template in Clearway

1. Navigate to **Settings** > **Integrations** > **DocuSign** > **Templates**
2. **Add Template**:
   ```typescript
   {
     "templateId": "12345678-1234-1234-1234-123456789012",
     "name": "Capital Call Template",
     "roles": [
       {
         "roleName": "Investor",
         "signingOrder": 1
       },
       {
         "roleName": "Fund Manager",
         "signingOrder": 2
       }
     ]
   }
   ```

### Step 4: Map Template Variables

Map Clearway fields to DocuSign template fields:

```typescript
{
  "fieldMappings": {
    "{{Fund_Name}}": "capitalCall.fundName",
    "{{Amount_Due}}": "capitalCall.amountDue",
    "{{Due_Date}}": "capitalCall.dueDate",
    "{{Investor_Name}}": "capitalCall.investorName",
    "{{Wire_Reference}}": "capitalCall.wireReference"
  }
}
```

---

## Envelope Tracking

Once a document is sent for signature, Clearway tracks the envelope status.

### Envelope Statuses

| Status | Description | Next Step |
|--------|-------------|-----------|
| **Created** | Envelope created, not sent yet | Automatically sent |
| **Sent** | Sent to signers | Wait for delivery |
| **Delivered** | Delivered to signer's email | Wait for signature |
| **Signed** | Signer completed signature | Wait for all signers |
| **Completed** | All signers completed | Document finalized |
| **Declined** | Signer declined to sign | Follow up manually |
| **Voided** | Envelope was voided | Create new envelope |

### Viewing Envelope Status

1. **Navigate to**: **Capital Calls** > **[Select Capital Call]**
2. **DocuSign Section**: View current envelope status
3. **Details**:
   - Envelope ID
   - Sent date
   - Signers and their status
   - Last updated timestamp

### Manual Actions

**Resend Envelope**:
- Click **"Resend"** to send reminder email
- Available if status is "Sent" or "Delivered"

**Void Envelope**:
- Click **"Void Envelope"** to cancel
- Requires reason (logged in audit trail)
- Creates new envelope if needed

**Download Signed Document**:
- Available when status is "Completed"
- Click **"Download"** to get signed PDF
- Automatically saved to Clearway storage

---

## Webhook Events

DocuSign sends webhook events for envelope status changes.

### Step 1: Configure Webhook in DocuSign

1. **In DocuSign Admin**: https://admindemo.docusign.com
2. **Navigate to**: **Settings** > **Integrations** > **Connect**
3. **Click**: **Add Configuration** > **Custom**

**Configure**:
- **Name**: Clearway Webhook
- **URL**: `https://clearway.com/api/webhooks/docusign`
- **Events**:
  - ✅ Envelope Sent
  - ✅ Envelope Delivered
  - ✅ Envelope Signed
  - ✅ Envelope Completed
  - ✅ Envelope Declined
  - ✅ Envelope Voided

4. **Enable HMAC**: For security (recommended)
5. **Save Configuration**

### Step 2: Verify Webhook in Clearway

1. Navigate to **Settings** > **Integrations** > **DocuSign** > **Webhooks**
2. **Webhook URL**: `https://clearway.com/api/webhooks/docusign`
3. **Status**: Should show "Active" with green checkmark

### Webhook Payload Example

```json
{
  "event": "envelope-completed",
  "data": {
    "envelopeId": "12345678-1234-1234-1234-123456789012",
    "envelopeSummary": {
      "status": "completed",
      "emailSubject": "Capital Call for Acme Ventures Fund III",
      "completedDateTime": "2025-01-15T14:30:00Z"
    },
    "recipients": {
      "signers": [
        {
          "email": "investor@example.com",
          "name": "John Doe",
          "status": "completed",
          "signedDateTime": "2025-01-15T14:30:00Z"
        }
      ]
    }
  }
}
```

### Webhook Security

Clearway verifies all DocuSign webhooks using HMAC-SHA256:

```typescript
// Webhook verification
const signature = request.headers['x-docusign-signature-1'];
const payload = request.body;
const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('base64');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

---

## Best Practices

### Template Design

1. **Keep It Simple**: Minimize required fields to speed up signing
2. **Mobile-Friendly**: Ensure signature fields are easy to tap on mobile
3. **Clear Instructions**: Add text fields with signing instructions
4. **Test on Mobile**: DocuSign has excellent mobile support

### Email Notifications

**Customize Email Subject and Message**:
- Include fund name and due date
- Add branding (logo, colors)
- Keep message concise but informative
- Include contact information for questions

**Example**:
```
Subject: Action Required: Capital Call for Acme Ventures Fund III

Dear {{Investor_Name}},

Please review and sign the attached capital call document.

Amount Due: ${{Amount_Due}}
Due Date: {{Due_Date}}

Wire instructions are included in the document.

If you have any questions, please contact us at capital-calls@acme.com

Best regards,
Acme Ventures Team
```

### Signing Order

**Sequential Signing**:
- Use when signatures must be in order (investor first, then fund manager)
- Delays process slightly

**Parallel Signing**:
- All signers receive envelope simultaneously
- Faster completion

**Recommendation**: Use parallel signing unless sequential is legally required.

### Reminders

Configure automatic reminders in DocuSign:

1. **First Reminder**: 3 days after sending
2. **Second Reminder**: 1 day before due date
3. **Final Reminder**: On due date
4. **Frequency**: Every 3 days until signed

### Security

1. **Access Codes**: Require signers to enter a code (PIN)
   - Configure in template settings
   - Share code separately (phone, secure channel)

2. **ID Verification**: Require government ID upload (Enterprise only)

3. **SMS Authentication**: Send one-time code via SMS

---

## Troubleshooting

### Issue: "Consent Required"

**Cause**: JWT consent not granted

**Solution**:
1. Visit consent URL (see JWT Authentication section)
2. Log in as admin and grant consent
3. Retry in Clearway

### Issue: "Template Not Found"

**Cause**: Template ID is incorrect or template deleted

**Solution**:
1. Verify template ID in DocuSign
2. Ensure template is active (not deleted)
3. Update template ID in Clearway

### Issue: "Recipient Email Bounced"

**Cause**: Invalid email address

**Solution**:
1. Verify investor email in Clearway
2. Update email if incorrect
3. Resend envelope

### Issue: "Webhook Not Received"

**Cause**: Webhook configuration issue

**Solution**:
1. Check webhook URL is correct
2. Verify webhook is enabled in DocuSign
3. Check Clearway webhook logs for errors
4. Test webhook with DocuSign's "Send Test" feature

---

## Alternative Providers

Clearway also supports:

### HelloSign (Dropbox Sign)

- Similar to DocuSign
- OAuth 2.0 authentication
- More developer-friendly API
- See [HelloSign Setup Guide](HELLOSIGN_SETUP.md) (coming soon)

### Adobe Sign

- Enterprise-grade solution
- SAML SSO support
- Advanced workflow automation
- See [Adobe Sign Setup Guide](ADOBE_SIGN_SETUP.md) (coming soon)

---

## Getting Help

**Support Resources**:
- Email: integrations@clearway.com
- DocuSign specific: docusign@clearway.com
- DocuSign Developer Support: https://developers.docusign.com/support

**Documentation**:
- [DocuSign Developer Center](https://developers.docusign.com)
- [JWT Authentication Guide](https://developers.docusign.com/platform/auth/jwt/)
- [Clearway API Reference](../api/API_REFERENCE.md)

**Common Questions**:
- **Q: How much does DocuSign cost?**
  A: DocuSign pricing varies. Developer accounts are free for testing. Contact DocuSign sales for production pricing.

- **Q: Can I use my existing DocuSign account?**
  A: Yes! If you already have DocuSign, just connect it to Clearway.

- **Q: How many signatures can I send per month?**
  A: Depends on your DocuSign plan. Clearway has no limits.

---

**Ready to set up DocuSign?** [Connect DocuSign →](https://clearway.com/settings/integrations/docusign)

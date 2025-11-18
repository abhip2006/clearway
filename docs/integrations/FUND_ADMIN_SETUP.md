# Fund Administrator Integration Setup

This guide explains how to integrate Clearway with fund administrator platforms to automatically sync capital calls, investor data, and fund information.

## Table of Contents

1. [Overview](#overview)
2. [Supported Fund Administrators](#supported-fund-administrators)
3. [SS&C Geneva Setup](#ssc-geneva-setup)
4. [Carta Integration](#carta-integration)
5. [Juniper Square Integration](#juniper-square-integration)
6. [Altvia Integration](#altvia-integration)
7. [AllVue Integration](#allvue-integration)
8. [Generic CSV/API Integration](#generic-csvapi-integration)
9. [OAuth Flow Explanation](#oauth-flow-explanation)
10. [Webhook Configuration](#webhook-configuration)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Fund administrator integrations enable:

- **Automatic Capital Call Sync**: Receive capital calls directly from your fund administrator
- **Investor Data Mapping**: Match external investor IDs to Clearway users
- **Real-time Updates**: Get notified when new capital calls are issued
- **Bidirectional Sync**: Push payment confirmations back to the fund admin system
- **Audit Trail**: Complete history of all synced data

### Integration Architecture

```
Fund Administrator → Clearway API → Document Processing → User Notification
                     ↑
                     ├── Webhook Events
                     ├── OAuth Authentication
                     └── Field Mapping
```

### Prerequisites

Before setting up an integration:

1. **API Access**: Confirm you have API access with your fund administrator
2. **Credentials**: Obtain API keys, client IDs, and secrets
3. **Permissions**: Ensure you have admin access in both systems
4. **Clearway Plan**: Professional or Enterprise plan required for fund admin integrations

---

## Supported Fund Administrators

| Provider | Auth Method | Sync Type | Status |
|----------|-------------|-----------|--------|
| SS&C Geneva | API Key | Real-time + Scheduled | Production |
| Carta | OAuth 2.0 | Webhook | Production |
| Juniper Square | OAuth 2.0 | Real-time | Beta |
| Altvia | API Key | Scheduled | Beta |
| AllVue | SFTP + API | Scheduled | Roadmap |
| Custom CSV | Manual Upload | Manual | Production |

---

## SS&C Geneva Setup

SS&C Geneva is the market leader in fund accounting software. Clearway integrates via their REST API.

### Step 1: Obtain Geneva API Credentials

1. **Contact SS&C Support**:
   - Email: geneva-support@ssctech.com
   - Request API access for your account
   - Specify you need "Capital Call API" access

2. **Receive Credentials**:
   ```json
   {
     "apiUrl": "https://api.ssctech.com/geneva/v1",
     "clientId": "clearway_prod_xxxxx",
     "clientSecret": "sk_live_xxxxxxxxxxxxxxxx",
     "accountId": "GVA-12345"
   }
   ```

3. **Test Credentials**:
   ```bash
   curl -X POST https://api.ssctech.com/geneva/v1/auth/token \
     -H "Content-Type: application/json" \
     -d '{
       "client_id": "clearway_prod_xxxxx",
       "client_secret": "sk_live_xxxxxxxxxxxxxxxx"
     }'
   ```

### Step 2: Configure Integration in Clearway

1. Navigate to **Settings** > **Integrations** > **Fund Administrators**
2. Click **"Connect SS&C Geneva"**
3. Enter credentials:
   - **API URL**: From SS&C
   - **Client ID**: From SS&C
   - **Client Secret**: From SS&C (encrypted at rest)
   - **Account ID**: Your Geneva account ID

4. **Test Connection**: Click "Test Connection" to verify credentials

### Step 3: Configure Field Mappings

Map Geneva fields to Clearway fields:

| Geneva Field | Clearway Field | Notes |
|--------------|----------------|-------|
| `CAPITAL_CALL_ID` | `externalId` | Unique identifier |
| `FUND_CODE` | `fundName` | Via FundMapping table |
| `INVESTOR_ID` | `investorEmail` | Via InvestorMapping table |
| `CALL_AMOUNT` | `amountDue` | Decimal |
| `DUE_DATE` | `dueDate` | ISO 8601 format |
| `BANK_NAME` | `bankName` | String |
| `ACCOUNT_NUMBER` | `accountNumber` | Encrypted |
| `ROUTING_NUMBER` | `routingNumber` | Encrypted |

### Step 4: Set Up Investor Mapping

Match Geneva investor IDs to Clearway users:

1. **Import Investor List**:
   - Click **"Import Investors"** in the integration settings
   - Clearway fetches all investors from Geneva
   - Displays unmapped investors

2. **Map Investors**:
   ```typescript
   {
     "fundAdministrator": "SSC_GENEVA",
     "externalInvestorId": "GVA-INV-12345",
     "email": "investor@example.com",
     "investorName": "John Doe",
     "commitment": 1000000.00
   }
   ```

3. **Bulk Mapping via CSV**:
   ```csv
   externalInvestorId,email,investorName,commitment
   GVA-INV-12345,investor@example.com,John Doe,1000000.00
   GVA-INV-12346,jane@example.com,Jane Smith,500000.00
   ```

### Step 5: Configure Sync Settings

**Sync Frequency**:
- **Real-time**: Webhook-based (recommended)
- **Scheduled**: Hourly, daily, weekly

**Sync Options**:
```typescript
{
  "syncCapitalCalls": true,
  "syncInvestors": true,
  "syncFunds": true,
  "autoApprove": false, // Require manual review
  "notifyOnSync": true,
  "syncDirection": "BIDIRECTIONAL" // Sync payments back to Geneva
}
```

### Step 6: Test the Integration

1. **Trigger Test Sync**:
   - Click **"Test Sync"** in integration settings
   - Creates a test capital call in Clearway
   - Verifies field mappings are correct

2. **Verify Data**:
   - Check that all fields are populated correctly
   - Review confidence scores
   - Approve test capital call

3. **Enable Production Sync**:
   - Toggle **"Enable Sync"** to activate
   - Monitor first few syncs closely

### Geneva API Endpoints Used

```typescript
// Authentication
POST /auth/token

// Fetch capital calls
GET /capital-calls?accountId={accountId}&status=ACTIVE

// Fetch investor details
GET /investors/{investorId}

// Push payment confirmation
POST /capital-calls/{id}/payments
```

---

## Carta Integration

Carta provides equity management and fund administration services. Integration via OAuth 2.0 and webhooks.

### Step 1: Create Carta OAuth App

1. **Log in to Carta Admin Portal**: https://app.carta.com/admin
2. **Navigate to**: **Settings** > **API & Integrations**
3. **Create New OAuth App**:
   - **App Name**: Clearway Integration
   - **Redirect URI**: `https://clearway.com/api/webhooks/fund-admin/carta/callback`
   - **Scopes**:
     - `capital_calls:read`
     - `investors:read`
     - `funds:read`

4. **Save Credentials**:
   ```json
   {
     "clientId": "carta_xxxxxxxxxx",
     "clientSecret": "sk_carta_xxxxxxxxxxxxxxxx",
     "redirectUri": "https://clearway.com/api/webhooks/fund-admin/carta/callback"
   }
   ```

### Step 2: Connect to Clearway

1. Navigate to **Settings** > **Integrations** > **Carta**
2. Click **"Connect Carta"**
3. **OAuth Authorization Flow**:
   - Redirected to Carta login page
   - Grant Clearway access to your data
   - Redirected back to Clearway

4. **Verify Connection**:
   - Green checkmark indicates successful connection
   - View connected account details

### Step 3: Configure Webhook

Carta sends real-time notifications for capital calls:

1. **In Carta Admin Portal**:
   - Navigate to **Settings** > **Webhooks**
   - Click **"Add Webhook Endpoint"**
   - **URL**: `https://clearway.com/api/webhooks/fund-admin/carta`
   - **Events**:
     - `capital_call.created`
     - `capital_call.updated`
     - `capital_call.canceled`

2. **Verify Webhook**:
   - Carta sends a test event
   - Clearway automatically validates the signature
   - Check **Integration Logs** for verification

### Step 4: Investor Mapping

Same process as Geneva (see above), but with Carta investor IDs:

```typescript
{
  "fundAdministrator": "CARTA",
  "externalInvestorId": "carta_inv_xxxxxxxxxx",
  "email": "investor@example.com",
  "investorName": "John Doe"
}
```

### Step 5: Enable Auto-Sync

Toggle **"Auto-Sync Capital Calls"** to automatically create capital calls in Clearway when received from Carta.

### Carta Webhook Payload Example

```json
{
  "event": "capital_call.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "carta_cc_xxxxxxxxxx",
    "fund_id": "carta_fund_xxxxxxxxxx",
    "fund_name": "Acme Ventures Fund III",
    "investor_id": "carta_inv_xxxxxxxxxx",
    "amount": 100000.00,
    "currency": "USD",
    "due_date": "2025-02-15",
    "wire_instructions": {
      "bank_name": "JP Morgan Chase",
      "account_number": "1234567890",
      "routing_number": "021000021",
      "reference": "ACME-CC-001"
    }
  }
}
```

---

## Juniper Square Integration

Juniper Square is a leading investor management platform for alternative investments.

### Step 1: Obtain API Access

1. **Contact Juniper Square**:
   - Email: support@junipersquare.com
   - Request API access for Clearway integration

2. **Receive OAuth Credentials**:
   ```json
   {
     "clientId": "js_client_xxxxxxxxxx",
     "clientSecret": "sk_js_xxxxxxxxxxxxxxxx",
     "apiUrl": "https://api.junipersquare.com/v1"
   }
   ```

### Step 2: OAuth Connection

Similar to Carta:

1. Navigate to **Settings** > **Integrations** > **Juniper Square**
2. Click **"Connect"**
3. Authorize access
4. Map investors and funds

### Step 3: Configure Sync

**Sync Settings**:
- **Frequency**: Real-time via webhooks
- **Auto-Approve**: Disabled (manual review recommended)
- **Notification**: Email on new capital calls

---

## Altvia Integration

Altvia provides CRM and investor relations software for private equity.

### Step 1: API Key Setup

1. **In Altvia**: Navigate to **Settings** > **API**
2. **Generate API Key**: Click "Generate New Key"
3. **Copy Credentials**:
   ```json
   {
     "apiKey": "altvia_xxxxxxxxxxxxxxxx",
     "apiUrl": "https://api.altvia.com/v2"
   }
   ```

### Step 2: Connect to Clearway

1. Navigate to **Settings** > **Integrations** > **Altvia**
2. Enter API key
3. Test connection

### Step 3: Scheduled Sync

Altvia uses scheduled polling (no webhooks):

- **Sync Frequency**: Every 4 hours
- **Method**: REST API polling
- **Data**: Capital calls, investors, funds

---

## AllVue Integration

AllVue is an enterprise-grade fund accounting platform.

### Roadmap Feature

AllVue integration is currently in development. Expected Q2 2025.

**Planned Features**:
- SFTP file transfer for capital calls
- API for investor data
- Scheduled sync (daily)

**Beta Access**: Contact sales@clearway.com to join beta program.

---

## Generic CSV/API Integration

For fund administrators not yet supported, use the CSV upload or custom API integration.

### CSV Upload

1. **Download Template**: Navigate to **Integrations** > **CSV Import** > **Download Template**
2. **Fill in Data**:
   ```csv
   fundName,investorEmail,amountDue,dueDate,bankName,accountNumber,routingNumber,wireReference
   Acme Fund III,investor@example.com,100000.00,2025-02-15,JP Morgan,1234567890,021000021,ACME-001
   ```

3. **Upload CSV**: Drag and drop or select file
4. **Review & Import**: Preview data before importing

### Custom API Integration

If your fund administrator has an API, we can build a custom integration:

1. **Contact Clearway**: Email integrations@clearway.com
2. **Provide API Documentation**: Share API docs and credentials
3. **Development Timeline**: Typically 4-6 weeks
4. **Cost**: Included in Enterprise plan, $5,000 one-time fee for Professional plan

---

## OAuth Flow Explanation

Understanding OAuth for fund admin integrations.

### OAuth 2.0 Authorization Code Flow

```
1. User clicks "Connect Carta" in Clearway
   ↓
2. Clearway redirects to Carta authorization page
   ↓
3. User logs into Carta and grants permissions
   ↓
4. Carta redirects back to Clearway with authorization code
   ↓
5. Clearway exchanges code for access token (server-side)
   ↓
6. Access token stored securely (encrypted)
   ↓
7. Clearway uses access token to fetch data
```

### Token Refresh

Access tokens expire periodically. Clearway automatically refreshes them:

```typescript
// Token refresh flow
if (token.expiresAt < Date.now()) {
  const newToken = await refreshAccessToken(token.refreshToken);
  await updateStoredToken(newToken);
}
```

### Security

- **Tokens encrypted at rest** using AES-256
- **Tokens never exposed** to client
- **Automatic revocation** on disconnect
- **Audit trail** of all token usage

---

## Webhook Configuration

### Setting Up Webhooks

Webhooks enable real-time data sync from fund administrators.

### Webhook Endpoint

```
POST https://clearway.com/api/webhooks/fund-admin/{provider}
```

**Supported Providers**:
- `carta`
- `juniper-square`
- `ssc-geneva` (coming soon)

### Webhook Security

**HMAC Signature Verification**:

All webhook requests include an HMAC signature for security:

```typescript
// Verify webhook signature
const signature = request.headers['x-webhook-signature'];
const payload = request.body;
const secret = process.env.WEBHOOK_SECRET;

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Webhook Events

| Event | Description | Payload |
|-------|-------------|---------|
| `capital_call.created` | New capital call issued | Full capital call object |
| `capital_call.updated` | Capital call modified | Updated fields only |
| `capital_call.canceled` | Capital call canceled | Capital call ID |
| `investor.updated` | Investor info changed | Updated investor object |
| `fund.updated` | Fund info changed | Updated fund object |

### Webhook Retry Logic

If Clearway is temporarily unavailable:

1. **Immediate Retry**: After 1 second
2. **Exponential Backoff**: 5s, 25s, 125s
3. **Maximum Attempts**: 5 retries
4. **Manual Retry**: Available in admin panel

### Monitoring Webhooks

View webhook delivery logs:

1. Navigate to **Settings** > **Integrations** > **Webhook Logs**
2. **Filter by**:
   - Provider
   - Event type
   - Status (success/failed)
   - Date range

---

## Troubleshooting

### Common Issues

#### Issue: "Invalid API Credentials"

**Cause**: Incorrect API key or client secret

**Solution**:
1. Verify credentials are correct (copy-paste to avoid typos)
2. Check if credentials have expired
3. Regenerate credentials if necessary
4. Contact fund administrator support

#### Issue: "Investor Not Found"

**Cause**: Investor not mapped in Clearway

**Solution**:
1. Navigate to **Integrations** > **[Provider]** > **Unmapped Investors**
2. Map investor to Clearway user
3. Retry sync

#### Issue: "Sync Failed - Timeout"

**Cause**: Large dataset or network issues

**Solution**:
1. Check fund administrator API status
2. Reduce sync batch size
3. Enable scheduled sync instead of real-time
4. Contact Clearway support

#### Issue: "Webhook Signature Verification Failed"

**Cause**: Incorrect webhook secret or payload tampering

**Solution**:
1. Verify webhook secret matches in both systems
2. Check for man-in-the-middle attacks
3. Regenerate webhook secret
4. Contact security@clearway.com if suspicious activity

### Sync Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | `SUCCESS` | Sync completed successfully |
| 206 | `PARTIAL_FAILURE` | Some records failed |
| 400 | `VALIDATION_ERROR` | Invalid data format |
| 401 | `UNAUTHORIZED` | Authentication failed |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Debug Mode

Enable debug logging for troubleshooting:

1. Navigate to **Settings** > **Integrations** > **Advanced**
2. Toggle **"Enable Debug Logging"**
3. View detailed logs in **Integration Logs**
4. **Note**: Automatically disables after 24 hours for performance

### Getting Support

**Integration Support**:
- Email: integrations@clearway.com
- Response time: 4 hours (Enterprise), 24 hours (Professional)
- Include:
  - Integration provider
  - Error messages
  - Sync logs
  - Approximate time of issue

**Emergency Support** (Enterprise only):
- Phone: 1-800-CLEARWAY
- 24/7 availability
- 1-hour response SLA

---

## Best Practices

### Security

1. **Rotate API Keys** quarterly
2. **Use separate credentials** for production and testing
3. **Enable IP allowlisting** when possible
4. **Monitor webhook logs** for suspicious activity

### Data Quality

1. **Map all investors** before enabling auto-sync
2. **Review first 10 syncs** manually
3. **Set up validation rules** for critical fields
4. **Regular audits** of mapped data

### Performance

1. **Use webhooks** when available (faster than polling)
2. **Limit sync scope** to recent data only
3. **Schedule heavy syncs** during off-peak hours
4. **Monitor API rate limits**

### Monitoring

1. **Set up alerts** for failed syncs
2. **Weekly review** of integration health
3. **Track sync metrics** (success rate, latency)
4. **Document field mappings** for reference

---

## FAQ

**Q: Can I connect multiple fund administrators?**
A: Yes, you can connect unlimited fund administrators on Enterprise plans. Professional plans support up to 3.

**Q: How long does initial sync take?**
A: Depends on data volume. Typically:
- <100 investors: 5-10 minutes
- 100-1000 investors: 30-60 minutes
- 1000+ investors: 2-4 hours

**Q: Can I sync historical capital calls?**
A: Yes, you can import historical data during initial setup. Specify date range in sync settings.

**Q: What happens if I disconnect an integration?**
A: Existing data remains in Clearway. Future syncs stop. You can reconnect anytime without data loss.

**Q: Are there API rate limits?**
A: Clearway has generous limits:
- Professional: 100,000 requests/month
- Enterprise: Unlimited
Fund administrator APIs may have their own limits.

---

**Need help?** Contact integrations@clearway.com or book a setup call with our team.

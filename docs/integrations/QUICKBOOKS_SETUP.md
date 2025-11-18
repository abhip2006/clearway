# QuickBooks Integration Setup

This guide explains how to integrate Clearway with QuickBooks Online to automatically sync capital calls, payments, and create journal entries.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Creating QuickBooks OAuth App](#creating-quickbooks-oauth-app)
4. [Connecting to Clearway](#connecting-to-clearway)
5. [Account Mapping](#account-mapping)
6. [Sync Settings](#sync-settings)
7. [Transaction Types](#transaction-types)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The QuickBooks integration enables:

- **Automatic Journal Entries**: Create journal entries when capital calls are approved
- **Payment Sync**: Sync payments to QuickBooks deposits
- **Two-way Sync**: Keep data in sync between systems
- **Account Mapping**: Map Clearway funds to QuickBooks accounts
- **Tax Reporting**: Ensure accurate financial records for tax purposes

### Integration Flow

```
Capital Call Approved
    ↓
Create Journal Entry in QuickBooks
    ├── Debit: Capital Call Receivable
    └── Credit: Partner Capital Account
    ↓
Payment Received
    ↓
Create Deposit in QuickBooks
    ├── Debit: Operating Bank Account
    └── Credit: Capital Call Receivable
```

---

## Prerequisites

Before you begin:

1. **QuickBooks Online Account**:
   - QuickBooks Online (Desktop version not supported)
   - Admin or Accountant access required

2. **Clearway Plan**:
   - Professional or Enterprise plan
   - Accounting integrations included

3. **Chart of Accounts**:
   - Capital Call Receivable account
   - Partner Capital accounts for each fund
   - Operating bank account

---

## Creating QuickBooks OAuth App

### Step 1: Set Up Intuit Developer Account

1. **Go to**: https://developer.intuit.com
2. **Sign in** with your Intuit credentials
3. **Create App**: Click "My Apps" > "Create App"
4. **Select Platform**: Choose "QuickBooks Online"

### Step 2: Configure OAuth Settings

1. **App Name**: "Clearway Integration"
2. **App Type**: Select "Web App"
3. **Redirect URI**:
   ```
   https://clearway.com/api/integrations/quickbooks/callback
   ```

4. **Scopes**: Select the following:
   - `com.intuit.quickbooks.accounting` - Full accounting access
   - `com.intuit.quickbooks.payment` - Payment processing

### Step 3: Get Credentials

After creating the app:

```json
{
  "clientId": "ABxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "clientSecret": "abcdefghijklmnopqrstuvwxyz123456",
  "environment": "sandbox", // or "production"
  "redirectUri": "https://clearway.com/api/integrations/quickbooks/callback"
}
```

**Important**: Keep the client secret secure. Never share it or commit to version control.

### Step 4: Test in Sandbox (Recommended)

1. **Create Test Company**: In Intuit Developer Portal
2. **Connect to Sandbox**: Use sandbox credentials in Clearway
3. **Test Transactions**: Verify sync works correctly
4. **Switch to Production**: Once tested, use production credentials

---

## Connecting to Clearway

### Step 1: Navigate to Integrations

1. Log in to Clearway
2. Go to **Settings** > **Integrations** > **Accounting**
3. Click **"Connect QuickBooks"**

### Step 2: OAuth Authorization

You'll be redirected to QuickBooks:

1. **Select Company**: Choose the QuickBooks company to connect
2. **Authorize**: Click "Authorize" to grant Clearway access
3. **Redirect Back**: You'll be redirected to Clearway

### Step 3: Verify Connection

After authorization:

- ✅ Green checkmark indicates success
- View connected company details:
  - Company name
  - Company ID (Realm ID)
  - Connection date
  - Last sync time

---

## Account Mapping

Map Clearway funds to QuickBooks accounts for accurate bookkeeping.

### Step 1: Chart of Accounts Setup

Create these accounts in QuickBooks (if not already existing):

| Account Name | Type | Detail Type | Description |
|--------------|------|-------------|-------------|
| Capital Call Receivable | Other Current Assets | Prepaid Expenses | Tracks outstanding capital calls |
| Fund I - Partner Capital | Equity | Partner's Equity | Partner capital for Fund I |
| Fund II - Partner Capital | Equity | Partner's Equity | Partner capital for Fund II |
| Operating Bank Account | Bank | Checking | Main operating account |

### Step 2: Map Accounts in Clearway

1. Navigate to **Settings** > **Integrations** > **QuickBooks** > **Account Mapping**

2. **Map Each Fund**:
   ```typescript
   {
     "Acme Ventures Fund I": {
       "receivableAccount": "Capital Call Receivable",
       "capitalAccount": "Fund I - Partner Capital",
       "bankAccount": "Operating Bank Account",
       "revenueAccount": "Management Fees" // Optional
     },
     "Acme Ventures Fund II": {
       "receivableAccount": "Capital Call Receivable",
       "capitalAccount": "Fund II - Partner Capital",
       "bankAccount": "Operating Bank Account"
     }
   }
   ```

3. **Click Save**: Mappings are stored and used for all future syncs

### Step 3: Investor/Customer Mapping

Map Clearway investors to QuickBooks customers:

**Option A: Auto-Create Customers** (Recommended)
- Clearway automatically creates customers in QuickBooks
- Uses investor email as customer name
- Links transactions automatically

**Option B: Manual Mapping**
- Map each investor to existing QuickBooks customer
- Navigate to **Integrations** > **QuickBooks** > **Customer Mapping**
- Select Clearway investor and corresponding QuickBooks customer

---

## Sync Settings

Configure how and when data syncs between systems.

### Sync Frequency

1. Navigate to **Settings** > **Integrations** > **QuickBooks** > **Sync Settings**

2. **Choose Frequency**:
   - **Real-time**: Sync immediately when capital calls are approved/paid (recommended)
   - **Daily**: Sync once per day at midnight
   - **Weekly**: Sync every Monday
   - **Manual**: Only sync when you click "Sync Now"

### Sync Options

```typescript
{
  "syncCapitalCalls": true,          // Create journal entries for approved capital calls
  "syncPayments": true,               // Create deposits for payments
  "autoReconcile": false,             // Auto-mark as reconciled in QB
  "syncDirection": "CLEARWAY_TO_QB",  // One-way sync from Clearway
  "createCustomers": true,            // Auto-create customers for investors
  "syncHistorical": false,            // Sync historical data (enable once)
  "notifyOnError": true               // Email notifications for sync errors
}
```

### Historical Data Sync

To sync existing capital calls:

1. Enable **"Sync Historical Data"**
2. **Select Date Range**: e.g., "Last 12 months"
3. **Click "Start Sync"**
4. **Monitor Progress**: View sync status in logs
5. **Review in QuickBooks**: Verify all transactions created correctly
6. **Disable Historical Sync**: Turn off after initial sync completes

---

## Transaction Types

### Capital Call Journal Entry

When a capital call is **approved** in Clearway:

**QuickBooks Journal Entry**:
```
Date: Capital call due date
Journal Entry #: CLEARWAY-CC-001

Debit:  Capital Call Receivable    $100,000.00
Credit: Fund I - Partner Capital              $100,000.00

Memo: Capital Call for Acme Ventures Fund I - Investor: John Doe
```

**Metadata Synced**:
- Investor name (in memo)
- Fund name
- Capital call reference number
- Due date

### Payment Deposit

When a payment is **reconciled** in Clearway:

**QuickBooks Deposit**:
```
Date: Payment received date
Deposit To: Operating Bank Account
Amount: $100,000.00

From Account: Capital Call Receivable
Payment Method: Wire Transfer
Reference: SWIFT-REF-12345
Memo: Payment for CC-001 from John Doe
```

### Partial Payment

If payment is partial:

**First Payment** (e.g., $60,000 of $100,000):
```
Debit:  Operating Bank Account     $60,000.00
Credit: Capital Call Receivable              $60,000.00

Memo: Partial payment 1 of 2 for CC-001
```

**Second Payment** ($40,000):
```
Debit:  Operating Bank Account     $40,000.00
Credit: Capital Call Receivable              $40,000.00

Memo: Final payment for CC-001
```

### Rejected Capital Call

If a capital call is **rejected** in Clearway:

**QuickBooks Action**:
- Original journal entry is **voided**
- Memo updated: "VOIDED - Capital call rejected"
- Clearway tracks void reason in metadata

---

## Troubleshooting

### Common Issues

#### Issue: "OAuth Token Expired"

**Cause**: QuickBooks access tokens expire after 100 days of inactivity

**Solution**:
1. Disconnect QuickBooks integration
2. Reconnect using OAuth flow
3. Tokens automatically refresh in the future

#### Issue: "Account Not Found"

**Cause**: Mapped account doesn't exist in QuickBooks

**Solution**:
1. Verify account exists in QuickBooks Chart of Accounts
2. Check account name matches exactly (case-sensitive)
3. Update mapping in Clearway

#### Issue: "Duplicate Transaction"

**Cause**: Transaction synced twice

**Solution**:
1. Check QuickBooks for duplicate
2. Clearway prevents duplicates using external IDs
3. Manually delete duplicate in QuickBooks if needed
4. Contact support if issue persists

#### Issue: "Insufficient Permissions"

**Cause**: QuickBooks user lacks admin access

**Solution**:
1. Have QuickBooks admin reconnect integration
2. Ensure user has "Full Access" role in QuickBooks

### Sync Error Logs

View detailed sync logs:

1. Navigate to **Settings** > **Integrations** > **QuickBooks** > **Sync Logs**

2. **Log Details**:
   - Timestamp
   - Transaction type (journal entry, deposit)
   - Status (success, failed)
   - Error message (if failed)
   - QuickBooks transaction ID

3. **Retry Failed Syncs**:
   - Select failed transactions
   - Click **"Retry"**
   - Review error messages

### Testing the Integration

**Test Checklist**:

1. ✅ Create test capital call in Clearway
2. ✅ Approve capital call
3. ✅ Verify journal entry created in QuickBooks
4. ✅ Record test payment in Clearway
5. ✅ Verify deposit created in QuickBooks
6. ✅ Check amounts match
7. ✅ Verify account mappings correct
8. ✅ Test rejection flow (void journal entry)

---

## Advanced Configuration

### Custom Field Mapping

Map custom fields from Clearway to QuickBooks:

```typescript
{
  "customFieldMappings": {
    "clearway.fundType": "qb.Class",           // Map fund type to QB class
    "clearway.investorType": "qb.Location",    // Map investor type to QB location
    "clearway.vintage": "qb.CustomField1"      // Map vintage to custom field
  }
}
```

### Multi-Entity Setup (Enterprise)

For organizations with multiple QuickBooks companies:

1. **Connect Multiple Companies**:
   - Each company requires separate OAuth connection
   - Map each company to a Clearway organization

2. **Configure Entity Mappings**:
   ```typescript
   {
     "Clearway Org 1": "QuickBooks Company A",
     "Clearway Org 2": "QuickBooks Company B"
   }
   ```

### Tax Settings

Configure tax-related settings:

1. Navigate to **Integrations** > **QuickBooks** > **Tax Settings**

2. **Configure**:
   - **Tax Year**: Fiscal vs calendar year
   - **K-1 Mapping**: Map to QuickBooks tax fields
   - **Partner Percentages**: Sync ownership percentages

---

## Best Practices

### Reconciliation

1. **Monthly Reconciliation**:
   - Compare Clearway vs QuickBooks monthly
   - Use Clearway's reconciliation report
   - Identify and resolve discrepancies

2. **Year-End Close**:
   - Sync all transactions before closing books
   - Generate final reconciliation report
   - Archive for audit purposes

### Security

1. **Rotate OAuth Tokens**: Reconnect annually
2. **Limit Access**: Only grant QuickBooks admin access to necessary personnel
3. **Audit Trail**: Review sync logs quarterly

### Performance

1. **Batch Sync**: Use scheduled sync for high-volume periods
2. **Optimize Mappings**: Keep account mappings up to date
3. **Monitor Errors**: Set up email alerts for sync failures

---

## Other Accounting Platforms

### Xero Integration

Similar to QuickBooks, with minor differences:

- OAuth 2.0 authentication
- Different account types
- See [Xero Setup Guide](XERO_SETUP.md) (coming soon)

### NetSuite Integration (Enterprise)

For larger organizations:

- SOAP/REST API integration
- More complex account mappings
- Contact sales@clearway.com for setup

---

## Getting Help

**Support Resources**:
- Email: integrations@clearway.com
- QuickBooks specific: quickbooks@clearway.com
- In-app chat: Available 9am-5pm EST
- Phone: 1-800-CLEARWAY (Enterprise customers)

**Documentation**:
- [QuickBooks API Docs](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/)
- [Clearway API Reference](../api/API_REFERENCE.md)
- [Payment Reconciliation Guide](../user-guide/PAYMENT_RECONCILIATION.md)

**Training**:
- Monthly webinar: "QuickBooks + Clearway Best Practices"
- Register: training@clearway.com

---

**Ready to connect?** [Set up QuickBooks integration →](https://clearway.com/settings/integrations/quickbooks)

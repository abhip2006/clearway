# Payment Reconciliation Guide

This guide explains how Clearway's automated payment reconciliation works, including SWIFT message processing, ACH transactions, bank statement uploads, and manual matching.

## Table of Contents

1. [Overview](#overview)
2. [How Payment Matching Works](#how-payment-matching-works)
3. [SWIFT Message Processing](#swift-message-processing)
4. [ACH Transaction Processing](#ach-transaction-processing)
5. [Bank Statement Upload](#bank-statement-upload)
6. [Manual Matching Process](#manual-matching-process)
7. [Reconciliation Best Practices](#reconciliation-best-practices)
8. [Reporting and Analytics](#reporting-and-analytics)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Payment reconciliation automatically matches incoming payments to capital calls, reducing manual work and errors.

### Benefits

- **Automatic Matching**: 90%+ of payments matched automatically
- **Time Savings**: Reduce reconciliation from hours to minutes
- **Accuracy**: Eliminate manual data entry errors
- **Real-time Updates**: Know immediately when payments arrive
- **Audit Trail**: Complete history of all payment matching

### Supported Payment Methods

| Method | Auto-Match Rate | Processing Time |
|--------|-----------------|-----------------|
| **Wire Transfer (SWIFT)** | 95% | Real-time |
| **ACH** | 90% | Same day |
| **Check** | Manual | Manual entry |
| **Bank Statement** | 85% | On upload |

---

## How Payment Matching Works

Clearway uses multiple algorithms to match payments to capital calls:

### Matching Algorithm

```typescript
// Matching priority (in order):
1. Wire Reference Number (exact match)
2. Amount + Due Date + Investor (exact match)
3. Amount + Bank Account + Investor (fuzzy match)
4. Amount + Date Range + Fund (fuzzy match)
5. Manual matching
```

### Matching Confidence Levels

| Confidence | Criteria | Action |
|------------|----------|--------|
| **100%** | Exact reference number match | Auto-reconcile |
| **95-99%** | Amount + investor + date match | Auto-reconcile (if enabled) |
| **85-94%** | Amount + fund match | Suggest match (manual approval) |
| **<85%** | Partial matches | Manual review required |

### Payment Status Flow

```
Payment Received
    ↓
Automatic Matching
    ↓
┌─────────────┬─────────────┬─────────────┐
│ Matched     │ Suggested   │ Unmatched   │
│ (100%)      │ (85-99%)    │ (<85%)      │
└─────────────┴─────────────┴─────────────┘
    ↓              ↓              ↓
Auto-Reconcile  Manual Review  Manual Match
    ↓              ↓              ↓
Capital Call Status → PAID
```

---

## SWIFT Message Processing

SWIFT (Society for Worldwide Interbank Financial Telecommunication) is the standard for international wire transfers.

### SWIFT Message Format (MT103)

Clearway processes MT103 (Single Customer Credit Transfer) messages:

```
{1:F01BANKUS33AXXX0000000000}
{2:I103BANKGB2LXXXXN}
{3:{108:REF12345}}
{4:
:20:TRANSACTION-REF-001
:23B:CRED
:32A:250115USD100000,00
:50K:/1234567890
ACME VENTURES LP
123 MAIN STREET
NEW YORK, NY 10001
:59:/0987654321
INVESTOR NAME
456 INVESTOR ROAD
SAN FRANCISCO, CA 94102
:70:CAPITAL CALL ACME-CC-001
:71A:SHA
-}
```

### Key Fields Extracted

| Field | Tag | Description | Used For Matching |
|-------|-----|-------------|-------------------|
| **Transaction Reference** | :20: | Unique transaction ID | Primary matching |
| **Amount** | :32A: | Payment amount and currency | Amount verification |
| **Ordering Customer** | :50K: | Sender details | Investor identification |
| **Beneficiary** | :59: | Recipient details | Validation |
| **Remittance Info** | :70: | Wire reference/notes | **Capital call reference** |

### Setting Up SWIFT Integration

1. **Contact Your Bank**:
   - Request API access or SWIFT message forwarding
   - Provide Clearway's email for SWIFT message delivery:
     - Email: swift@clearway.com
     - Or configure bank's API integration

2. **Configure in Clearway**:
   - Navigate to **Settings** > **Payments** > **SWIFT Integration**
   - **Option A - Email Forwarding**:
     - Bank forwards SWIFT messages to swift@clearway.com
     - Clearway automatically processes incoming messages
   - **Option B - API Integration**:
     - Enter bank API credentials
     - Clearway polls for new messages every 15 minutes

3. **Test with Sample Transaction**:
   - Have bank send test SWIFT message
   - Verify Clearway receives and processes it
   - Check matching works correctly

### SWIFT Message Processing Flow

```
SWIFT Message Received
    ↓
Parse MT103 Format
    ↓
Extract Key Fields (amount, reference, sender)
    ↓
Match to Capital Call (by wire reference)
    ↓
Create Payment Record
    ↓
Auto-Reconcile (if high confidence)
    ↓
Notify User
```

---

## ACH Transaction Processing

ACH (Automated Clearing House) transactions are processed through Plaid integration.

### Setting Up ACH Integration

1. **Connect Bank Account via Plaid**:
   - Navigate to **Settings** > **Payments** > **Bank Accounts**
   - Click **"Connect Bank Account"**
   - Select your bank and log in
   - Authorize Clearway to read transactions

2. **Configure ACH Sync**:
   - **Sync Frequency**: Daily (recommended)
   - **Look-back Period**: 30 days
   - **Auto-Reconcile**: Enable for high-confidence matches

### ACH Transaction Format

```typescript
interface ACHTransaction {
  id: string;
  amount: number;
  date: Date;
  description: string; // Key field for matching
  type: 'DEBIT' | 'CREDIT';
  category: string;
  merchant: string;
  accountId: string;
}
```

### Matching ACH Transactions

ACH transactions have less structured data than SWIFT, so matching uses:

1. **Amount Matching**: Exact amount to capital call
2. **Date Window**: ±3 days from due date
3. **Description Parsing**: Extract fund name or investor name
4. **Investor Association**: Match based on linked bank account

### Example ACH Description Parsing

```
Input: "ACH CREDIT ACME VENTURES FUND III CC-001"
Output:
  - Fund: "ACME VENTURES FUND III"
  - Reference: "CC-001"
  - Match Confidence: 95%
```

---

## Bank Statement Upload

For banks without API integration, upload statements manually.

### Supported Formats

- **PDF**: Parsed using OCR + AI extraction
- **CSV/Excel**: Structured data import
- **OFX/QFX**: Quicken/QuickBooks format
- **MT940**: SWIFT statement format

### Upload Process

1. **Navigate to Payments** > **Reconciliation** > **Upload Statement**

2. **Select File**:
   - Drag and drop bank statement
   - Supported formats: PDF, CSV, XLS, OFX, MT940

3. **Review Extracted Transactions**:
   - Clearway extracts all transactions
   - Preview before import

4. **Configure Import Settings**:
   ```typescript
   {
     "dateFormat": "MM/DD/YYYY",
     "amountColumn": "Amount",
     "descriptionColumn": "Description",
     "dateColumn": "Date",
     "skipRows": 2 // Header rows
   }
   ```

5. **Import and Match**:
   - Click **"Import"**
   - Automatic matching begins
   - Review suggested matches

### PDF Statement Processing

For PDF bank statements:

1. **OCR Extraction**: Azure Document Intelligence extracts text
2. **Table Detection**: Identifies transaction table
3. **Row Parsing**: Extracts date, amount, description
4. **Validation**: Checks for parsing errors
5. **Manual Review**: Review low-confidence extractions

### CSV/Excel Import

**CSV Template**:
```csv
Date,Description,Amount,Type,Balance
01/15/2025,"ACH CREDIT ACME VENTURES",100000.00,CREDIT,1500000.00
01/16/2025,"WIRE TRANSFER XYZ FUND",50000.00,CREDIT,1550000.00
```

**Column Mapping**:
- Required: Date, Amount, Description
- Optional: Type, Balance, Reference

---

## Manual Matching Process

When automatic matching fails or confidence is low, manually match payments.

### Unmatched Payments Dashboard

1. Navigate to **Payments** > **Unmatched**
2. **View Unmatched Payments**:
   - Payment amount
   - Date received
   - Description/reference
   - Suggested matches (if any)

### Manual Match Steps

1. **Select Unmatched Payment**:
   - Click on payment to view details
   - See full transaction information

2. **Review Suggested Matches**:
   - Clearway shows potential capital calls
   - Match confidence scores displayed
   - Reason for suggestion shown

3. **Select Capital Call**:
   - Choose from suggested matches
   - Or search for capital call manually
   - Filter by fund, investor, amount, date

4. **Verify Match**:
   - Confirm amounts match
   - Check investor details
   - Verify wire reference (if applicable)

5. **Reconcile**:
   - Click **"Match Payment"**
   - Add optional notes
   - Capital call status updated to PAID

### Partial Payments

If payment is less than capital call amount:

1. **Mark as Partial Payment**:
   - Enter actual amount received
   - Remaining balance calculated automatically

2. **Capital Call Status**:
   - Status: `PARTIAL`
   - Remaining: $XX,XXX.XX
   - Awaiting second payment

3. **Match Second Payment**:
   - When second payment arrives
   - Match to same capital call
   - Status updated to PAID when fully paid

### Overpayments

If payment exceeds capital call amount:

1. **Mark as Overpaid**:
   - Record full amount received
   - Overpayment amount calculated

2. **Options**:
   - **Apply to Next Capital Call**: Credit forward
   - **Refund**: Process refund
   - **Leave as Credit**: Keep on account

---

## Reconciliation Best Practices

### Before Payment Season

1. **Update Wire Instructions**:
   - Ensure all capital calls have correct wire instructions
   - Include unique wire reference numbers

2. **Connect Bank Accounts**:
   - Set up Plaid integration
   - Or configure SWIFT message forwarding

3. **Map All Investors**:
   - Complete investor mapping for fund admin integrations
   - Verify email addresses are correct

### During Reconciliation

1. **Daily Monitoring**:
   - Check unmatched payments dashboard daily
   - Review suggested matches promptly

2. **Prioritize High-Value**:
   - Reconcile largest payments first
   - Flag unusual transactions

3. **Document Exceptions**:
   - Add notes to manual matches
   - Document reasons for discrepancies

### After Reconciliation

1. **Review Reconciliation Report**:
   - Total payments received
   - Total outstanding
   - Discrepancies

2. **Export for Accounting**:
   - Export to QuickBooks/Xero
   - Generate journal entries

3. **Archive Bank Statements**:
   - Store in Clearway for audit trail
   - Automatically retained per GDPR policy

### Wire Reference Best Practices

To maximize auto-matching rates:

1. **Use Unique References**:
   - Format: `FUND-CC-001`, `FUND-CC-002`
   - Include fund identifier and sequential number

2. **Communicate to Investors**:
   - Email wire instructions with reference
   - Bold/highlight the reference number
   - Explain importance of including reference

3. **Validate References**:
   - Check that reference appears in SWIFT message
   - Follow up with investors if missing

---

## Reporting and Analytics

### Reconciliation Dashboard

View key metrics:

- **Total Payments Received**: $X,XXX,XXX
- **Auto-Matched**: XX%
- **Manually Matched**: XX%
- **Unmatched**: XX payments
- **Average Match Time**: X minutes

### Payment Reports

Generate reports:

1. **Reconciliation Summary**:
   - By fund
   - By date range
   - By investor

2. **Outstanding Capital Calls**:
   - Due this week
   - Overdue
   - By amount

3. **Payment Aging**:
   - 0-7 days
   - 8-14 days
   - 15-30 days
   - 30+ days

4. **Bank Reconciliation**:
   - Beginning balance
   - Payments received
   - Payments pending
   - Ending balance

### Export Options

- **CSV**: For Excel analysis
- **PDF**: For printing/archiving
- **QuickBooks**: Direct sync
- **API**: Custom integrations

---

## Troubleshooting

### Issue: Payment Not Matching Automatically

**Possible Causes**:
1. Wire reference missing or incorrect
2. Amount doesn't match exactly
3. Investor not mapped
4. Due date mismatch

**Solutions**:
1. Check wire reference in SWIFT message
2. Verify amounts match (including decimals)
3. Map investor if unmapped
4. Manually match if needed

### Issue: SWIFT Messages Not Being Received

**Possible Causes**:
1. Bank not forwarding messages
2. Email filtering/spam
3. API credentials incorrect

**Solutions**:
1. Contact bank to verify forwarding setup
2. Whitelist swift@clearway.com
3. Verify API credentials
4. Check integration logs

### Issue: ACH Transactions Missing

**Possible Causes**:
1. Plaid connection expired
2. Bank not supported
3. Account not linked

**Solutions**:
1. Reconnect bank account via Plaid
2. Use manual statement upload instead
3. Verify account is selected for sync

### Issue: Duplicate Payments

**Possible Causes**:
1. Same payment imported twice (statement + SWIFT)
2. Correction transactions

**Solutions**:
1. Check payment IDs for duplicates
2. Clearway auto-deduplicates based on transaction ID
3. Manually mark as duplicate if needed

---

## FAQ

**Q: How long does it take to match a payment?**
A: Automatic matching happens within seconds of receiving the transaction. Manual matching depends on your team's review speed.

**Q: Can I undo a reconciliation?**
A: Yes, admins can unreconcile payments if needed. The action is logged in the audit trail.

**Q: What if the payment amount is in a different currency?**
A: Clearway automatically converts using real-time exchange rates (via Stripe). You can override the rate if needed.

**Q: How do I handle partial payments?**
A: Mark the first payment as "Partial" and match subsequent payments to the same capital call until fully paid.

**Q: Can I reconcile payments from multiple bank accounts?**
A: Yes, connect multiple bank accounts and Clearway will aggregate all transactions.

---

## Getting Help

**Support**:
- Email: payments@clearway.com
- In-app chat: Click the help icon
- Office hours: Schedule a reconciliation training session

**Resources**:
- [QuickBooks Integration](QUICKBOOKS_SETUP.md) - Sync payments to accounting
- [API Reference](../api/API_REFERENCE.md#payments) - API endpoints for payments
- [Admin Guide](ADMIN_GUIDE.md) - Managing payment settings

---

**Ready to reconcile?** [Connect your bank account →](https://clearway.com/settings/payments)

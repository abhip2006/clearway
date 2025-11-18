# Getting Started with Clearway

Welcome to Clearway! This guide will walk you through setting up your account and processing your first capital call document.

## Table of Contents

1. [Account Setup](#account-setup)
2. [First Document Upload](#first-document-upload)
3. [Understanding Confidence Scores](#understanding-confidence-scores)
4. [Reviewing and Approving Capital Calls](#reviewing-and-approving-capital-calls)
5. [Using the Calendar](#using-the-calendar)
6. [Inviting Team Members](#inviting-team-members)
7. [Setting Up Integrations](#setting-up-integrations)
8. [Next Steps](#next-steps)

---

## Account Setup

### Creating Your Account

1. **Navigate to Clearway**: Visit [https://clearway.com](https://clearway.com)
2. **Sign Up**: Click the "Sign Up" button in the top right corner
3. **Enter Your Details**:
   - Full name
   - Email address
   - Password (minimum 8 characters)
4. **Verify Email**: Check your inbox for a verification email and click the confirmation link
5. **Complete Your Profile**: Add additional information about your firm or role

### Organization Setup (Optional)

If you're setting up Clearway for your entire firm:

1. Navigate to **Settings** > **Organization**
2. Enter your organization name and select a unique URL slug
3. Choose your plan (Starter, Professional, or Enterprise)
4. Configure organization settings:
   - Branding (logo, colors)
   - Default notification preferences
   - Time zone and currency

**Screenshot Recommendation**: Show the organization setup screen with fields highlighted.

---

## First Document Upload

### Uploading a Capital Call PDF

Clearway automatically extracts key information from your capital call documents using AI.

1. **Access the Upload Page**:
   - Click **"Upload Document"** from the dashboard
   - Or drag and drop a PDF directly onto the dashboard

2. **Select Your Document**:
   - Click **"Choose File"** or drag a PDF into the upload area
   - Supported format: PDF (up to 50MB)

3. **Wait for Processing**:
   - The document will be uploaded to secure cloud storage
   - AI extraction typically takes 10-30 seconds
   - You'll see a progress indicator

4. **Review Extracted Data**:
   - Once processing is complete, you'll see the extracted information
   - The system extracts:
     - Fund name
     - Amount due
     - Due date
     - Wire instructions
     - Investor information

**Screenshot Recommendation**: Show the upload interface with drag-and-drop area highlighted.

### What Happens During Processing?

1. **OCR (Optical Character Recognition)**: Azure Document Intelligence extracts text from the PDF
2. **AI Extraction**: GPT-4 identifies and structures capital call data
3. **Validation**: The system checks for completeness and accuracy
4. **Confidence Scoring**: Each field receives a confidence score (see next section)

---

## Understanding Confidence Scores

Clearway uses AI to extract data with **95%+ accuracy**. Each extracted field has a confidence score to help you identify what needs review.

### Confidence Score Levels

| Score Range | Label | Meaning | Action Required |
|-------------|-------|---------|-----------------|
| 95-100% | High | Very confident extraction | Quick review recommended |
| 85-94% | Medium | Good extraction, minor uncertainty | Careful review recommended |
| 0-84% | Low | Low confidence, may need correction | Detailed review required |

### Visual Indicators

- **Green badge**: High confidence (95-100%)
- **Yellow badge**: Medium confidence (85-94%)
- **Red badge**: Low confidence (0-84%)

### Common Reasons for Low Confidence

- Poor document quality (scanned at low resolution)
- Unusual formatting or handwritten notes
- Missing or ambiguous information
- Complex tables or nested data structures

**Pro Tip**: Fields with low confidence scores are automatically highlighted for your attention during review.

**Screenshot Recommendation**: Show a capital call review screen with confidence scores highlighted.

---

## Reviewing and Approving Capital Calls

### Review Interface

After extraction, you'll see a side-by-side view:

- **Left Panel**: Original PDF document
- **Right Panel**: Extracted data with confidence scores

### Step-by-Step Review Process

1. **Check Fund Information**:
   - Verify fund name is correct
   - Check investor account number (if applicable)

2. **Verify Financial Details**:
   - Confirm amount due matches the PDF
   - Check currency (defaults to USD)
   - Verify due date is correct

3. **Review Wire Instructions**:
   - Bank name
   - Account number
   - Routing number
   - Wire reference number

4. **Make Corrections** (if needed):
   - Click any field to edit
   - Changes are saved automatically
   - Original PDF is always available for reference

5. **Approve or Reject**:
   - **Approve**: Click the green "Approve" button
   - **Reject**: Click "Reject" and provide a reason
   - **Save Draft**: Click "Save" to return later

### Bulk Actions

For multiple capital calls:

1. Select multiple items using checkboxes
2. Use the bulk action menu to:
   - Approve all selected
   - Export to CSV
   - Download PDFs
   - Archive items

**Screenshot Recommendation**: Show the review interface with PDF on left and extracted data on right.

---

## Using the Calendar

The Clearway calendar helps you track upcoming capital call due dates and never miss a payment.

### Calendar View

- **Month View**: See all due dates at a glance
- **List View**: See details in a sortable list
- **Filter Options**: Filter by fund, status, or amount

### Setting Up Alerts

1. Navigate to **Settings** > **Notifications**
2. Configure email alerts:
   - 7 days before due date
   - 3 days before due date
   - On due date
   - 1 day after due date (overdue)
3. Choose notification method:
   - Email
   - In-app notifications
   - SMS (Enterprise plan only)

### Adding to External Calendar

Export your capital call calendar to Google Calendar, Outlook, or Apple Calendar:

1. Go to **Calendar** > **Settings**
2. Click **"Get Calendar URL"**
3. Copy the iCal URL
4. Add to your calendar app as a subscription

**Screenshot Recommendation**: Show calendar view with upcoming capital calls.

---

## Inviting Team Members

### Adding Team Members

1. Navigate to **Settings** > **Team**
2. Click **"Invite Member"**
3. Enter email address and select role:
   - **Admin**: Full access to all features
   - **Editor**: Can upload, review, and approve documents
   - **Viewer**: Read-only access to documents and reports

4. Click **"Send Invite"**
5. Team member will receive an email invitation

### Managing Permissions

**Admin Permissions**:
- Manage team members
- Configure integrations
- Access billing and organization settings
- View audit logs

**Editor Permissions**:
- Upload documents
- Review and approve capital calls
- Export data
- Set up personal notifications

**Viewer Permissions**:
- View documents and capital calls
- Download reports
- View calendar

### Custom Roles (Enterprise Only)

Create custom roles with granular permissions:

1. Go to **Settings** > **Roles**
2. Click **"Create Custom Role"**
3. Define permissions:
   - `capital_calls:read`
   - `capital_calls:write`
   - `capital_calls:approve`
   - `documents:upload`
   - `reports:generate`
   - `users:manage`

**Screenshot Recommendation**: Show team management interface with role selection.

---

## Setting Up Integrations

Clearway integrates with your existing tools to streamline your workflow.

### Available Integrations

1. **Fund Administrators**:
   - SS&C Geneva
   - Carta
   - Juniper Square
   - Altvia
   - See [Fund Admin Setup Guide](../integrations/FUND_ADMIN_SETUP.md)

2. **Accounting Software**:
   - QuickBooks Online
   - Xero
   - NetSuite
   - See [QuickBooks Setup Guide](../integrations/QUICKBOOKS_SETUP.md)

3. **Document Signing**:
   - DocuSign
   - HelloSign
   - Adobe Sign
   - See [DocuSign Setup Guide](../integrations/DOCUSIGN_SETUP.md)

4. **Payment Processing**:
   - Plaid (bank connections)
   - Stripe (ACH payments)

### Quick Setup

1. Navigate to **Settings** > **Integrations**
2. Click **"Connect"** next to your desired integration
3. Follow the OAuth authorization flow
4. Configure sync settings
5. Test the connection

**Pro Tip**: Start with QuickBooks or Xero integration to automatically sync capital calls to your accounting system.

**Screenshot Recommendation**: Show integrations page with available connectors.

---

## Next Steps

### Explore Advanced Features

- **[Payment Reconciliation](PAYMENT_RECONCILIATION.md)**: Match payments to capital calls automatically
- **[Export Options](../api/API_REFERENCE.md#export-endpoints)**: Download data in CSV, Excel, or JSON
- **[API Access](../api/API_REFERENCE.md)**: Integrate Clearway with your custom tools
- **[Webhooks](../api/WEBHOOKS.md)**: Get real-time notifications for events

### Get Help

- **Documentation**: Browse our full documentation at [docs.clearway.com](https://docs.clearway.com)
- **Support**: Email support@clearway.com or use the in-app chat
- **Community**: Join our Slack community for tips and best practices
- **Office Hours**: Schedule a call with our team for personalized onboarding

### Best Practices

1. **Upload documents as soon as you receive them** to maximize processing time
2. **Review extractions promptly** to catch any errors early
3. **Set up calendar notifications** to never miss a due date
4. **Invite your team early** to distribute the workload
5. **Connect integrations** to eliminate manual data entry

---

## Troubleshooting

### Common Issues

**Problem**: Upload fails
**Solution**: Check file size (max 50MB) and format (PDF only). Try a different browser or clear cache.

**Problem**: Low confidence scores
**Solution**: Ensure PDF is high quality. Avoid scanned documents below 300 DPI. Contact support if issue persists.

**Problem**: Missing wire instructions
**Solution**: Check if they're on a separate page. Some fund administrators include them in attached documents.

**Problem**: Wrong due date extracted
**Solution**: Manually correct the date. Report the issue to help improve AI accuracy.

### Getting Support

- **Email**: support@clearway.com (response within 24 hours)
- **In-App Chat**: Click the chat icon in bottom right corner
- **Phone**: 1-800-CLEARWAY (Enterprise customers only)
- **Status Page**: status.clearway.com for system status

---

**Ready to get started?** [Upload your first document →](#first-document-upload)

# Tax & K-1 Agent - Phase 3

## Overview
This agent handles K-1 tax form processing, tax document management, and tax compliance for alternative investments. It provides comprehensive tax reporting capabilities, investor compliance tracking, and professional CPA access to tax documents across multiple funds and investment vehicles.

## Timeline
Weeks 21-24 (1 month)

## Key Features

### 1. K-1 OCR & Extraction
- Parse K-1 forms (1065, 1120-S, 1041)
- Extract all Schedule K-1 fields (50+ data points)
- Support for all entity types (Partnership, S-Corp, Trust)
- Multi-page K-1 handling
- State tax form extraction
- 98%+ accuracy target (higher than capital calls due to tax criticality)
- Automatic form type detection
- Handwritten field recognition
- Confidence scoring for each extracted field

### 2. K-1 Validation & Reconciliation
- Cross-reference with distribution data
- Validate against IRS form specifications
- Flag discrepancies for review
- Generate validation reports
- Track amendments (K-1 revisions)
- Outlier detection for unusual amounts
- Year-over-year comparison for consistency
- Mathematical validation (box totals, calculations)

### 3. Tax Document Management
- Centralized tax document repository
- Document versioning (original, amended, corrected)
- Automated investor distribution via email
- Secure document access with audit trail
- Retention policy management (7 years IRS requirement)
- Amendment tracking and notification
- Document delivery confirmation
- Reminder system for unopened documents

### 4. Tax Reporting
- Aggregate K-1 data across funds
- Generate tax summary reports
- Export to TurboTax, H&R Block formats
- CPA portal for tax professional access
- IRS form generation (if needed)
- Support for multiple tax years
- Fund-level tax reporting
- Investor-level consolidated reporting

### 5. Tax Compliance
- W-9 collection and validation
- 1099 generation for distributions
- Backup withholding tracking
- Foreign investor compliance (W-8BEN)
- FATCA/CRS reporting
- IRS distribution tracking
- Compliance audit trails
- Tax retention policy enforcement

## Database Schema

```prisma
model TaxDocument {
  id              String   @id @default(cuid())
  documentId      String   @unique
  document        Document @relation(fields: [documentId], references: [id])

  // Tax form details
  formType        TaxFormType  // K1_1065, K1_1120S, K1_1041, W9, W8BEN, 1099
  taxYear         Int
  fundId          String
  investorId      String

  // K-1 specific fields
  k1Data          Json?     // All K-1 fields in structured format
  einOrSsn        String?   @encrypted
  shareOfIncome   Decimal?
  shareOfLoss     Decimal?
  distributions   Decimal?
  capitalGains    Decimal?
  capitalLosses   Decimal?

  // Extraction metadata
  extractionConfidence Float?  // 0-100 confidence score
  extractedFields Json?        // Field-level confidence scores
  requiresReview  Boolean @default(false)

  // Status
  status          TaxDocStatus  // PENDING, VALIDATED, DISTRIBUTED, AMENDED
  validationErrors Json?

  // Versioning
  version         Int @default(1)
  originalId      String?   // If this is an amendment
  supersededById  String?   // If this version was superseded

  // Compliance
  distributedAt   DateTime?
  deliveryStatus  String?   // SENT, DELIVERED, BOUNCED
  receivedByIRS   Boolean @default(false)
  receivedAt      DateTime?

  // Audit trail
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([taxYear, formType])
  @@index([fundId, investorId, taxYear])
  @@index([status, requiresReview])
  @@index([distributedAt])
}

enum TaxFormType {
  K1_1065       // Partnership
  K1_1120S      // S-Corporation
  K1_1041       // Trust/Estate
  W9            // W-9 Request for TIN
  W8BEN         // Foreign person
  W8BEN_E       // Foreign entity
  1099_MISC
  1099_INT
  1099_DIV
  STATE_K1      // State-specific K-1
}

enum TaxDocStatus {
  PENDING_EXTRACTION
  EXTRACTED
  PENDING_VALIDATION
  VALIDATED
  PENDING_DISTRIBUTION
  DISTRIBUTED
  AMENDED
  SUPERSEDED
}

model TaxProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User @relation(fields: [userId], references: [id])

  // Tax identification
  taxIdType       String   // SSN, EIN, ITIN
  taxId           String   @encrypted

  // W-9 information
  w9Received      Boolean @default(false)
  w9Date          DateTime?
  w9DocumentId    String?
  w9Verified      Boolean @default(false)

  // Entity type
  entityType      String   // INDIVIDUAL, PARTNERSHIP, CORPORATION, TRUST, etc.
  backupWithholding Boolean @default(false)

  // Foreign investor
  isForeign       Boolean @default(false)
  countryOfTaxResidence String?
  w8FormType      String?  // W8BEN or W8BEN_E
  w8Date          DateTime?
  w8ExpiresAt     DateTime?

  // Preferences
  preferredFormat String   // PDF, TURBOTAX, HR_BLOCK
  cpaEmail        String?
  cpaCopiesEnabled Boolean @default(false)
  emailNotifications Boolean @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([isForeign, w8ExpiresAt])
}

model TaxDistribution {
  id              String   @id @default(cuid())
  taxDocumentId   String
  taxDocument     TaxDocument @relation(fields: [taxDocumentId], references: [id])

  recipientEmail  String
  recipientName   String?
  sentAt          DateTime
  deliveryStatus  String   // SENT, DELIVERED, FAILED, BOUNCED
  openedAt        DateTime?
  downloadedAt    DateTime?

  remindersSent   Int @default(0)
  lastReminderAt  DateTime?

  // Audit
  sendMethod      String   // EMAIL, CPA_PORTAL, DOWNLOAD

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CPAAccess {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  cpaFirmName     String
  cpaEmail        String
  cpaPhone        String?

  accessLevel     String   // READ_ONLY, FULL_ACCESS
  grantedAt       DateTime @default(now())
  expiresAt       DateTime?

  // Access tracking
  documentsAccessed Int @default(0)
  lastAccessedAt  DateTime?

  // IP whitelist (optional)
  allowedIps      String[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, cpaEmail])
  @@index([expiresAt])
}

model TaxAmendment {
  id              String   @id @default(cuid())
  originalDocId   String
  originalDoc     TaxDocument @relation("Original", fields: [originalDocId], references: [id])

  amendedDocId    String
  amendedDoc      TaxDocument @relation("Amended", fields: [amendedDocId], references: [id])

  amendmentReason String
  filedDate       DateTime
  receivedDate    DateTime?

  investorNotified Boolean @default(false)
  notifiedAt      DateTime?

  createdAt       DateTime @default(now())

  @@unique([originalDocId, amendedDocId])
}
```

## API Endpoints

### K-1 Processing
- `POST /api/tax/k1/upload` - Upload K-1 document
  - Accepts single or batch uploads
  - Returns job ID for tracking
  - Triggers OCR processing asynchronously

- `GET /api/tax/k1/:id` - Get K-1 details
  - Returns full extracted data with confidence scores
  - Includes validation status and any errors
  - Shows version history

- `PATCH /api/tax/k1/:id` - Update K-1 data
  - Allows manual correction of extracted data
  - Requires admin/reviewer role
  - Creates audit log entry

- `POST /api/tax/k1/:id/validate` - Validate K-1
  - Runs all validation rules
  - Returns validation report
  - Marks as ready for distribution

- `POST /api/tax/k1/:id/distribute` - Distribute to investor
  - Sends via email with secure link
  - Creates audit trail
  - Tracks delivery status

- `POST /api/tax/k1/:id/amend` - File amendment
  - Links original to amended document
  - Notifies investor of change
  - Tracks amendment date

- `GET /api/tax/k1/batch/:taxYear` - Get all K-1s for tax year
  - Returns paginated list with filters
  - Supports filtering by status, fund, investor

- `GET /api/tax/k1/batch/:taxYear/download` - Batch download
  - Zip multiple K-1s for download
  - Generate summary report

### Tax Profiles
- `GET /api/tax/profile` - Get user's tax profile
  - Returns W-9 status, entity type, preferences
  - Shows CPA access status

- `PUT /api/tax/profile` - Update tax profile
  - Update entity type, contact info
  - Enable/disable CPA copies

- `POST /api/tax/profile/w9` - Upload W-9
  - Extract W-9 data
  - Validate TIN
  - Mark as received

- `GET /api/tax/profile/w9` - Get W-9 status
  - Returns W-9 information and dates

- `POST /api/tax/profile/w8` - Upload W-8BEN/W-8BEN-E
  - Process foreign investor form
  - Track expiration date

### CPA Portal
- `POST /api/tax/cpa/grant-access` - Grant CPA access
  - Generate unique access code
  - Set expiration date
  - Enable audit logging

- `GET /api/tax/cpa/clients` - List CPA's clients
  - Returns only clients CPA has access to
  - Shows pending tax documents

- `GET /api/tax/cpa/documents/:clientId` - CPA view of documents
  - Returns all K-1s for client
  - Filter by tax year

- `DELETE /api/tax/cpa/access/:id` - Revoke access
  - Immediate revocation
  - Audit log entry

- `GET /api/tax/cpa/reports/:clientId/:taxYear` - Generate CPA report
  - Consolidated tax summary
  - Ready for filing

### Exports
- `GET /api/tax/export/turbotax/:taxYear` - TurboTax format
  - Export as .txf file
  - Includes all K-1s for tax year
  - Ready for import into TurboTax

- `GET /api/tax/export/hrblock/:taxYear` - H&R Block format
  - Export for H&R Block import

- `GET /api/tax/export/summary/:taxYear` - Tax summary report
  - PDF summary of all K-1 income
  - Useful for tax planning

- `GET /api/tax/export/1099/:taxYear` - 1099-MISC export
  - Generate 1099s from distributions
  - IRS-compliant format

### Compliance & Reporting
- `GET /api/tax/compliance/w9-status` - W-9 compliance report
  - Shows investors missing W-9s
  - Tracks W-9 collection dates

- `GET /api/tax/compliance/foreign-investors` - Foreign investor report
  - Lists all foreign investors
  - W-8BEN expiration tracking

- `GET /api/tax/compliance/retention` - Document retention report
  - Track retention compliance
  - Show documents ready for deletion

## Frontend Pages

### 1. Tax Dashboard (`/dashboard/tax`)
- Tax year selector (multi-year view)
- K-1 status overview (received, pending, validated, distributed)
- Tax document library with search and filters
- Compliance status (W-9 collection, foreign investor tracking)
- Quick actions panel
  - Upload new K-1s
  - Distribute all pending
  - Generate reports
  - Export to TurboTax

### 2. K-1 Upload & Review (`/dashboard/tax/k1/upload`)
- Drag-and-drop upload interface
- Batch K-1 upload (up to 100 at once)
- OCR progress tracking with status updates
- Review extracted data with confidence scores
  - Highlight low-confidence fields for review
  - Side-by-side PDF and extracted data
  - Field-level confidence indicators
- Bulk validation and approval workflow
- Amendment tracking

### 3. K-1 Extraction Review (`/dashboard/tax/k1/:id/review`)
- Full-page PDF viewer
- Extracted data displayed with confidence scores
- Manual correction interface
- Validation results and required fixes
- History of revisions
- Save and proceed workflow

### 4. Tax Profile Management (`/dashboard/tax/profile`)
- W-9 information and upload
- Entity type selection
- CPA access management
  - Grant/revoke access
  - Set expiration dates
  - View access history
- Tax preferences
  - Preferred export format
  - Email notifications
  - CPA copy settings

### 5. Tax Compliance Center (`/dashboard/tax/compliance`)
- W-9 collection status dashboard
- Missing W-9 investor list with contact options
- Foreign investor tracking (W-8BEN expiration alerts)
- Backup withholding dashboard
- Compliance checklist

### 6. CPA Portal (`/cpa/portal`)
- Separate login for CPAs
- Client list (only assigned clients)
- Client document library (read-only)
  - View all K-1s across funds
  - Download individual or batch
  - Access by tax year
- Generate tax summary reports
- Access history and audit trail
- Expiration date prominent display

### 7. Investor Tax Center (`/investor/tax`)
- View all K-1s across all funds
  - Multi-fund portfolio view
  - Tax year selector
- Download K-1s (individual or batch)
- Export to TurboTax with one click
- Track amendments and corrections
- View distribution history
- CPA sharing options

### 8. Tax Amendment Management (`/dashboard/tax/amendments`)
- Track all K-1 amendments
- Show original vs. amended comparison
- Amendment distribution workflow
- Amendment notification tracking

## AI/ML Requirements

### K-1 Extraction Model
- Train custom model on 10,000+ K-1 forms from all three types (1065, 1120-S, 1041)
- 98%+ accuracy on all fields
- Handle handwritten fields (some K-1s still manual)
- Detect form type automatically
- Extract state tax forms
- Field-level confidence scoring
- Support for multi-page documents
- Automatic form orientation detection
- Handle various page qualities and scans

### Validation Logic
- Cross-reference with IRS specifications
- Validate math (Box 1 + Box 2 = Box 3 logic)
- Flag unusual amounts (outlier detection)
- Compare year-over-year for same investor
- Check for required fields based on form type
- Validate TIN format (SSN vs. EIN)
- Detect form amendments and supersessions

### NLP for Amendment Detection
- Identify amended K-1s automatically
- Parse amendment reason fields
- Flag for investor notification
- Track amended document relationships

## Integration Requirements

### TurboTax Integration
- Export K-1 data in TurboTax import format (.txf)
- Support for all K-1 types (1065, 1120-S, 1041)
- Include state tax data
- Map all 50+ K-1 fields to TurboTax equivalents
- Annual format update management

### H&R Block Integration
- Export format for H&R Block import
- Consumer and professional versions

### QuickBooks Integration (Enhancement)
- Import K-1 data for fund accounting
- Track distributions for 1099 generation
- Generate 1099 forms
- Feed into quarterly/annual reporting

### CPA Software Integration
- Integrate with ProConnect Tax, Lacerte, Drake
- API for CPA firms to pull data
- Bulk export functionality
- Secure data transmission (OAuth)
- Support for multiple CPAs per client

### Email Service Integration
- Automated K-1 distribution emails
- Delivery tracking (SES, SendGrid, etc.)
- Bounced email handling
- Reminder email sequence

## Compliance Requirements

### IRS Compliance
- Generate IRS-compliant PDFs (proper formatting, fonts)
- Track distribution to investors (required for K-1s)
- 7-year retention policy (automatically enforce)
- Support for K-1 amendments
- Proper sequence numbering for issued K-1s
- Maintain audit trail for every change

### Data Security
- Encrypt all SSN/EIN at rest (AES-256) and in transit (TLS 1.2+)
- Audit trail for all tax document access
  - Who accessed what when
  - Download/print tracking
  - CPA access logging
- SOC 2 Type II compliance for tax data
- GDPR compliance (right to be forgotten for tax data after retention period)
- HIPAA-level access controls
- IP whitelisting for CPA access (optional)

### State Compliance
- Support for state K-1 forms
- Multi-state reporting
- State-specific retention rules

## Testing Requirements

### Accuracy Testing
- Test on 1,000 real K-1 forms from each type
- Measure accuracy per field type
- Test amendment detection
- Validate all math calculations
- Confidence score calibration
- Edge case testing (handwritten, poor quality scans)

### Compliance Testing
- Verify IRS form specifications compliance
- Test retention policy enforcement
- Validate encryption at rest and in transit
- Test CPA access controls
- Permission matrix testing
- W-9 validation testing

### Integration Testing
- TurboTax export validation
- CPA software compatibility testing
- Email delivery and tracking
- Multi-fund aggregation accuracy

### Performance Testing
- Batch upload performance (100 K-1s)
- Report generation performance
- Export generation speed
- Multi-year query performance

### Security Testing
- Penetration testing
- Encryption verification
- Access control testing
- Audit trail integrity verification

## Timeline

**Week 21:**
- Database schema implementation
- K-1 OCR integration and initial model training
- API endpoint scaffolding

**Week 22:**
- K-1 extraction model training and optimization
- Validation logic implementation
- W-9 processing and validation

**Week 23:**
- Frontend pages development
- CPA portal implementation
- Export functionality (TurboTax, H&R Block)
- Amendment tracking

**Week 24:**
- Email distribution and tracking
- Testing and QA
- Documentation and deployment prep
- Edge case handling

## Success Metrics
- 98%+ extraction accuracy across all K-1 types
- 50,000 K-1s processed in first tax season
- <5 minutes average review time per K-1 (with extraction confidence >95%)
- 95%+ investor satisfaction (tax document delivery rating)
- 100% delivery confirmation for distributed K-1s
- Zero IRS compliance issues or missing distributions
- <2 second response time for K-1 retrieval queries
- <30 second export generation for 1000+ K-1 documents

## Dependencies
- Phase 1: Document upload infrastructure, user authentication, access controls
- Phase 2: AI extraction pipeline, audit logging system, email delivery service
- External: TurboTax API access, CPA software partnerships, email service provider

## Risk Mitigation

### High Accuracy Requirement
- Start with semi-automated review (AI + human verification)
- Gradual confidence threshold increase as model improves
- Fallback to manual data entry for low-confidence extractions

### Tax Compliance
- Legal review of all tax document handling procedures
- Third-party compliance audit
- Dedicated tax compliance specialist on team

### Data Security
- Regular security audits and penetration testing
- Encrypted backups in multiple regions
- Disaster recovery plan with <4 hour RTO

## Future Enhancements (Phase 3+)
- Automated 1099 generation from distributions
- Tax liability estimation tools
- Tax-loss harvesting recommendations
- Integration with personal tax software for investors
- CPA-assisted filing workflow
- Multi-currency K-1 handling (for international funds)
- Real-time tax impact reporting for distributions

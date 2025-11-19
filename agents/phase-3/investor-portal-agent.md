# Investor Portal Agent - Phase 3 Specification

## Executive Summary

The Investor Portal Agent delivers a secure, self-service platform enabling fund investors to access capital calls, distributions, tax documents, and performance data in real-time. This agent automates investor onboarding, authentication, and account management while reducing operational support burden and enhancing investor experience.

**Status**: Phase 3 - Enterprise Scaling
**Timeline**: Weeks 37-40 (Oct 9 - Oct 30, 2024)
**Owner**: Investor Operations Team
**Dependencies**: Fund Management System, Authentication Service, Document Storage, Email Service

---

## 1. Core Features & Capabilities

### 1.1 Self-Service Investor Portal

#### Overview
A comprehensive web and mobile platform allowing investors to independently manage their investments without contacting support.

#### Key Capabilities
- **Dashboard Overview**: Real-time summary of investments, pending capital calls, and distributions
- **Personalized Experience**: Customized views based on fund participation and investor type (accredited, institutional, retail)
- **Search & Filtering**: Quick access to documents, transactions, and fund information
- **Notifications Center**: Real-time alerts for capital calls, distributions, and important announcements
- **Help & Documentation**: Integrated knowledge base and FAQs
- **Session Management**: Secure login with timeout and re-authentication
- **Accessibility Compliance**: WCAG 2.1 AA standards

#### Business Value
- Reduces support ticket volume by 40-50%
- Increases investor satisfaction (target: 90% NPS)
- Enables 24/7 access to critical investor information
- Accelerates onboarding process from 2 weeks to 2-3 days

---

### 1.2 Investor Authentication

#### Email Magic Link Authentication

**Flow**:
1. Investor navigates to portal.clearway.com and enters email address
2. System verifies email in investor database
3. Unique, time-limited (15 minutes) magic link sent to email
4. Investor clicks link and gains portal access
5. Session stored with secure cookie (httpOnly, Secure, SameSite=Strict)

**Technical Specifications**:
- Magic link token: 32-byte random string
- Hash algorithm: SHA-256 for stored tokens
- Rate limiting: Maximum 5 magic link requests per email per hour
- Account verification: Email must match investor record in database
- Session duration: 24 hours (with refresh option)
- IP tracking: Log login attempts with location data

**Security Measures**:
- SSL/TLS encryption for all communications
- CORS headers restrictive to approved domains
- No password storage (eliminates credential compromise risk)
- Failed attempt logging for fraud detection
- Automatic email notification of login attempts from new locations

#### Single Sign-On (SSO) Integration

**Supported Providers**:
- Google Workspace (enterprise accounts)
- Microsoft Azure AD (institutional investors)
- Okta (large fund platforms)
- SAML 2.0 (custom enterprise systems)

**SSO Flow**:
1. Investor selects SSO provider
2. Redirected to identity provider login
3. User authenticates with existing credentials
4. Identity provider confirms identity
5. User mapped to investor account via email/identifier
6. Portal access granted with session established

**Implementation Details**:
- OpenID Connect (OIDC) for OAuth-based providers
- SAML 2.0 for enterprise systems
- Just-in-time (JIT) user provisioning
- Attribute mapping for user metadata
- Automatic account creation for new users (with admin approval option)

**Multi-Factor Authentication (MFA)**:
- Optional for standard email login
- Required for high-risk activities (bank detail changes, large transactions)
- Supported methods: TOTP (Google Authenticator, Authy), SMS, email codes
- Backup codes for account recovery

---

### 1.3 Capital Calls & Distributions Management

#### Capital Calls View

**Features**:
- List all capital calls across active funds with status (pending, funded, overdue)
- Sortable by date, amount, fund, or status
- Filter by fund, date range, or status
- Individual capital call details:
  - Call amount and deadline
  - Funding account information
  - Wire instructions and references
  - Related documents (term sheets, legal documents)
- Payment tracking: Due date, payment status, confirmation details
- Historical view: All past capital calls with payment proof

**Data Display**:
```
Capital Call Summary:
├── Pending Capital Calls
│   ├── Fund A - $100,000 due 2024-11-30
│   ├── Fund B - $250,000 due 2024-12-15
│   └── Fund C - $50,000 due 2024-11-25
├── Recent Capital Calls (completed)
└── Overdue Capital Calls (if any)
```

**User Actions**:
- View call details and wire instructions
- Download documentation (PDFs)
- Receive reminder notifications
- Confirm payment submission

#### Distributions View

**Features**:
- List all distributions across funds (capital returns, income distributions, special distributions)
- Status tracking: pending, processed, in-transit, received
- Sort and filter capabilities
- Distribution details:
  - Amount and per-unit value
  - Distribution date and expected receipt date
  - Fund performance metrics
  - Tax classification (ordinary income, capital gains, return of capital)
- Payment method display (wire, check, ACH)
- Historical distribution schedule and amounts

**Distribution Types**:
- Monthly/Quarterly income distributions
- Interim capital returns
- Final liquidation distributions
- Special/extraordinary distributions
- Dividend reinvestment options (DRIP)

**Reporting**:
- Distribution summary by fund and year
- Total distributions received YTD
- Expected distributions (forward projections)
- Tax reporting integration (see K-1 section)

---

### 1.4 Tax Documents & K-1 Management

#### K-1 (Partnership Interest) Form

**Document Availability**:
- Available 30-45 days after fiscal year end (aligned with IRS timeline)
- Searchable by fund, tax year, and document type
- Immediate notification when new K-1 available

**Features**:
- **Download**: PDF download with secure link (expires after 30 days)
- **Email Delivery**: Automatic email with secure link for new K-1s
- **Reissued Documents**: Track corrected K-1s and amendments
- **Multi-Fund Summary**: Consolidated view of all K-1s for investor across funds

**K-1 Components Display**:
- Tax year and fund name
- Schedule K-1 partner share information
- Ordinary business income/loss
- Guaranteed payments
- Capital gains/losses
- Tax credits and distributions
- Qualified business income (QBI) percentage
- Cryptocurrency/digital asset disclosures
- Summary for tax filing by accountants

#### Other Tax Documents

**Supported Document Types**:
- **Form 1098-T** (Education Credits)
- **Form 1099-NEC** (Non-Employee Compensation) - if applicable
- **Schedule K-3** (Partner's Share of Income/Deductions)
- **Summary Letter**: Investor-specific summary document
- **Fee Statements**: Annual fee and expense breakdowns
- **Charitable Contribution Reports** (if applicable)

**Tax Document Portal Features**:
- Document search by type, year, fund
- Bulk download (ZIP archive of all documents)
- Historical archive (7-year retention)
- Notifications of new documents
- Integration with tax preparation software (TurboTax, TaxAct)
- Professional advisor portal access (CPA/tax advisor login)

**Security & Compliance**:
- Tax documents encrypted at rest (AES-256)
- Secure transmission (TLS 1.3)
- Access logging for compliance audits
- SOC 2 Type II attestation
- HIPAA-level data protection for sensitive information

---

### 1.5 Account Management & Profile Updates

#### Contact Information Management

**Editable Fields**:
- Primary email address (with verification step)
- Phone number (mobile and/or landline)
- Secondary contact information (alternate person)
- Mailing address (for documents and correspondence)
- Preferred communication language

**Update Flow**:
1. Investor requests change in account settings
2. Change requires email verification for primary email updates
3. Confirmation email sent with change details
4. Change takes effect after confirmation (immediate for other fields)
5. Notification sent to registered email of account changes
6. Change history logged for audit trail

**Communication Preferences**:
- Email frequency (daily summary, weekly, monthly, or on-demand)
- Notification types (capital calls, distributions, documents, announcements)
- Document delivery method (email, portal, both)
- Preferred language for communications
- Timezone for deadline displays

#### Bank Account & Payment Details

**Bank Account Management**:
- View registered bank accounts
- Add new bank account (with verification)
- Remove/deactivate old accounts
- Set primary account for distributions
- Alternate accounts for capital calls

**Bank Account Verification Process**:
1. Investor enters bank account details
2. System performs Plaid integration for real-time verification
3. Two small deposits sent to account
4. Investor confirms amounts in portal
5. Account activated for use

**Alternative**: Manual verification with bank account documentation (canceled check, bank statement)

**Payment Methods**:
- Wire transfer (primary for capital calls)
- ACH (automated clearing house)
- Check distribution support
- International wire instructions (SWIFT codes, IBAN)

**PII Protection**:
- Bank account details masked in display (last 4 digits only)
- Full details shown only when making changes
- Two-factor authentication required for account changes
- Encrypted storage with key rotation

#### Tax ID & W-9 Information

**Stored Information**:
- Legal name (matched with fund records)
- Tax ID (SSN or EIN) - partially masked display
- Entity type (individual, LLC, corporation, trust, etc.)
- W-9 status and signature date
- Backup withholding status (if applicable)

**Management**:
- View current tax ID information
- Request updates (triggers compliance review)
- W-9 e-signature capability
- Withholding status management
- Foreign investor documentation (W-8BEN, W-8BEN-E)

---

### 1.6 Commitment Tracking

#### Commitment Overview

**Dashboard Display**:
- Total commitment amount (across all active funds)
- Committed vs. funded comparison
- Funded percentage by fund
- Unfunded commitments remaining

**Commitment Details by Fund**:
- Original commitment amount
- Committed date
- Funding schedule (if available)
- Current funded amount
- Remaining unfunded commitment
- Capital call history and schedule

**Visualization**:
```
Fund A - Commitment Tracking
├── Total Committed: $1,000,000
├── Funded to Date: $750,000 (75%)
├── Unfunded: $250,000 (25%)
├── Expected Capital Call Schedule
│   ├── Q4 2024: $150,000
│   ├── Q1 2025: $100,000
│   └── Potential Future: $0
└── Recent Capital Calls
    ├── 2024-10-15: $250,000 ✓ Funded
    └── 2024-09-15: $200,000 ✓ Funded
```

#### Multi-Fund Commitment Summary

**Portfolio View**:
- Commitment percentage allocation across funds
- Fund performance vs. commitment stage
- Liquidity timeline by fund
- Expected distribution schedule

**Alerts & Notifications**:
- Upcoming capital call deadline (7 days, 3 days, 1 day)
- Capital call overdue (1 day, 3 days, 7 days)
- Commitment fulfillment milestones
- Fund reaching hard close (if applicable)

#### Compliance Tracking

**For Accredited Investors**:
- Accredited investor status (certified/uncertified)
- Recertification reminders (annual)
- Income/net worth verification status
- Document expiration warnings

**For Fund Compliance**:
- Investor suitability questionnaire status
- Beneficial ownership disclosure
- Sanctions screening status
- AML/KYC verification status

---

### 1.7 Performance Dashboard

#### Fund Performance Metrics

**Displayed Metrics**:
- **Net IRR** (Internal Rate of Return) - since inception and year-to-date
- **MOIC** (Multiple on Invested Capital)
- **DPI** (Distributions to Paid-in Capital)
- **Value of Investments**: Current NAV vs. original investment
- **Total Return**: Absolute and percentage returns

**Performance Views**:
- **Time-based comparisons**: YTD, 1-year, 3-year, since inception
- **Benchmark comparisons**: S&P 500, Russell 2000, MSCI World (as applicable)
- **Peer comparisons**: Industry benchmarks for fund type (if disclosed)

#### Portfolio Overview

**Dashboard Summary**:
- Total investment value across all funds
- Portfolio allocation by fund (pie chart)
- Weighted average fund performance
- Weighted IRR across portfolio
- Expected cash flows (forward 12 months)

**Drill-Down Capability**:
- Click fund to see detailed performance
- View individual investment performance (if multi-asset funds)
- See distributions by fund over time
- Capital deployed timeline

#### Performance Charts & Visualizations

**Chart Types**:
1. **NAV Trend Chart**: Fund NAV per unit over time
2. **Performance Attribution**: Fund performance vs. benchmark
3. **Waterfall Chart**: Starting value → distributions → ending value
4. **Distribution History**: Bar chart of distributions by quarter/year
5. **Cumulative Return**: Growth of $1 invested since inception

**Export Options**:
- Download chart as image (PNG, SVG)
- Export performance data to Excel
- Generate performance report PDF

#### Risk Metrics (Where Available)

- **Volatility**: Standard deviation of returns
- **Sharpe Ratio**: Risk-adjusted returns
- **Drawdown**: Maximum and current drawdown
- **Beta**: Fund sensitivity to market (if applicable)
- **Concentration Risk**: Top 5 position percentages

#### Performance Commentary

**Narrative Reporting**:
- Quarterly performance letters from fund manager
- Key portfolio updates and milestones
- Market commentary and outlook
- Risk disclosures and mitigation strategies

**Access Controls**:
- Confidential manager commentary available only to limited partners
- General performance data available to all investors
- Timing: Availability 30-45 days after quarter end

---

### 1.8 Investor Communications Center

#### Announcements & News

**Features**:
- Centralized announcements feed from fund managers
- Type categorization: Corporate actions, regulatory updates, meetings, market news
- Fund-specific and general announcements
- Archive with full-text search
- RSS feed integration for subscribers

**Announcement Types**:
1. **Capital Events**: Capital calls, distributions, special transactions
2. **Regulatory**: Tax law changes, fund documentation updates
3. **Fund News**: Portfolio company exits, new investments, milestones
4. **Operational**: Fee changes, manager updates, operational changes
5. **Educational**: Market insights, investment strategy articles, webinars

#### Document Library

**Organized Content**:
- Fund documents (prospectus, term sheet, LPA)
- Investor reports (quarterly letters, annual reports)
- Historical documents (prior year materials)
- Regulatory documents (ADV, disclosures)
- How-to guides and tutorials

**Search Capabilities**:
- Full-text document search
- Filter by document type, fund, date range
- Save/bookmark important documents
- Version history and archive

#### Webinars & Events

**Event Management**:
- Upcoming webinar calendar
- Registration with automatic email reminders
- Live webinar streaming with Q&A
- Post-webinar recording archive
- Downloadable presentation materials

**Event Types**:
- Quarterly investor webinars (all investors)
- Fund-specific update calls
- Educational workshops (tax planning, investing basics)
- Annual investor meeting
- One-on-one advisor meetings (by appointment)

#### Feedback & Support

**Communication Channels**:
1. **Feedback Form**: Submit suggestions, report issues
2. **Support Ticket System**: Create support requests with tracking number
3. **FAQ Search**: Self-service troubleshooting
4. **Live Chat**: Real-time support during business hours (9 AM - 5 PM EST)
5. **Email Support**: support@clearway.com with 24-hour response time

**Ticket Management**:
- Automated ticket number generation
- Status tracking (open, in-progress, resolved, closed)
- Ticket history and archive
- Estimated resolution time
- Feedback rating post-resolution

**Knowledge Base**:
- 50+ searchable articles
- Video tutorials for common tasks
- Account security tips
- Troubleshooting guides
- Fund-specific FAQs

---

## 2. Database Schema

### 2.1 Core Investor Tables

#### investors
```sql
CREATE TABLE investors (
  investor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  entity_type ENUM('individual', 'llc', 'corporation', 'trust', 'partnership', 'other'),
  tax_id VARCHAR(50),  -- SSN or EIN, encrypted, masked in display
  accredited_status ENUM('accredited', 'unaccredited', 'pending_verification'),
  accreditation_verified_date DATE,
  accreditation_expiry_date DATE,
  phone_number VARCHAR(20),
  secondary_contact_name VARCHAR(255),
  secondary_contact_email VARCHAR(255),
  secondary_contact_phone VARCHAR(20),
  preferred_language VARCHAR(10) DEFAULT 'en',
  preferred_timezone VARCHAR(50) DEFAULT 'America/New_York',
  communication_frequency ENUM('daily', 'weekly', 'monthly', 'on_demand'),
  mailing_address TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive', 'suspended', 'terminated') DEFAULT 'active',
  INDEX idx_email (email),
  INDEX idx_tax_id (tax_id),
  FULLTEXT INDEX ft_legal_name (legal_name)
);

-- Audit logging
CREATE TABLE investor_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  action VARCHAR(100) NOT NULL,
  old_values JSON,
  new_values JSON,
  changed_by UUID,
  changed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  INDEX idx_investor_id (investor_id),
  INDEX idx_changed_date (changed_date)
);
```

#### investor_authentication
```sql
CREATE TABLE investor_authentication (
  auth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  auth_method ENUM('email_magic_link', 'sso_google', 'sso_azure', 'sso_okta', 'saml'),
  magic_link_token_hash VARCHAR(64),
  magic_link_expires_at TIMESTAMP,
  last_login_date TIMESTAMP,
  last_login_ip VARCHAR(45),
  last_login_location VARCHAR(255),
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_method ENUM('totp', 'sms', 'email', null),
  mfa_phone_verified VARCHAR(20),
  backup_codes TEXT[],  -- encrypted array of recovery codes
  sso_provider_id VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(investor_id, auth_method),
  INDEX idx_investor_id (investor_id),
  INDEX idx_magic_link_token_hash (magic_link_token_hash)
);

-- Session management
CREATE TABLE investor_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  session_token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_investor_id (investor_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_last_activity (last_activity)
);
```

### 2.2 Fund Participation & Commitments

#### investor_fund_participation
```sql
CREATE TABLE investor_fund_participation (
  participation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  fund_id UUID NOT NULL,
  commitment_amount DECIMAL(18, 2) NOT NULL,
  funded_amount DECIMAL(18, 2) DEFAULT 0,
  capital_account_balance DECIMAL(18, 2) DEFAULT 0,
  entry_date DATE NOT NULL,
  status ENUM('active', 'inactive', 'liquidated') DEFAULT 'active',
  suitability_questionnaire_completed BOOLEAN DEFAULT FALSE,
  beneficial_ownership_disclosed BOOLEAN DEFAULT FALSE,
  sanctions_screening_passed BOOLEAN DEFAULT FALSE,
  aml_kyc_verified BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(investor_id, fund_id),
  INDEX idx_investor_id (investor_id),
  INDEX idx_fund_id (fund_id),
  INDEX idx_status (status)
);

-- Capital calls tracking
CREATE TABLE capital_calls (
  call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL,
  call_number INT NOT NULL,
  call_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_per_unit DECIMAL(18, 6) NOT NULL,
  total_amount DECIMAL(18, 2) NOT NULL,
  call_type ENUM('standard', 'emergency', 'special') DEFAULT 'standard',
  wire_instructions TEXT,
  reference_code VARCHAR(50),
  status ENUM('announced', 'pending', 'funded', 'overdue', 'cancelled') DEFAULT 'announced',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fund_id (fund_id),
  INDEX idx_due_date (due_date),
  INDEX idx_status (status)
);

-- Investor-specific capital call status
CREATE TABLE investor_capital_call_status (
  call_status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_call_id UUID NOT NULL REFERENCES capital_calls(call_id),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  investor_amount DECIMAL(18, 2) NOT NULL,
  amount_paid DECIMAL(18, 2) DEFAULT 0,
  payment_date DATE,
  payment_method ENUM('wire', 'ach', 'check', 'other'),
  payment_reference VARCHAR(100),
  status ENUM('pending', 'funded', 'overdue', 'waived') DEFAULT 'pending',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(capital_call_id, investor_id),
  INDEX idx_investor_id (investor_id),
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date)
);
```

### 2.3 Distributions & Tax Documents

#### distributions
```sql
CREATE TABLE distributions (
  distribution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL,
  distribution_date DATE NOT NULL,
  payment_date DATE,
  distribution_type ENUM('income', 'capital_return', 'special', 'dividend') DEFAULT 'income',
  amount_per_unit DECIMAL(18, 6) NOT NULL,
  total_amount DECIMAL(18, 2) NOT NULL,
  ordinary_income DECIMAL(18, 2),
  long_term_capital_gain DECIMAL(18, 2),
  short_term_capital_gain DECIMAL(18, 2),
  return_of_capital DECIMAL(18, 2),
  recapture DECIMAL(18, 2),
  status ENUM('pending', 'processed', 'in_transit', 'received') DEFAULT 'pending',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fund_id (fund_id),
  INDEX idx_distribution_date (distribution_date),
  INDEX idx_status (status)
);

-- Investor distribution allocations
CREATE TABLE investor_distributions (
  investor_distribution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL REFERENCES distributions(distribution_id),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  distribution_amount DECIMAL(18, 2) NOT NULL,
  ordinary_income DECIMAL(18, 2),
  long_term_capital_gain DECIMAL(18, 2),
  short_term_capital_gain DECIMAL(18, 2),
  return_of_capital DECIMAL(18, 2),
  payment_method ENUM('wire', 'check', 'ach', 'reinvestment') DEFAULT 'wire',
  payment_status ENUM('pending', 'processed', 'in_transit', 'received') DEFAULT 'pending',
  payment_reference VARCHAR(100),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(distribution_id, investor_id),
  INDEX idx_investor_id (investor_id),
  INDEX idx_distribution_id (distribution_id)
);

-- Tax documents
CREATE TABLE tax_documents (
  tax_doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL,
  tax_year INT NOT NULL,
  document_type ENUM('k1', 'k3', 'summary_letter', '1099_nec', 'fee_statement', 'other'),
  version INT DEFAULT 1,
  is_amended BOOLEAN DEFAULT FALSE,
  amended_from_id UUID REFERENCES tax_documents(tax_doc_id),
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  file_hash VARCHAR(64),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  available_date DATE,
  expiry_date DATE,
  INDEX idx_fund_id (fund_id),
  INDEX idx_tax_year (tax_year),
  INDEX idx_document_type (document_type),
  INDEX idx_available_date (available_date)
);

-- Investor-specific tax documents
CREATE TABLE investor_tax_documents (
  investor_tax_doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_doc_id UUID NOT NULL REFERENCES tax_documents(tax_doc_id),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  download_count INT DEFAULT 0,
  last_download_date TIMESTAMP,
  viewed_date TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tax_doc_id, investor_id),
  INDEX idx_investor_id (investor_id),
  INDEX idx_tax_doc_id (tax_doc_id)
);
```

### 2.4 Bank Account Management

#### investor_bank_accounts
```sql
CREATE TABLE investor_bank_accounts (
  bank_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  account_nickname VARCHAR(100),
  account_type ENUM('checking', 'savings', 'wire', 'international'),
  account_holder_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  routing_number VARCHAR(50),  -- encrypted
  account_number VARCHAR(50),  -- encrypted, masked
  account_number_masked VARCHAR(50),
  account_country VARCHAR(2) DEFAULT 'US',
  swift_code VARCHAR(20),  -- for international wires
  iban VARCHAR(50),  -- for international wires
  is_verified BOOLEAN DEFAULT FALSE,
  verification_method ENUM('plaid', 'micro_deposits', 'document') DEFAULT 'micro_deposits',
  verification_complete_date TIMESTAMP,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_date TIMESTAMP,
  INDEX idx_investor_id (investor_id),
  INDEX idx_is_primary (is_primary),
  INDEX idx_is_verified (is_verified)
);

-- Micro deposit verification
CREATE TABLE bank_account_verification (
  verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES investor_bank_accounts(bank_account_id),
  deposit_1_amount DECIMAL(10, 2),
  deposit_1_date DATE,
  deposit_2_amount DECIMAL(10, 2),
  deposit_2_date DATE,
  verification_attempts INT DEFAULT 0,
  verified_date TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bank_account_id (bank_account_id)
);
```

### 2.5 Communications & Preferences

#### investor_communication_preferences
```sql
CREATE TABLE investor_communication_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id) UNIQUE,
  email_capital_calls BOOLEAN DEFAULT TRUE,
  email_distributions BOOLEAN DEFAULT TRUE,
  email_tax_documents BOOLEAN DEFAULT TRUE,
  email_announcements BOOLEAN DEFAULT TRUE,
  email_newsletters BOOLEAN DEFAULT TRUE,
  sms_alerts BOOLEAN DEFAULT FALSE,
  notification_frequency ENUM('immediate', 'daily', 'weekly', 'monthly') DEFAULT 'daily',
  document_delivery_method ENUM('email', 'portal', 'both') DEFAULT 'both',
  marketing_communications BOOLEAN DEFAULT FALSE,
  unsubscribe_all BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_investor_id (investor_id)
);

-- Announcements and communications
CREATE TABLE investor_announcements (
  announcement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  announcement_type ENUM('capital_event', 'regulatory', 'fund_news', 'operational', 'educational'),
  category ENUM('capital_call', 'distribution', 'portfolio_update', 'fee_change', 'meeting', 'other'),
  published_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_date TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  attachment_urls TEXT[],
  created_by VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FULLTEXT INDEX ft_title_content (title, content),
  INDEX idx_fund_id (fund_id),
  INDEX idx_published_date (published_date)
);

-- Investor message tracking
CREATE TABLE investor_support_tickets (
  ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('technical', 'account', 'document', 'payment', 'general', 'other'),
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed') DEFAULT 'open',
  assigned_to VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_date TIMESTAMP,
  resolution_summary TEXT,
  satisfaction_rating INT,  -- 1-5 scale
  INDEX idx_investor_id (investor_id),
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_status (status),
  FULLTEXT INDEX ft_subject_description (subject, description)
);
```

### 2.6 Performance & Reporting

#### fund_performance_metrics
```sql
CREATE TABLE fund_performance_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL,
  as_of_date DATE NOT NULL,
  nav_per_unit DECIMAL(18, 6),
  net_irr DECIMAL(8, 4),
  moic DECIMAL(10, 4),
  dpi DECIMAL(10, 4),
  ppi DECIMAL(10, 4),
  total_value_invested DECIMAL(18, 2),
  current_nav DECIMAL(18, 2),
  distributions_paid DECIMAL(18, 2),
  total_return_percentage DECIMAL(10, 4),
  ytd_return_percentage DECIMAL(10, 4),
  benchmark_comparison DECIMAL(10, 4),
  volatility DECIMAL(10, 4),
  sharpe_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fund_id, as_of_date),
  INDEX idx_fund_id (fund_id),
  INDEX idx_as_of_date (as_of_date)
);

-- Investor-specific performance snapshots
CREATE TABLE investor_performance_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  fund_id UUID NOT NULL,
  as_of_date DATE NOT NULL,
  commitment_amount DECIMAL(18, 2),
  funded_amount DECIMAL(18, 2),
  current_value DECIMAL(18, 2),
  distributions_received DECIMAL(18, 2),
  gross_return DECIMAL(18, 2),
  net_return DECIMAL(18, 2),
  irr DECIMAL(8, 4),
  moic DECIMAL(10, 4),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(investor_id, fund_id, as_of_date),
  INDEX idx_investor_id (investor_id),
  INDEX idx_as_of_date (as_of_date)
);
```

### 2.7 Audit & Compliance

#### investor_access_audit_log
```sql
CREATE TABLE investor_access_audit_log (
  access_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(investor_id),
  action VARCHAR(100) NOT NULL,
  resource_type ENUM('tax_document', 'performance_report', 'capital_call', 'distribution', 'account_settings', 'other'),
  resource_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  accessed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('success', 'denied', 'failed') DEFAULT 'success',
  failure_reason VARCHAR(255),
  INDEX idx_investor_id (investor_id),
  INDEX idx_accessed_date (accessed_date),
  INDEX idx_resource_type (resource_type)
);
```

---

## 3. Frontend Architecture

### 3.1 Investor Portal Pages

#### Authentication Pages
- **Login Page**: Magic link request or SSO provider selection
- **Magic Link Verification**: Email confirmation screen
- **SSO Callback**: SSO provider authentication and redirect
- **MFA Setup & Verification**: MFA enrollment and code entry
- **Session Expired**: Redirect to login with session timeout message

#### Dashboard & Home
- **Main Dashboard**: Overview of accounts, pending actions, recent activity
- **Quick Actions**: Capital call payment, download documents, view distributions
- **Alerts & Notifications**: Prominent alerts for overdue capital calls, new documents
- **Recent Activity Feed**: Timeline of recent actions

#### Capital Calls Management
- **Capital Calls List**: All capital calls with status, sortable and filterable
- **Capital Call Detail**: Full call details, wire instructions, documentation
- **Payment Instructions**: Clear wire transfer or payment instructions
- **Payment Confirmation**: Confirmation of payment submission

#### Distributions Management
- **Distributions List**: All distributions with status and tax information
- **Distribution Detail**: Full details including tax classification
- **Distribution Schedule**: Forward-looking distribution expectations
- **Distribution Tax Report**: Summary for tax filing

#### Tax Documents
- **Tax Documents Hub**: Searchable document library by year, type, fund
- **K-1 Viewer**: In-browser PDF viewing with download option
- **Bulk Download**: Download multiple documents as ZIP
- **Professional Advisor Portal**: Separate login for CPAs/tax advisors
- **Integration Settings**: Configure TurboTax/TaxAct integration

#### Account Management
- **Profile Settings**: Edit contact information, email, phone
- **Email Preferences**: Communication frequency, notification types
- **Bank Account Management**: View, add, verify, or remove bank accounts
- **Security Settings**: Password/MFA management, session management, login history
- **Privacy & Preferences**: Language, timezone, data consent

#### Performance Dashboard
- **Portfolio Summary**: Total investment value, allocation, performance
- **Fund Performance**: Detailed performance for each fund (IRR, MOIC, returns)
- **Performance Charts**: Interactive charts with time range selection
- **Comparison Tools**: Fund performance vs. benchmarks
- **Export Reports**: Download performance reports in PDF/Excel

#### Communications Center
- **Announcements Feed**: Latest fund announcements and news
- **Document Library**: Searchable collection of fund documents
- **Webinar Calendar**: Upcoming events with registration
- **Support Hub**: Support tickets, FAQs, knowledge base
- **Feedback Form**: Submit suggestions or report issues

### 3.2 Responsive Design Specifications

#### Mobile Optimization (320px - 768px)

**Layout Adjustments**:
- Single-column layout for all pages
- Stacked navigation menu with burger menu icon
- Larger touch targets (minimum 44px height)
- Simplified data tables with card-based display
- Collapsible sections for detailed information

**Navigation**:
- Bottom tab bar with 5 primary sections (Home, Calls, Distributions, Taxes, Account)
- Persistent header with back button and page title
- Quick action buttons fixed or sticky

**Touch Interactions**:
- Swipe gestures for document pagination
- Pull-to-refresh for live data
- Long-press for context menus
- Bottom sheets for modals and forms

#### Tablet Optimization (768px - 1024px)

**Layout**:
- Two-column layout where appropriate
- Larger charts and data visualization
- Side-by-side comparison views
- Expanded navigation sidebar (collapsible)

**Performance**:
- Optimized images for retina displays
- Lazy loading for documents and charts
- Smooth scrolling and transitions

#### Desktop Optimization (1024px+)

**Features**:
- Full three-column layouts with sidebar navigation
- Multiple charts and visualizations
- Advanced filtering and sorting
- Print-friendly versions
- Keyboard navigation and accessibility shortcuts

### 3.3 Mobile App Considerations

**Optional Mobile App** (Future Phase):
- Native iOS and Android apps with offline capability
- Push notifications for capital calls and distributions
- Biometric authentication (Face ID, Touch ID)
- Document camera for banking setup
- Performance optimized for cellular connections

---

## 4. Technical Stack & Infrastructure

### 4.1 Frontend Technology

**Frontend Framework**:
- React 18+ with TypeScript
- Next.js 14+ for SSR and static generation
- TailwindCSS for responsive styling
- Responsive design patterns with mobile-first approach

**UI Components**:
- Shadcn/ui for accessible component library
- Recharts for performance visualizations
- React Query for data fetching and caching
- Zustand for state management

**Authentication**:
- Auth0 or similar for magic link and SSO
- PKCE flow for OAuth
- Secure cookie storage with httpOnly flag

**Security**:
- Content Security Policy (CSP) headers
- CORS configuration
- Rate limiting on sensitive endpoints
- Input validation and XSS protection

### 4.2 Backend Architecture

**API Framework**:
- Node.js/Express or Python/FastAPI
- RESTful API with JWT authentication
- GraphQL optional for complex queries (future phase)

**Key Endpoints**:
```
POST /auth/magic-link - Request magic link
POST /auth/verify-link - Verify magic link token
POST /auth/sso/callback - SSO callback handler
GET /investor/profile - Get investor profile
PUT /investor/profile - Update profile
GET /investor/funds - List investor's funds
GET /investor/capital-calls - List capital calls
GET /investor/distributions - List distributions
GET /investor/tax-documents - List tax documents
POST /investor/bank-accounts - Add bank account
GET /investor/bank-accounts - List bank accounts
DELETE /investor/bank-accounts/:id - Remove bank account
GET /investor/performance - Get performance metrics
GET /communications/announcements - Get announcements
POST /support/tickets - Create support ticket
```

### 4.3 Database

**Database System**: PostgreSQL 15+
- ACID compliance for financial transactions
- Full-text search for document library
- JSON support for flexible data structures
- Encryption at-rest and in-transit

**Backup & Recovery**:
- Daily automated backups (30-day retention)
- Point-in-time recovery capability
- Disaster recovery plan with 1-hour RTO

### 4.4 Security & Compliance

**Encryption**:
- TLS 1.3 for all network communication
- AES-256 for sensitive data at rest
- Key rotation quarterly

**Authentication & Authorization**:
- OAuth 2.0 / OpenID Connect for SSO
- SAML 2.0 for enterprise SSO
- Role-based access control (RBAC)
- Attribute-based access control (ABAC) for advanced scenarios

**Compliance**:
- SOC 2 Type II certification
- GLBA compliance (financial institution standards)
- GDPR compliance for EU investors
- CCPA compliance for California residents
- Anti-Money Laundering (AML) screening
- Know Your Customer (KYC) verification

**Monitoring & Logging**:
- Centralized logging (ELK stack or similar)
- Real-time security event monitoring
- Intrusion detection system (IDS)
- Automated threat response
- 90-day audit log retention

---

## 5. Implementation Timeline

### Week 37 (Oct 9-13, 2024)

**Phase 3a: Core Portal Infrastructure**

**Frontend Development**:
- [ ] Authentication UI (login, magic link, SSO pages)
- [ ] Dashboard layout and main navigation
- [ ] Responsive design foundation for mobile/tablet
- [ ] Component library setup (Shadcn/ui)

**Backend Development**:
- [ ] Magic link authentication API
- [ ] SSO provider integrations (Google, Azure)
- [ ] User profile API endpoints
- [ ] Email service integration for magic links

**Database**:
- [ ] Create investor schema
- [ ] Create authentication tables
- [ ] Create participation and commitment tables
- [ ] Set up encryption for sensitive fields

**Security**:
- [ ] Implement rate limiting
- [ ] Set up session management
- [ ] Configure CORS and CSP headers
- [ ] Establish logging infrastructure

**Deliverables**:
- [ ] Functional authentication with magic links
- [ ] SSO provider connectivity
- [ ] Basic dashboard layout
- [ ] Core database schema

---

### Week 38 (Oct 16-20, 2024)

**Phase 3b: Capital Calls & Distributions**

**Frontend Development**:
- [ ] Capital calls list and detail pages
- [ ] Distribution list and detail views
- [ ] Wire instruction display and download
- [ ] Payment tracking interface
- [ ] Mobile responsive optimization

**Backend Development**:
- [ ] Capital calls list API with filtering
- [ ] Distribution retrieval API
- [ ] Tax classification API
- [ ] Payment status tracking API
- [ ] Wire instruction generation

**Data Integration**:
- [ ] Sync capital calls from fund management system
- [ ] Sync distributions from accounting system
- [ ] Calculate investor allocation amounts
- [ ] Set up scheduled data synchronization

**Features**:
- [ ] Capital call notifications and reminders
- [ ] Overdue capital call alerts
- [ ] Distribution payment tracking
- [ ] Tax reporting integration

**Testing**:
- [ ] API integration testing
- [ ] Data accuracy validation
- [ ] Notification system testing
- [ ] Mobile UI testing

**Deliverables**:
- [ ] Capital calls fully functional for end users
- [ ] Distribution viewing and tracking
- [ ] Tax information properly displayed
- [ ] Notification system operational

---

### Week 39 (Oct 23-27, 2024)

**Phase 3c: Tax Documents & Account Management**

**Frontend Development**:
- [ ] Tax document library with search
- [ ] K-1 viewer with PDF rendering
- [ ] Account settings pages (contact, bank)
- [ ] Bank account management interface
- [ ] Communication preferences page

**Backend Development**:
- [ ] Tax document storage and retrieval API
- [ ] Document access control and logging
- [ ] Bank account management API
- [ ] Bank account verification (micro-deposits or Plaid)
- [ ] Account update API with audit logging

**Document Management**:
- [ ] Implement secure document storage
- [ ] Document encryption and expiration
- [ ] Versioning for amended documents
- [ ] Professional advisor access controls

**Banking Integration**:
- [ ] Plaid integration for account verification
- [ ] Alternative manual verification process
- [ ] Encrypted storage of bank details
- [ ] Masked display of account information

**Security**:
- [ ] PII protection and masking
- [ ] Two-factor authentication for sensitive changes
- [ ] Comprehensive audit logging
- [ ] Access control implementation

**Testing**:
- [ ] Document management testing
- [ ] Bank integration testing
- [ ] PII protection verification
- [ ] Compliance audit

**Deliverables**:
- [ ] Tax documents fully searchable and accessible
- [ ] K-1 download and delivery working
- [ ] Bank account management functional
- [ ] Account information update system

---

### Week 40 (Oct 30-Nov 3, 2024)

**Phase 3d: Communications & Performance Dashboard**

**Frontend Development**:
- [ ] Performance dashboard with charts
- [ ] Fund performance metrics display
- [ ] Announcements feed
- [ ] Communications center layout
- [ ] Support ticket system

**Backend Development**:
- [ ] Performance metrics calculation API
- [ ] Announcement feed API
- [ ] Support ticket management API
- [ ] Webinar calendar API
- [ ] FAQ search API

**Visualizations**:
- [ ] NAV trend charts
- [ ] Performance attribution charts
- [ ] Distribution history visualizations
- [ ] Portfolio allocation pie charts
- [ ] Return waterfall charts

**Communications**:
- [ ] Announcement publishing system
- [ ] Email notification integration
- [ ] Support ticket workflow
- [ ] Knowledge base articles
- [ ] Webinar registration system

**Portal Polish**:
- [ ] Full mobile responsiveness testing
- [ ] Performance optimization (Lighthouse 90+)
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] User testing with beta investors
- [ ] Bug fixes and refinement

**Launch Preparation**:
- [ ] Security penetration testing
- [ ] Load testing (1,000+ concurrent users)
- [ ] Disaster recovery testing
- [ ] Investor onboarding documentation
- [ ] Support team training

**Deliverables**:
- [ ] Complete performance dashboard
- [ ] Communications center fully functional
- [ ] Portal launched to beta group
- [ ] Security testing completed
- [ ] Performance optimized (< 3 sec load)

---

## 6. Success Metrics & KPIs

### 6.1 Investor Adoption Metrics

**Onboarding & Registration**:
- Target: 80% of qualified investors registered within 90 days of launch
- Current baseline: 0% (new product)
- Success metric: Registration completion rate > 75%
- Monitoring: Weekly cohort analysis

**Active Usage**:
- Target: 60% monthly active users (MAU) within 6 months
- Target: 40% weekly active users (WAU) within 6 months
- Tracking: Login frequency, session duration, page views
- Dashboard: Real-time usage analytics

**Feature Adoption**:
- Capital calls viewed: 90%+ of investors (within 7 days of availability)
- Tax documents downloaded: 80%+ (by end of tax year)
- Account profile completed: 85%+ (primary metrics)
- Bank account registration: 70%+ (for payment instructions)

### 6.2 Support & Efficiency Metrics

**Support Ticket Reduction**:
- Current baseline: ~200 investor-related tickets/month
- Target: Reduce to 80-100 tickets/month (50% reduction)
- Metric: Support ticket volume by category
- Timeline: Month 1-3 post-launch vs. baseline

**Support Ticket Resolution Time**:
- Current: Average 2-3 business days
- Target: Average 4-6 hours for automated responses
- Target: 24-hour resolution for 80% of tickets
- Measurement: Ticket lifecycle tracking

**Self-Service Success Rate**:
- Target: 60% of inquiries resolved without human contact
- Measurement: Portal task completion without support
- Knowledge base article views: Target 500+ views/week
- FAQ effectiveness: Target 80% of FAQ visits solve investor problem

### 6.3 Investor Experience Metrics

**Net Promoter Score (NPS)**:
- Launch baseline: Unknown (new product)
- Target: 50+ NPS within 6 months
- Target: 70+ NPS within 12 months
- Frequency: Monthly surveys post-interaction

**Customer Satisfaction Score (CSAT)**:
- Target: 4.5/5.0 average rating
- Measurement: Post-task surveys
- Category tracking: Authentication, document retrieval, account updates
- Action items: <4.0 ratings trigger improvement reviews

**System Uptime & Performance**:
- Target: 99.9% uptime (SLA commitment)
- Target: <2 second page load time (p95)
- Target: <500ms API response time (p95)
- Monitoring: Real Synthetic monitoring 24/7

### 6.4 Business Impact Metrics

**Cost Reduction**:
- Support team cost savings: Target 40% reduction in investor ops headcount
- Document printing costs: Elimination of physical K-1 distribution
- Time savings: 10+ hours/week per ops person
- Calculation: Current costs vs. projected post-launch

**Revenue/Retention Impact**:
- Investor retention rate: Target >95% (improve from current baseline)
- Investor satisfaction influence on renewals: Track correlated LTV
- AUM growth: Monitor investor satisfaction impact on capital commitments
- Measurement: Year-over-year comparison

**Operational Efficiency**:
- Investor onboarding time: Reduce from 2 weeks to 2-3 days
- Document delivery time: Immediate (vs. 2-3 days manual process)
- Capital call processing: Reduce from 2 days to 1 hour
- Distribution processing: Reduce manual reconciliation by 80%

### 6.5 Security & Compliance Metrics

**Security**:
- Zero data breaches (target: maintain)
- Failed login attempts detected: <0.5% per user
- MFA adoption: Target 30% within 6 months
- Security incident response time: <1 hour

**Compliance**:
- Audit findings: 0 material findings
- SOC 2 Type II: Maintain certification
- Regulatory filings: 100% on-time submission
- Investor data privacy: 100% GDPR/CCPA compliance

### 6.6 Monitoring & Reporting

**Real-Time Dashboards**:
- Executive dashboard: Key metrics at a glance
- Operations dashboard: Support tickets, system health
- Investor analytics dashboard: Usage patterns, adoption rates
- Security dashboard: Login attempts, anomalies

**Reporting Schedule**:
- Daily: System uptime, error rates, active users
- Weekly: Adoption metrics, ticket volume, satisfaction
- Monthly: Comprehensive KPI report with trends
- Quarterly: Business impact analysis and optimization recommendations

---

## 7. Risk Mitigation & Contingencies

### 7.1 Technical Risks

**Risk**: SSO integration delays
- **Mitigation**: Parallel development of magic link as fallback
- **Contingency**: Support magic link authentication for 2+ months if needed

**Risk**: Performance issues under load
- **Mitigation**: Load testing early (Week 37), CDN integration, database optimization
- **Contingency**: Gradual rollout starting with limited user group

**Risk**: Data synchronization failures with fund system
- **Mitigation**: Dual-system reconciliation, automated alerts
- **Contingency**: Manual update process as fallback

### 7.2 Security Risks

**Risk**: Data breach or unauthorized access
- **Mitigation**: Security audit, penetration testing, encryption
- **Contingency**: Incident response plan, customer notification process

**Risk**: MFA implementation complexity
- **Mitigation**: Phased rollout, optional initial enrollment
- **Contingency**: TOTP-only support if SMS fails

### 7.3 Adoption Risks

**Risk**: Low investor adoption/engagement
- **Mitigation**: Investor training, clear value communication, ease of use
- **Contingency**: Incentive programs, dedicated support

**Risk**: Resistance to digital transformation
- **Mitigation**: Maintain email/support alternatives, gradual transition
- **Contingency**: One-on-one onboarding calls for key investors

---

## 8. Future Enhancements (Phase 4+)

- **Mobile App**: Native iOS/Android apps with offline capability
- **AI Chatbot**: 24/7 investor support with NLP
- **Advanced Analytics**: Predictive distributions, portfolio optimization
- **Blockchain Integration**: Digital K-1s and secure document verification
- **White-label Portal**: Fund-customized branding and theming
- **API for Advisors**: Third-party advisor portal integrations
- **Mobile Banking Integration**: One-click payment for capital calls
- **Biometric Authentication**: Face/fingerprint login
- **Multi-language Support**: Internationalization (Spanish, Mandarin, etc.)
- **AR Document Viewer**: Augmented reality for K-1 visualization

---

## 9. Glossary & Definitions

| Term | Definition |
|------|-----------|
| **MOIC** | Multiple on Invested Capital - cumulative return multiple |
| **IRR** | Internal Rate of Return - annualized investment return |
| **DPI** | Distributions to Paid-in Capital - realized returns |
| **PPI** | Paid-in to Committed Capital - capital deployment progress |
| **K-1** | Tax form for partnership income allocation |
| **Capital Call** | Request from fund for investor to provide committed capital |
| **Distribution** | Return of capital and/or investment income to investor |
| **Magic Link** | Passwordless authentication via email link |
| **SSO** | Single Sign-On - unified authentication across systems |
| **NAV** | Net Asset Value - fund value per unit |
| **Accredited Investor** | Individual with net worth >$1M or income >$200K annually |
| **AML** | Anti-Money Laundering - regulatory compliance |
| **KYC** | Know Your Customer - investor verification process |
| **GDPR** | General Data Protection Regulation - EU data privacy law |
| **CCPA** | California Consumer Privacy Act - US privacy regulation |

---

## 10. Approval & Sign-Off

- **Product Owner**: [Name], Investor Operations Lead
- **Engineering Lead**: [Name], Backend Engineering
- **Security Officer**: [Name], Information Security
- **Compliance Officer**: [Name], Compliance & Legal
- **Design Lead**: [Name], Product Design
- **Approved Date**: [Date]
- **Next Review**: [Date]

---

**Document Version**: 1.0
**Last Updated**: November 19, 2024
**Status**: Ready for Development

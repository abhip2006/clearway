# CLEARWAY PHASE 2 - DETAILED REQUIREMENTS

**Timeline:** Months 7-12 (6 months)
**Goal:** Network effects activation through fund administrator API integrations
**Target:** 350 RIA customers, 3 fund administrators, $5.4M ARR

---

## PHASE 2 STRATEGY

Phase 1 (Months 1-6) proved AI accuracy and acquired 50 RIAs uploading documents manually.

Phase 2 (Months 7-12) **activates the flywheel** by integrating fund administrators on the supply side, creating network effects that make Clearway exponentially more valuable.

### The Network Effect Unlock

```
Current State (End of Phase 1):
RIAs → Manual upload → Clearway → Extract → Review

Phase 2 Target (End of Month 12):
Fund Admins → POST to API → Clearway → Automatic delivery → RIAs
     ↑                                                           ↓
     └────────── "Use Clearway" requests from RIAs ─────────────┘
```

**The Flywheel:**
1. 50 RIAs using Clearway → Proof of demand
2. Approach fund admins: "50 of your clients want digital delivery"
3. Fund admins integrate → POSTing capital calls via API
4. Data flows automatically → RIAs stop manual uploads
5. Value increases → More RIAs sign up
6. More RIAs → More leverage with fund admins → More fund admins integrate
7. **Network effects compound**

---

## PHASE 2 MILESTONES

| Month | RIA Customers | Fund Admins | MRR | ARR |
|-------|---------------|-------------|-----|-----|
| 6 (Phase 1 End) | 50 | 0 | $37.5K | $450K |
| 7 | 100 | 0 (1 pilot) | $75K | $900K |
| 8 | 150 | 1 live | $125K | $1.5M |
| 9 | 200 | 1 live | $175K | $2.1M |
| 10 | 250 | 2 live | $225K | $2.7M |
| 11 | 300 | 3 live | $350K | $4.2M |
| 12 | 350 | 3 live | $450K | **$5.4M** |

---

## FUND ADMINISTRATOR API (THE KEY UNLOCK)

### What Fund Admins Need

Fund administrators (SS&C, Apex, Citco, etc.) manage 100-200 funds each, sending capital calls to thousands of RIAs via email/PDF. They want:

1. **Reduce support burden**: RIAs call asking "Where's the capital call?" → Digital delivery solves this
2. **Modern client experience**: Their clients (RIAs) demand digital solutions
3. **Competitive advantage**: "We integrate with Clearway" is a selling point
4. **White-label option**: Can offer under their own brand

### Our Pitch to Fund Admins

> "50 of your clients (RIAs) are already using Clearway. Instead of emailing PDFs to each one, POST the data once to our API and we'll deliver it automatically. Zero integration cost for you, happier clients for us."

### Fund Admin API Specification

**Full RESTful API for fund administrators to POST data directly to Clearway**

#### Authentication
```
POST /api/v1/auth/token
Content-Type: application/json

{
  "client_id": "fundadmin_XYZ",
  "client_secret": "sk_live_...",
  "grant_type": "client_credentials"
}

Response:
{
  "access_token": "eyJ0eXAi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Capital Call Submission
```
POST /api/v1/capital-calls
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "fund_id": "apollo_xi_us",
  "fund_name": "Apollo Fund XI",
  "capital_call_id": "CC-2025-Q4-001", // Fund admin's internal ID

  "investor_identifiers": [
    { "email": "ops@wealth-ria.com", "investor_id": "INV-12345" },
    { "email": "ops@ria-firm.com", "investor_id": "INV-67890" }
  ],

  "amount": 250000.00,
  "currency": "USD",
  "due_date": "2025-12-15T00:00:00Z",

  "wire_instructions": {
    "bank_name": "JPMorgan Chase",
    "account_number": "XXXXX1234",
    "routing_number": "021000021",
    "swift_code": "CHASUS33",
    "reference": "APOLLO-XI-CC-001",
    "beneficiary_name": "Apollo Fund XI LP"
  },

  "document_url": "https://signed-url.s3.amazonaws.com/apollo-xi-cc-q4.pdf",

  "metadata": {
    "quarter": "Q4 2025",
    "vintage_year": "2019",
    "fund_admin": "SS&C",
    "contact_email": "support@ssctech.com"
  }
}

Response 201 Created:
{
  "id": "cc_1234567890",
  "status": "delivered",
  "delivered_to": [
    { "email": "ops@wealth-ria.com", "status": "delivered" },
    { "email": "ops@ria-firm.com", "status": "not_found" }
  ],
  "delivered_at": "2025-11-18T10:30:00Z",
  "clearway_url": "https://clearway.com/capital-calls/cc_1234567890"
}
```

#### Distribution Notice
```
POST /api/v1/distributions
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "fund_id": "apollo_xi_us",
  "fund_name": "Apollo Fund XI",
  "distribution_id": "DIST-2025-Q4-001",

  "investor_identifiers": [/* same as capital calls */],

  "amount": 500000.00,
  "currency": "USD",
  "payment_date": "2025-12-20T00:00:00Z",
  "payment_method": "WIRE", // or "ACH" or "CHECK"

  "distribution_breakdown": {
    "return_of_capital": 300000.00,
    "capital_gains": 150000.00,
    "dividend_income": 50000.00
  },

  "document_url": "https://...",

  "metadata": { /* ... */ }
}
```

#### NAV Update
```
POST /api/v1/nav-updates
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "fund_id": "apollo_xi_us",
  "fund_name": "Apollo Fund XI",
  "as_of_date": "2025-09-30T00:00:00Z",

  "nav_per_share": 125.43,
  "total_nav": 500000000.00,
  "currency": "USD",

  "investor_nav": [
    {
      "investor_email": "ops@wealth-ria.com",
      "investor_id": "INV-12345",
      "shares_owned": 1000,
      "nav_value": 125430.00
    }
  ],

  "document_url": "https://...",

  "metadata": {
    "quarter": "Q3 2025",
    "reporting_period": "quarterly"
  }
}
```

#### Webhook Subscriptions (for Fund Admins to receive updates)
```
POST /api/v1/webhooks
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "url": "https://fundadmin.example.com/webhooks/clearway",
  "events": [
    "capital_call.approved",
    "capital_call.rejected",
    "distribution.viewed"
  ],
  "secret": "whsec_..." // For signature verification
}

Response:
{
  "id": "wh_1234567890",
  "url": "https://fundadmin.example.com/webhooks/clearway",
  "status": "active",
  "created_at": "2025-11-18T10:30:00Z"
}
```

---

## PHASE 2 FEATURES

### Feature 1: Fund Admin API (Priority P0)

**Timeline**: Month 7-8
**Owner**: Backend Agent + Integration Agent

**Components**:
1. API authentication (OAuth client credentials flow)
2. API endpoints (capital calls, distributions, NAV updates)
3. Investor matching (email or investor ID → Clearway user)
4. Document attachment handling (S3 presigned URLs)
5. Webhook delivery to fund admins
6. API key management dashboard (for fund admins)
7. API documentation (Swagger/OpenAPI)
8. Sandbox environment

**Database Schema Extensions**:
```prisma
model FundAdministrator {
  id            String   @id @default(cuid())
  name          String   // "SS&C", "Apex", "Citco"
  contactEmail  String

  // API credentials
  clientId      String   @unique
  clientSecret  String   // Hashed

  // Webhooks
  webhookUrl    String?
  webhookSecret String?
  webhookEvents String[] // ["capital_call.approved", ...]

  // Status
  status        FundAdminStatus @default(ACTIVE)
  tier          FundAdminTier   @default(PILOT)

  // Metrics
  totalCalls    Int      @default(0)
  lastApiCallAt DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  capitalCalls  CapitalCall[]
}

enum FundAdminStatus {
  PILOT       // Testing phase
  ACTIVE      // Live integration
  PAUSED      // Temporarily disabled
  DEACTIVATED // Churned
}

enum FundAdminTier {
  PILOT       // Free during pilot (3 months)
  STANDARD    // $80K/year
  ENTERPRISE  // Custom pricing
}

// Update CapitalCall model
model CapitalCall {
  // ... existing fields

  // Add fund admin source
  fundAdministratorId String?
  fundAdministrator   FundAdministrator? @relation(fields: [fundAdministratorId], references: [id])

  source              DocumentSource @default(MANUAL_UPLOAD)

  @@index([fundAdministratorId])
}

enum DocumentSource {
  MANUAL_UPLOAD // User uploaded PDF (Phase 1)
  EMAIL         // Email forwarding
  API           // Fund admin API (Phase 2)
  INTEGRATION   // Portfolio system integration (Phase 3)
}
```

**API Documentation**:
- Auto-generated with OpenAPI/Swagger
- Hosted at https://developers.clearway.com
- Interactive API explorer
- Code examples in curl, Python, Node.js, Ruby

**Acceptance Criteria**:
- ✅ Fund admin can POST capital call via API
- ✅ Capital call delivered to correct RIA users
- ✅ RIA receives notification email
- ✅ RIA sees capital call in dashboard (marked as "API-delivered")
- ✅ Fund admin receives webhook when RIA approves
- ✅ API documentation published
- ✅ Sandbox environment for testing

---

### Feature 2: Fund Admin Onboarding & Sales Process

**Timeline**: Month 7-12 (ongoing)
**Owner**: CEO + Sales Team

**Onboarding Steps**:

#### Step 1: Identify Target Fund Admins (Month 7)
- Query existing RIAs: "Which fund admins do you work with?"
- Build list of top 20 fund admins by RIA overlap
- Prioritize: SS&C, Apex, Citco, Gen II, Alter Domus, JTC Group

#### Step 2: Outreach (Month 7)
Email template:
```
Subject: [50 of your clients] already using Clearway for capital call automation

Hi [Fund Admin Ops Director],

We've built Clearway to automate capital call processing for RIAs. 50 RIAs
are already using us to extract data from your PDFs.

Instead of emailing PDFs to each RIA, you can POST the data once to our API
and we'll deliver it automatically to all RIAs using Clearway.

Benefits for you:
- Reduce support burden (fewer "where's my capital call?" calls)
- Modern client experience (digital delivery)
- Zero integration cost (we built the API)
- Competitive advantage ("We integrate with Clearway")

Can we schedule 30 minutes next week to show you a demo?

[CEO Name]
Founder, Clearway
```

#### Step 3: Demo (Month 7-8)
- Show fund admin dashboard
- Demonstrate API call (Postman)
- Show RIA receiving capital call instantly
- Show webhook callback when RIA approves

#### Step 4: Pilot Agreement (Month 8)
```
Pilot Terms:
- Duration: 3 months
- Cost: FREE
- Requirements:
  - POST 10+ capital calls via API
  - Provide feedback weekly
  - Agree to case study if successful

After pilot:
- Standard pricing: $80K/year base + $2/API call
- Or: $0 base + $5/API call (usage-based)
```

#### Step 5: Technical Integration (Month 8-9)
- Provide API credentials
- Share API documentation
- Set up sandbox environment
- Engineering sync: 2 weeks
- Testing: 1 week
- Go-live: 1 week

#### Step 6: Production Launch (Month 9-10)
- POST first capital call
- Monitor delivery success rate
- Weekly check-ins
- Iterate based on feedback

**Success Metrics**:
- Month 8: 1 fund admin pilot started
- Month 9: 1 fund admin live in production
- Month 10: 2 fund admins live
- Month 11: 3 fund admins live
- Month 12: 3 fund admins live, each POSTing 50+ capital calls/month

---

### Feature 3: Portfolio System Integrations (Addepar, Orion, Black Diamond)

**Timeline**: Month 9-12
**Owner**: Integration Agent
**Priority**: P1

See [docs/portfolio-systems-api-research.md](./portfolio-systems-api-research.md) for full details.

**Month 9: Addepar Integration**
- OAuth 2.0 authentication flow
- Portfolio query API
- Post transactions API
- Test with 3 pilot RIAs

**Month 10-11: Orion Integration**
- API authentication
- Accounts API
- Transactions API
- Test with 2 pilot RIAs

**Month 12: Black Diamond Integration**
- API authentication
- Transactions API
- Test with 2 pilot RIAs

**Acceptance Criteria**:
- ✅ RIA can connect Addepar account
- ✅ Capital call automatically posts to Addepar as pending transaction
- ✅ 95% success rate on transaction posting
- ✅ Same for Orion and Black Diamond

---

### Feature 4: Distribution Processing (Beyond Capital Calls)

**Timeline**: Month 10-11
**Owner**: AI/ML Agent + Backend Agent
**Priority**: P1

**Why Now**: Fund admins need distributions in addition to capital calls.

**AI Extraction Updates**:
```typescript
// lib/ai/extract-distribution.ts

const DistributionSchema = z.object({
  fundName: z.string(),
  investorEmail: z.string().email().optional(),
  investorAccount: z.string().optional(),
  amountTotal: z.number(),
  paymentDate: z.string(), // YYYY-MM-DD
  paymentMethod: z.enum(['WIRE', 'ACH', 'CHECK']),

  // Breakdown (if available)
  returnOfCapital: z.number().optional(),
  capitalGains: z.number().optional(),
  dividendIncome: z.number().optional(),

  // Wire details (if wire payment)
  recipientBank: z.string().optional(),
  recipientAccount: z.string().optional(),

  confidence: z.object({
    fundName: z.number(),
    amountTotal: z.number(),
    paymentDate: z.number(),
  }),
});
```

**Database Schema**:
```prisma
model Distribution {
  id          String   @id @default(cuid())

  // Extracted fields
  fundName         String
  investorEmail    String?
  investorAccount  String?
  amountTotal      Float
  currency         String @default("USD")
  paymentDate      DateTime
  paymentMethod    PaymentMethod @default(WIRE)

  // Breakdown
  returnOfCapital  Float?
  capitalGains     Float?
  dividendIncome   Float?

  // Wire details
  recipientBank    String?
  recipientAccount String?

  // Metadata
  extractedAt      DateTime @default(now())
  reviewedAt       DateTime?

  // Confidence
  confidenceScores Json?
  rawExtraction    Json?

  // Relations
  documentId String @unique
  document   Document @relation(fields: [documentId], references: [id])

  userId     String
  user       User @relation(fields: [userId], references: [id])

  status     DistributionStatus @default(PENDING_REVIEW)

  @@index([userId])
  @@index([paymentDate])
}

enum PaymentMethod {
  WIRE
  ACH
  CHECK
}

enum DistributionStatus {
  PENDING_REVIEW
  APPROVED
  REJECTED
}
```

**UI Updates**:
- New "Distributions" tab in dashboard
- Distribution calendar view
- Tax reporting (breakdown by type)

**Acceptance Criteria**:
- ✅ Upload distribution notice PDF → Extract data
- ✅ 95% accuracy on amount, date, fund name
- ✅ Breakdown extracted (if present in document)
- ✅ Review and approve flow
- ✅ Fund admin can POST distributions via API

---

### Feature 5: K-1 Tax Form Processing (Beta)

**Timeline**: Month 11-12
**Owner**: AI/ML Agent
**Priority**: P2

**Why Now**: K-1s arrive in Q1. If we launch this in Month 12 (December), we're ready for tax season.

**Scope**: Basic K-1 extraction only (not full tax preparation)

**Extracted Fields**:
- Fund name
- Tax year
- Investor details (name, SSN/EIN, address)
- Box 1: Ordinary business income
- Box 2: Net rental real estate income
- Box 3: Other net rental income
- State allocations (income by state)

**Use Case**: RIA receives 50 K-1s for same client → Clearway aggregates into single summary → Export to CPA

**Acceptance Criteria**:
- ✅ Upload K-1 PDF → Extract key boxes
- ✅ 90% accuracy (lower threshold due to complexity)
- ✅ Aggregate K-1s by investor
- ✅ Export aggregate to CSV (for CPA)

**Monetization**: Upsell to Professional tier ($799/mo includes K-1 processing)

---

## SALES & MARKETING (MONTHS 7-12)

### Goal: Grow from 50 RIAs to 350 RIAs

**Month 7: 100 RIAs (+50)**
- Outbound: Email 500 RIAs from target list
- Inbound: Content marketing (blog posts, SEO)
- Referrals: Ask existing RIAs for referrals (10% incentive)

**Month 8-9: 150-200 RIAs (+50/month)**
- Hire Sales Rep #2
- Launch webinar series: "Automating Alternative Investments"
- Attend RIA conference (TBD which one)
- Fund admin as sales channel: "X fund admin clients already use Clearway"

**Month 10-12: 200-350 RIAs (+50/month)**
- Hire SDR #2
- Launch paid ads (Google, LinkedIn)
- Case studies from Phase 1 customers
- PR push: "Clearway raises $5M to automate alternatives"

**CAC Target**: $3,000 per RIA (paid back in 3 months)
**Conversion Rate**: 5% of demo → paid (industry standard)
**Demo-to-Close**: 14 days average

---

## TEAM EXPANSION

### New Hires (Months 7-12)

| Role | Month | Why | Comp |
|------|-------|-----|------|
| Senior Backend Engineer | 7 | Fund admin API complexity | $200K + 0.5% |
| Sales Rep #2 | 8 | Scale outbound | $100K + $100K OTE |
| SDR #2 | 9 | More leads needed | $80K + $40K OTE |
| Customer Success #2 | 10 | 200+ customers need support | $100K + 0.25% |
| Integration Engineer | 11 | Portfolio system integrations | $180K + 0.5% |
| Product Designer | 11 | UI polish + new features | $150K + 0.3% |

**Total Headcount by Month 12**: 14 people
**Monthly Burn**: $350K

---

## METRICS & KPIS (MONTH 12 TARGETS)

### Revenue
- **MRR**: $450K
- **ARR**: $5.4M
- **RIA Customers**: 350
- **Fund Admins**: 3 (live in production)
- **ARPU**: $1,285/month

### Product
- **Documents Processed**: 15,000/month
- **AI Accuracy**: 96%+ (improved from 95%)
- **Processing Time**: <30 seconds average
- **API Uptime**: 99.9%

### Sales & Marketing
- **CAC**: <$3,000
- **LTV**: $75,000 (5-year)
- **LTV:CAC**: 25:1
- **Churn**: <5% annual
- **NPS**: 70+

### Fund Admin API
- **Total API Calls**: 5,000/month
- **Success Rate**: 98%+
- **Average Response Time**: <500ms
- **Webhook Delivery Success**: 99%+

---

## RISKS & MITIGATION

### Risk 1: Fund Admins Don't Integrate
**Probability**: Medium (30%)
**Impact**: High (delays network effects)
**Mitigation**:
- Over-recruit pilots (start with 5 fund admins, aim for 3 live)
- Offer 6-month free pilot instead of 3 months
- Build manual CSV upload workaround
- Fallback: Focus on portfolio integrations instead

### Risk 2: AI Accuracy Plateaus <95%
**Probability**: Low (15%)
**Impact**: High (blocks fund admin trust)
**Mitigation**:
- Hire ML engineer to fine-tune models
- Collect 10,000+ documents for training
- Implement human-in-the-loop for edge cases
- Offer manual review SLA for fund admins

### Risk 3: Can't Hit 350 RIA Target
**Probability**: Medium (25%)
**Impact**: Medium (delays Series A)
**Mitigation**:
- Hire Sales Rep #3 in Month 10
- Increase marketing spend ($50K → $100K/month)
- Launch referral program (20% discount)
- Partner with RIA networks (XY Planning, NAPFA)

---

## SUCCESS CRITERIA

### Must-Have (Block Series A if not met)
- ✅ **$5M+ ARR** (target: $5.4M)
- ✅ **3+ fund admins live** (POSTing data via API)
- ✅ **300+ RIA customers** (target: 350)
- ✅ **95%+ AI accuracy**
- ✅ **<5% annual churn**

### Nice-to-Have (Accelerate Series A)
- ✅ 1 portfolio system integration live (Addepar priority)
- ✅ Distribution processing launched
- ✅ K-1 processing beta launched
- ✅ NPS 70+
- ✅ Press coverage in fintech/RIA publications

---

## MONTH 12 → SERIES A PREPARATION

### Series A Target
- **Raise**: $20M at $100M post-money valuation
- **Use of Funds**: Scale to $50M ARR (hire 40 people, international expansion)

### Investor Deck Updates
- Update traction slide: 350 RIAs, 3 fund admins, $5.4M ARR
- Add network effects proof: "X% of capital calls now API-delivered"
- Show unit economics improvement: CAC down, LTV up
- Case studies from fund admins
- Testimonials from RIAs

### Due Diligence Prep
- SOC2 Type 2 certification (in progress)
- Legal: Review all fund admin contracts
- Financial: Clean books, accurate revenue recognition
- Technical: Code review, security audit
- Customer references: 10 RIAs willing to take investor calls

---

## AGENT TASK BREAKDOWN

### Backend Agent
- Fund admin API implementation (Month 7-8)
- Distribution processing backend (Month 10)
- K-1 processing backend (Month 11)
- API performance optimization

### AI/ML Agent
- Distribution extraction model (Month 10)
- K-1 extraction model (Month 11)
- Improve accuracy to 96%+ (ongoing)
- Model monitoring & retraining

### Frontend Agent
- Fund admin dashboard (Month 8)
- Distribution review UI (Month 10)
- K-1 aggregation UI (Month 11)
- Portfolio integration connection flow (Month 9-11)

### Integration Agent
- Addepar OAuth + API (Month 9)
- Orion API (Month 10-11)
- Black Diamond API (Month 12)
- Fund admin webhook delivery

### DevOps Agent
- API rate limiting & monitoring (Month 7)
- Scale infrastructure for 350 customers
- API documentation hosting
- Sandbox environment setup

### Testing Agent
- Fund admin API integration tests
- Distribution extraction tests
- K-1 extraction tests
- Load testing (handle 350 concurrent users)

### Security & Compliance Agent
- Fund admin API security audit
- SOC2 Type 2 preparation
- GDPR compliance for international RIAs

---

**Phase 2 Complete → Ready for Series A fundraising with proven network effects and $5.4M ARR**

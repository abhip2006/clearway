# Portfolio Systems API Research

**Date:** November 2025
**Purpose:** Research major portfolio management systems for Clearway integration (Phase 2)
**Status:** Pre-integration research

---

## Overview

RIAs use portfolio management systems to track client investments. Integrating Clearway with these systems eliminates manual data entry of capital calls, distributions, and NAV updates.

**Target Systems:**
1. Black Diamond (SS&C Technologies)
2. Orion Advisor Services
3. Addepar

**Integration Goal**: Automatically push extracted capital call data to these systems via API.

---

## 1. Addepar

### Overview
- **Company**: Addepar
- **Market**: High-end RIAs, family offices, wealth management firms
- **Users**: 750+ firms, $5T+ AUM
- **API Maturity**: Excellent - Public APIs with comprehensive documentation

### API Documentation
- **Developer Portal**: https://developers.addepar.com/
- **API Type**: RESTful JSON APIs
- **Authentication**: OAuth 2.0
- **Rate Limits**: TBD (contact Addepar for details)

### Key APIs for Clearway Integration

#### 1. Portfolio API
**Endpoint**: `GET /v1/portfolio/{portfolio_id}`
- Extract portfolio data based on saved analysis views
- Useful for reading existing holdings to match capital calls

**Use Case**: Query portfolio to verify fund holdings before posting capital call

#### 2. Portfolio Query API
**Endpoint**: `POST /v1/portfolio/query`
- Dynamic queries without referencing view IDs
- Flexible attribute selection (e.g., Time Weighted Return, NAV)

**Use Case**: Query specific fund holdings dynamically

#### 3. Transactions API (ASSUMED - needs verification)
**Endpoint**: `POST /v1/transactions` (needs confirmation)
- Post transactions (capital calls, distributions)
- Required fields: portfolio_id, security_id, amount, date, type

**Use Case**: **Post capital call as a pending transaction** (This is the KEY integration)

#### 4. Securities API (ASSUMED)
**Endpoint**: `POST /v1/securities`
- Create or update fund securities
- Required fields: ticker, name, type (e.g., "Private Equity Fund")

**Use Case**: Ensure fund exists in Addepar before posting capital call

### Integration Approach

```typescript
// Clearway → Addepar Integration Flow

async function postCapitalCallToAddepar(capitalCall: CapitalCall, mapping: AddeaparMapping) {
  // 1. Get portfolio
  const portfolio = await addepar.getPortfolio(mapping.portfolioId);

  // 2. Find or create security (fund)
  let security = await addepar.findSecurity({ name: capitalCall.fundName });
  if (!security) {
    security = await addepar.createSecurity({
      name: capitalCall.fundName,
      type: 'Private Equity Fund',
      // ... other fields
    });
  }

  // 3. Post capital call as transaction
  await addepar.createTransaction({
    portfolio_id: mapping.portfolioId,
    security_id: security.id,
    amount: -capitalCall.amountDue, // Negative = cash outflow
    date: capitalCall.dueDate,
    type: 'capital_call',
    status: 'pending', // Until actually wired
  });

  return { success: true };
}
```

### Authentication Flow
```typescript
// OAuth 2.0 with Addepar

// Step 1: Redirect user to Addepar OAuth
const authUrl = `https://addepar.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;

// Step 2: Exchange code for access token
const tokenResponse = await fetch('https://addepar.com/oauth/token', {
  method: 'POST',
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  }),
});

const { access_token, refresh_token } = await tokenResponse.json();

// Step 3: Use access token for API calls
const response = await fetch('https://api.addepar.com/v1/portfolio/12345', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
  },
});
```

### Required Information from RIA
- Addepar firm ID
- OAuth authorization (user grants Clearway access)
- Portfolio ID mappings (which Clearway organization maps to which Addepar portfolio)

### Implementation Complexity: **Medium**
- ✅ Good API documentation
- ✅ Standard OAuth 2.0
- ⚠️ Need to verify Transactions API endpoints (not confirmed in search results)
- ⚠️ May require Addepar partnership for production API access

---

## 2. Black Diamond (SS&C Technologies)

### Overview
- **Company**: SS&C Advent (now SS&C Technologies)
- **Market**: Mid-market RIAs
- **Users**: 2,000+ firms
- **API Maturity**: Good - Mature APIs, but documentation may be gated

### API Documentation
- **Developer Portal**: Likely gated behind client login
- **Contact**: SS&C Black Diamond support or sales team
- **API Type**: Likely RESTful or SOAP (older platform)
- **Authentication**: Likely API keys or OAuth

### Expected API Capabilities

Based on industry standards for portfolio management systems:

#### 1. Portfolio Holdings API
- Read current holdings
- Query by account, fund, or security

#### 2. Transactions API
- **POST transactions** (capital calls, distributions, buys, sells)
- Required fields: account_id, security_id, quantity, price, date, type

#### 3. Accounts API
- List accounts under management
- Get account details

### Integration Approach (ESTIMATED)

```typescript
// Clearway → Black Diamond Integration Flow

async function postCapitalCallToBlackDiamond(capitalCall: CapitalCall, mapping: BDMapping) {
  // 1. Authenticate
  const auth = await blackDiamond.authenticate({
    apiKey: mapping.apiKey,
    firmId: mapping.firmId,
  });

  // 2. Find account
  const account = await blackDiamond.getAccount(mapping.accountId);

  // 3. Find or create security (fund)
  let security = await blackDiamond.findSecurity({ ticker: capitalCall.fundName });
  if (!security) {
    security = await blackDiamond.createSecurity({
      ticker: capitalCall.fundName,
      name: capitalCall.fundName,
      asset_class: 'Alternative Investment',
    });
  }

  // 4. Post capital call transaction
  await blackDiamond.createTransaction({
    account_id: account.id,
    security_id: security.id,
    amount: capitalCall.amountDue,
    transaction_date: capitalCall.dueDate,
    transaction_type: 'CONTRIBUTION', // Or 'CAPITAL_CALL'
    status: 'PENDING',
  });

  return { success: true };
}
```

### Required Information from RIA
- API credentials (from Black Diamond account)
- Firm ID
- Account ID mappings
- Potentially: White-list Clearway's IP addresses

### Implementation Complexity: **High**
- ⚠️ API documentation not publicly available
- ⚠️ May require direct partnership with SS&C
- ⚠️ Authentication scheme unknown (API key vs OAuth)
- ⚠️ **RECOMMENDATION**: Reach out to SS&C Black Diamond early in Phase 2 planning

---

## 3. Orion Advisor Services

### Overview
- **Company**: Orion Advisor Solutions
- **Market**: Mid-to-large RIAs
- **Users**: 2,500+ firms, $2T+ AUM
- **API Maturity**: Good - Growing API platform

### API Documentation
- **Developer Portal**: Likely at developers.orionadvisor.com (needs verification)
- **Contact**: Orion support or integration team
- **API Type**: RESTful APIs
- **Authentication**: Likely OAuth 2.0 or API tokens

### Expected API Capabilities

#### 1. Accounts API
- List client accounts
- Get account details, holdings

#### 2. Securities Master API
- Find securities
- Create custom securities (for private funds)

#### 3. Transactions API
- Post transactions (contributions, withdrawals, trades)
- Likely supports capital calls as a transaction type

#### 4. Performance Reporting API
- Update NAV
- Post performance data

### Integration Approach (ESTIMATED)

```typescript
// Clearway → Orion Integration Flow

async function postCapitalCallToOrion(capitalCall: CapitalCall, mapping: OrionMapping) {
  // 1. Authenticate (OAuth or API token)
  const auth = await orion.authenticate({
    clientId: mapping.clientId,
    clientSecret: mapping.clientSecret,
  });

  // 2. Get client account
  const account = await orion.getAccount(mapping.accountId);

  // 3. Find or create fund security
  let security = await orion.findSecurity({ symbol: capitalCall.fundName });
  if (!security) {
    security = await orion.createSecurity({
      symbol: capitalCall.fundName,
      name: capitalCall.fundName,
      type: 'Alternative',
    });
  }

  // 4. Post capital call as contribution
  await orion.createTransaction({
    account_id: account.id,
    security_id: security.id,
    amount: capitalCall.amountDue,
    date: capitalCall.dueDate,
    type: 'CONTRIBUTION',
    status: 'PENDING',
  });

  return { success: true };
}
```

### Required Information from RIA
- Orion API credentials
- Rep code or firm ID
- Account mappings
- OAuth authorization

### Implementation Complexity: **Medium-High**
- ⚠️ Need to verify current API capabilities
- ⚠️ May require Orion partnership for API access
- ⚠️ **RECOMMENDATION**: Contact Orion integration team during Phase 2 planning

---

## Cross-Platform Integration Architecture

### Database Schema for Integration Mappings

```prisma
// prisma/schema.prisma

model PortfolioIntegration {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  // Integration type
  platform       IntegrationPlatform @default(ADDEPAR)

  // OAuth tokens (encrypted)
  accessToken    String?  @db.Text
  refreshToken   String?  @db.Text
  tokenExpiresAt DateTime?

  // API credentials (encrypted)
  apiKey         String?
  apiSecret      String?

  // Platform-specific IDs
  platformFirmId String?  // Addepar firm ID, Black Diamond firm ID, etc.

  // Status
  status         IntegrationStatus @default(ACTIVE)
  lastSyncAt     DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  mappings       PortfolioMapping[]

  @@index([userId])
  @@index([organizationId])
  @@index([platform])
}

model PortfolioMapping {
  id            String   @id @default(cuid())
  integrationId String
  integration   PortfolioIntegration @relation(fields: [integrationId], references: [id])

  // Clearway fund name → Portfolio system security ID
  fundName      String   // e.g., "Apollo Fund XI"
  platformSecurityId String // e.g., Addepar security ID

  // Account mapping (if needed)
  platformAccountId String? // Which account to post to

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([integrationId])
  @@index([fundName])
}

enum IntegrationPlatform {
  ADDEPAR
  BLACK_DIAMOND
  ORION
}

enum IntegrationStatus {
  ACTIVE
  DISCONNECTED
  ERROR
}
```

### Universal Integration Interface

```typescript
// lib/integrations/portfolio-integration.ts

export interface PortfolioIntegration {
  // Authentication
  authenticate(credentials: any): Promise<void>;

  // Get portfolio/account
  getAccount(accountId: string): Promise<Account>;

  // Find security (fund)
  findSecurity(query: { name?: string; ticker?: string }): Promise<Security | null>;

  // Create security
  createSecurity(data: SecurityData): Promise<Security>;

  // Post transaction (capital call, distribution)
  postTransaction(transaction: TransactionData): Promise<Transaction>;

  // Get holdings
  getHoldings(accountId: string): Promise<Holding[]>;

  // Update NAV (for Phase 3)
  updateNAV(securityId: string, nav: number, date: Date): Promise<void>;
}

// Implementations
export class AddeaparIntegration implements PortfolioIntegration { /* ... */ }
export class BlackDiamondIntegration implements PortfolioIntegration { /* ... */ }
export class OrionIntegration implements PortfolioIntegration { /* ... */ }
```

---

## Phase 2 Integration Plan

### Month 7: Research & Partnerships
- Contact Addepar integration team
- Contact SS&C Black Diamond integration team
- Contact Orion integration team
- Request API documentation
- Request sandbox/test environments
- Negotiate partnership terms

### Month 8-9: Addepar Integration (Priority 1)
- Build OAuth flow
- Implement Portfolio API integration
- Implement Transactions API
- Test with 3 pilot RIAs using Addepar
- **Goal**: 20 RIAs with Addepar integration

### Month 10-11: Orion Integration (Priority 2)
- Build authentication
- Implement Accounts & Transactions APIs
- Test with 2 pilot RIAs using Orion
- **Goal**: 15 RIAs with Orion integration

### Month 12: Black Diamond Integration (Priority 3)
- Build authentication
- Implement Transactions API
- Test with 2 pilot RIAs
- **Goal**: 10 RIAs with Black Diamond integration

### Success Metrics (Month 12)
- ✅ 45 RIAs using portfolio integrations (out of 350 total)
- ✅ 95%+ transaction success rate
- ✅ <5% integration errors

---

## Risks & Mitigation

### Risk 1: API Access Denial
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Build relationships with platform teams early
- Position as adding value (reducing support burden for fund admins)
- Offer revenue share or partnership terms
- Fallback: CSV export workaround (manual import to portfolio systems)

### Risk 2: Complex Authentication
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Prioritize platforms with standard OAuth 2.0
- Hire integration engineer with fintech experience
- Budget extra time for authentication debugging

### Risk 3: Rate Limiting
**Probability**: High
**Impact**: Low
**Mitigation**:
- Implement queue system for API calls
- Batch transactions where possible
- Monitor rate limit headers and backoff gracefully

### Risk 4: API Schema Changes
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Subscribe to API change logs
- Implement robust error handling
- Version our integration code
- Automated tests for API compatibility

---

## Cost Estimates

### Development Costs
- Addepar integration: 3 weeks engineer time (~$15K)
- Orion integration: 3 weeks (~$15K)
- Black Diamond integration: 4 weeks (~$20K)
- Testing & QA: 2 weeks (~$10K)
- **Total**: ~$60K

### Partnership Costs (ESTIMATED)
- Addepar: Likely free (mutual benefit) or rev share
- Orion: Likely free or small annual fee ($5K-$10K)
- Black Diamond: Unknown (may require partnership fee)

### Ongoing Costs
- API maintenance: 1 engineer @ 20% time (~$40K/year)
- Monitoring & support: Included in customer success

---

## Next Steps (Before Phase 2)

1. **Week 1**: Email Addepar integration team
   - Request API access for Clearway
   - Request sandbox environment
   - Schedule intro call

2. **Week 2**: Email Orion integration team
   - Same as above

3. **Week 3**: Email SS&C Black Diamond
   - Request partnership discussion
   - Request API documentation

4. **Week 4**: Based on responses, prioritize integrations
   - If all 3 positive → proceed with plan
   - If 1-2 blocked → adjust Phase 2 timeline
   - If all blocked → pivot to CSV export workaround

---

## Conclusion

**Addepar** is the most integration-ready platform with public APIs. Start here.

**Orion** likely has good APIs but needs partnership. Second priority.

**Black Diamond** is more uncertain - may require deeper partnership negotiations.

**Recommendation**: Build Addepar integration first in Phase 2 to prove value proposition, then leverage that success to unlock partnerships with Orion and Black Diamond.

---

**Next Agent**: Integration Agent will implement these integrations in Phase 2.

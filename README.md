# Clearway

**Data Infrastructure for Alternative Investments**

> The Plaid for Alternatives

---

## Overview

Clearway is building the data infrastructure layer for alternative investments - connecting fund administrators, RIAs, family offices, and investors through a unified, API-first platform.

### The Problem

$50 billion flows through alternative investments annually across 100,000+ fund-to-investor relationships. **Every transaction is 100% manual:**

- Fund administrators email PDFs
- RIAs manually type data into systems
- Investors get stale data 60+ days late
- CPAs reconstruct everything for taxes

### The Solution

Multi-sided platform with AI-powered automation:

- **For Fund Administrators**: API-first integration, instant digital delivery
- **For RIAs**: Zero manual data entry, 95%+ AI accuracy extraction
- **For Investors**: Real-time portfolio tracking and tax aggregation
- **For CPAs**: K-1 aggregation across all funds

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query

### Backend
- Next.js API Routes
- tRPC (type-safe APIs)
- Prisma ORM
- PostgreSQL (Neon)
- Inngest (background jobs)

### AI/ML
- Azure Document Intelligence (OCR)
- OpenAI GPT-4o-mini (extraction)
- 95%+ accuracy target

### Infrastructure
- Vercel (hosting)
- Cloudflare R2 (storage)
- Clerk (authentication)
- Resend (email)
- Sentry (error tracking)

## Project Structure

```
clearway/
├── agents/                    # Multi-agent development system
│   ├── orchestrator-agent.md  # Master coordinator
│   ├── frontend-agent.md      # UI/UX development
│   ├── backend-agent.md       # API & business logic
│   ├── database-agent.md      # Schema & data layer
│   ├── ai-ml-agent.md         # AI extraction pipeline
│   ├── devops-agent.md        # Infrastructure & deployment
│   ├── integration-agent.md   # Third-party services
│   └── testing-agent.md       # Comprehensive testing
├── Clearway_PRD_VentureScale.pdf        # Product requirements
├── Clearway_MVP_Build_Plan.md           # Technical implementation plan
├── Clearway_Executive_Summary.md        # Business overview
└── CLAUDE.md                             # Development guidelines
```

## Development Approach

This project uses a **multi-agent development system** with 8 specialized agents, each responsible for different aspects of the MVP:

1. **Orchestrator Agent** - Coordinates all agents and manages timeline
2. **Frontend Agent** - Builds UI components and pages
3. **Backend Agent** - Implements APIs and business logic
4. **Database Agent** - Designs schema and manages data
5. **AI/ML Agent** - Builds extraction pipeline (95%+ accuracy)
6. **DevOps Agent** - Handles deployment and monitoring
7. **Integration Agent** - Integrates third-party services
8. **Testing Agent** - Ensures 95%+ test coverage

See [agents/README.md](./agents/README.md) for details.

## Timeline

**8-week MVP development:**

- **Week 0**: Setup (2-3 days)
- **Week 1**: Document upload
- **Week 2**: AI extraction (90%+ accuracy)
- **Week 3**: Review interface
- **Week 4**: Calendar & alerts
- **Week 5**: Export & Fund Admin API
- **Week 6**: User management & polish
- **Week 7**: Testing (95% coverage)
- **Week 8**: Production deployment

## Success Metrics

### MVP Launch (Month 6)
- 50 RIA customers
- $450K ARR
- 95% AI accuracy
- 3 fund admin pilots

### Series A Target (Month 18)
- 600 RIA customers + 10 fund admins
- $10M ARR
- Raise at $100M valuation

## Market Opportunity

**Total Addressable Market: $430M**

- RIAs: $45M
- Family Offices: $150M
- Fund Administrators: $40M
- Direct Investors: $30M
- CPAs: $40M
- Transaction Revenue: $125M

**At 25% market share = $107M ARR = $1B+ valuation**

## Phase 2 Features (Complete)

In addition to the MVP features, Clearway now includes:

### Fund Administrator Integrations
- ✅ SS&C Geneva integration
- ✅ Carta webhook integration
- ✅ Investor mapping and auto-sync
- 🚧 Juniper Square (in progress)

### Payment Reconciliation
- ✅ Automatic payment matching (90%+ accuracy)
- ✅ SWIFT message parsing
- ✅ ACH transaction processing
- ✅ Bank statement upload

### Accounting & E-Signature
- ✅ QuickBooks Online integration
- ✅ DocuSign integration
- ✅ Journal entry automation
- ✅ Payment sync

### Enterprise Features
- ✅ Multi-tenant organizations
- ✅ Custom roles (RBAC)
- ✅ SSO (SAML/OIDC)
- ✅ Advanced audit logging
- ✅ GDPR compliance tools

### Analytics & Reporting
- ✅ Dashboard analytics
- ✅ AI-powered forecasting
- ✅ Pattern detection
- ✅ Scheduled reports

---

## Documentation

### User Guides
- **[Getting Started Guide](docs/user-guide/GETTING_STARTED.md)** - Complete onboarding for new users
- **[Admin Guide](docs/user-guide/ADMIN_GUIDE.md)** - Organization management, security, team administration
- **[Payment Reconciliation](docs/user-guide/PAYMENT_RECONCILIATION.md)** - SWIFT, ACH, bank statement processing

### Integration Guides
- **[Fund Administrator Setup](docs/integrations/FUND_ADMIN_SETUP.md)** - SS&C Geneva, Carta, Juniper Square
- **[QuickBooks Setup](docs/integrations/QUICKBOOKS_SETUP.md)** - Accounting integration guide
- **[DocuSign Setup](docs/integrations/DOCUSIGN_SETUP.md)** - E-signature integration

### Developer Documentation
- **[Developer Setup](docs/development/SETUP.md)** - Local development environment setup
- **[API Reference](docs/api/API_REFERENCE.md)** - Complete API documentation
- **[Webhook Guide](docs/api/WEBHOOKS.md)** - Real-time event notifications
- **[Deployment Guide](docs/deployment/DEPLOYMENT.md)** - Production deployment on Vercel

### Architecture & Security
- **[System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)** - Technical architecture overview
- **[Security Documentation](docs/security/SECURITY.md)** - Security best practices, compliance
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute to Clearway
- **[Release Notes](docs/RELEASE_NOTES.md)** - Version history and changelog
- **[FAQ](docs/FAQ.md)** - Frequently asked questions

---

## Quick Start

### For Users

1. **Sign up**: https://clearway.com
2. **Upload a document**: Drag and drop your capital call PDF
3. **Review extraction**: Verify AI-extracted data (95%+ accuracy)
4. **Approve**: Capital call syncs to your systems automatically

See [Getting Started Guide](docs/user-guide/GETTING_STARTED.md) for detailed instructions.

### For Developers

1. **Clone repository**:
   ```bash
   git clone https://github.com/clearway/clearway.git
   cd clearway
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Initialize database**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

See [Developer Setup Guide](docs/development/SETUP.md) for complete setup instructions.

### For API Integration

```typescript
import Clearway from '@clearway/node';

const clearway = new Clearway('sk_live_...');

// Create capital call
const capitalCall = await clearway.capitalCalls.create({
  fundName: 'Acme Ventures Fund III',
  investorEmail: 'investor@example.com',
  amountDue: 100000.00,
  dueDate: '2025-02-15'
});

// List capital calls
const calls = await clearway.capitalCalls.list({
  status: 'APPROVED',
  limit: 10
});
```

See [API Reference](docs/api/API_REFERENCE.md) for complete API documentation.

---

## Support

### Community
- **Documentation**: https://docs.clearway.com
- **Community Slack**: https://clearway-community.slack.com
- **Office Hours**: Fridays 2-3pm EST

### Contact
- **Email**: support@clearway.com
- **Developer Support**: dev@clearway.com
- **Security Issues**: security@clearway.com
- **Sales**: sales@clearway.com

### Resources
- **Status Page**: https://status.clearway.com
- **Changelog**: https://clearway.com/changelog
- **API Status**: https://api-status.clearway.com

---

## License

Proprietary - All Rights Reserved

---

**Building the infrastructure layer for a $13 trillion asset class.**

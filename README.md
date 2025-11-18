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

## Getting Started

See [Clearway_MVP_Build_Plan.md](./Clearway_MVP_Build_Plan.md) for detailed development instructions.

## License

Proprietary - All Rights Reserved

---

**Building the infrastructure layer for a $13 trillion asset class.**

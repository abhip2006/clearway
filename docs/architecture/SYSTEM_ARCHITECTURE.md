# System Architecture

This document describes the technical architecture of Clearway, including system design, data flow, and technology stack.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [Multi-Agent Development](#multi-agent-development)
6. [Phase 1 vs Phase 2 Features](#phase-1-vs-phase-2-features)
7. [Security Architecture](#security-architecture)
8. [Scalability Considerations](#scalability-considerations)

---

## System Overview

Clearway is a **multi-tenant SaaS platform** for automating capital call processing using AI. It connects fund administrators, RIAs, family offices, and investors through a unified API-first platform.

### Core Components

1. **Frontend (Next.js 15)**: React-based UI with server-side rendering
2. **Backend (Next.js API Routes)**: RESTful API + tRPC for type-safe internal APIs
3. **Database (PostgreSQL)**: Relational database via Prisma ORM
4. **AI/ML Layer**: Azure Document Intelligence + GPT-4 for extraction
5. **Background Jobs (Inngest)**: Async processing and workflows
6. **Storage (Cloudflare R2)**: Document storage with CDN
7. **Authentication (Clerk)**: User management and SSO
8. **Monitoring (Sentry + Langfuse)**: Error tracking and AI observability

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Web App (Next.js)  │  Mobile (Future)  │  API Clients          │
└──────────────┬──────┴───────────┬────────┴───────────┬──────────┘
               │                   │                     │
               └───────────────────┴─────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────┐
│                       APPLICATION LAYER                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
│   │  Next.js    │    │    tRPC      │    │  REST API   │       │
│   │  Pages/App  │◄───┤  Type-Safe   │◄───┤  (Public)   │       │
│   │   Router    │    │     APIs     │    │             │       │
│   └─────────────┘    └──────────────┘    └─────────────┘       │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────┴───────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │   Document   │  │  Capital Call │  │     Payment         │  │
│  │  Processing  │  │   Management  │  │  Reconciliation     │  │
│  └──────────────┘  └───────────────┘  └─────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │    User &    │  │ Organization  │  │    Integration      │  │
│  │     Auth     │  │  Management   │  │     Handlers        │  │
│  └──────────────┘  └───────────────┘  └─────────────────────┘  │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────┴───────────────────────────────────┐
│                           DATA LAYER                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌──────────────────────┐         ┌─────────────────────┐      │
│   │   PostgreSQL (Neon)  │         │  Cloudflare R2      │      │
│   │   - User Data        │         │  - Document Storage │      │
│   │   - Capital Calls    │         │  - PDF Files        │      │
│   │   - Organizations    │         │  - CDN Delivery     │      │
│   │   - Audit Logs       │         │                     │      │
│   └──────────────────────┘         └─────────────────────┘      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────┴───────────────────────────────────┐
│                      EXTERNAL SERVICES LAYER                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │    Azure     │  │    OpenAI    │  │      Inngest       │    │
│  │  Document AI │  │   GPT-4 API  │  │  Background Jobs   │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │    Clerk     │  │    Resend    │  │      Sentry        │    │
│  │     Auth     │  │    Email     │  │  Error Tracking    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────┴───────────────────────────────────┐
│                      INTEGRATIONS LAYER                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  SS&C Geneva │  │    Carta     │  │   QuickBooks       │    │
│  │  Fund Admin  │  │  Fund Admin  │  │   Accounting       │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  DocuSign    │  │    Plaid     │  │      Stripe        │    │
│  │  E-Signature │  │   Banking    │  │     Payments       │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

- **Next.js 15** (App Router): Server-side rendering, streaming, React Server Components
- **React 19**: Latest React features, concurrent rendering
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **TanStack Query**: Server state management
- **Zustand**: Client state management (when needed)

### Backend

- **Next.js API Routes**: Serverless API endpoints
- **tRPC**: Type-safe internal APIs
- **Prisma ORM**: Database abstraction and migrations
- **PostgreSQL**: Relational database (via Neon)
- **Inngest**: Background job processing

### AI/ML

- **Azure Document Intelligence**: OCR and document layout analysis
- **OpenAI GPT-4**: Data extraction and structuring
- **Anthropic Claude**: Alternative AI model (optional)
- **TensorFlow.js**: Client-side AI (future)
- **Langfuse**: LLM observability and monitoring

### Infrastructure

- **Vercel**: Hosting and edge network
- **Cloudflare R2**: Object storage (S3-compatible)
- **Neon**: Serverless PostgreSQL
- **Clerk**: Authentication and user management
- **Resend**: Transactional email

### Monitoring & Observability

- **Sentry**: Error tracking and performance monitoring
- **Langfuse**: AI/LLM observability
- **Vercel Analytics**: Web analytics and Core Web Vitals

---

## Data Flow

### Document Upload and Processing

```
1. User uploads PDF via web interface
   │
   ├─> File uploaded to Cloudflare R2
   │   └─> Secure, encrypted storage
   │
   ├─> Document metadata saved to PostgreSQL
   │   └─> Status: PENDING
   │
   └─> Inngest job triggered: "process-document"
       │
       ├─> Step 1: OCR Extraction (Azure Document Intelligence)
       │   └─> Extract raw text and layout
       │
       ├─> Step 2: AI Extraction (GPT-4)
       │   └─> Structure data into capital call fields
       │   └─> Generate confidence scores
       │
       ├─> Step 3: Validation
       │   └─> Check required fields present
       │   └─> Validate data formats
       │
       ├─> Step 4: Save to Database
       │   └─> Create CapitalCall record
       │   └─> Link to Document
       │   └─> Status: REVIEW
       │
       └─> Step 5: Notify User
           └─> Email notification sent
           └─> In-app notification displayed
```

### Capital Call Approval Flow

```
1. User reviews capital call in UI
   │
   ├─> User makes corrections (if needed)
   │   └─> Updates saved to database
   │
   ├─> User clicks "Approve"
   │   │
   │   ├─> API call: POST /api/capital-calls/:id/approve
   │   │
   │   ├─> Database updated: status = APPROVED
   │   │
   │   ├─> Trigger integrations:
   │   │   ├─> QuickBooks: Create journal entry
   │   │   ├─> DocuSign: Send for signature
   │   │   └─> Webhooks: Notify external systems
   │   │
   │   └─> Email notification to investor
   │
   └─> Capital call appears in calendar
```

### Payment Reconciliation Flow

```
1. Payment received (SWIFT message or bank statement)
   │
   ├─> Parse payment details:
   │   ├─> Amount
   │   ├─> Date
   │   ├─> Reference number
   │   └─> Sender information
   │
   ├─> Automatic matching algorithm:
   │   │
   │   ├─> Try exact match (wire reference)
   │   │   └─> 100% confidence → Auto-reconcile
   │   │
   │   ├─> Try fuzzy match (amount + investor)
   │   │   └─> 85-99% confidence → Suggest match
   │   │
   │   └─> No match found
   │       └─> Manual review required
   │
   ├─> If matched:
   │   ├─> Update payment status: RECONCILED
   │   ├─> Update capital call: PAID
   │   ├─> Sync to QuickBooks (create deposit)
   │   └─> Send confirmation email
   │
   └─> If unmatched:
       └─> Add to "Unmatched Payments" queue
```

---

## Multi-Agent Development

Clearway was built using a **multi-agent development system** with 8 specialized AI agents:

### Phase 1: MVP Development (8 Agents)

1. **Orchestrator Agent**: Coordinates all agents, manages timeline
2. **Frontend Agent**: Builds UI components and pages
3. **Backend Agent**: Implements APIs and business logic
4. **Database Agent**: Designs schema and manages data layer
5. **AI/ML Agent**: Builds extraction pipeline (95%+ accuracy)
6. **DevOps Agent**: Handles deployment and monitoring
7. **Integration Agent**: Integrates third-party services
8. **Testing Agent**: Ensures 95%+ test coverage

### Phase 2: Advanced Features (8 Additional Agents)

9. **Fund Admin Integration Agent**: SS&C Geneva, Carta, etc.
10. **Payment Processing Agent**: Payment reconciliation
11. **Integration Expansion Agent**: QuickBooks, DocuSign, Plaid
12. **Security & Compliance Agent**: GDPR, SOC 2, audit logs
13. **Multi-Tenant & Enterprise Agent**: Organizations, SSO, RBAC
14. **Analytics & Reporting Agent**: Dashboards, forecasting, exports
15. **Performance & Scaling Agent**: Optimization, caching, load testing
16. **Advanced AI Agent**: Custom models, improved accuracy

Each agent has specific responsibilities and deliverables. See `/agents/` directory for detailed specifications.

---

## Phase 1 vs Phase 2 Features

### Phase 1: MVP (Completed)

**Core Features**:
- ✅ User authentication (Clerk)
- ✅ Document upload (PDF)
- ✅ AI extraction (Azure + GPT-4)
- ✅ Review interface
- ✅ Capital call management
- ✅ Calendar view
- ✅ Email notifications
- ✅ Export (CSV, Excel)
- ✅ Basic API

**Infrastructure**:
- ✅ Next.js 15 + React 19
- ✅ PostgreSQL database
- ✅ Cloudflare R2 storage
- ✅ Vercel deployment
- ✅ Sentry error tracking

### Phase 2: Advanced Features (In Progress)

**Fund Admin Integrations**:
- ✅ SS&C Geneva connector
- ✅ Carta webhook integration
- 🚧 Juniper Square (in progress)
- 📋 Altvia (roadmap)

**Payment Features**:
- ✅ Payment reconciliation
- ✅ SWIFT message parsing
- ✅ ACH transaction processing
- ✅ Bank statement upload
- ✅ Plaid integration

**Accounting Integrations**:
- ✅ QuickBooks Online
- 📋 Xero (roadmap)
- 📋 NetSuite (enterprise)

**Enterprise Features**:
- ✅ Multi-tenant organizations
- ✅ Role-based access control (RBAC)
- ✅ SSO (SAML/OIDC)
- ✅ Custom roles
- ✅ Audit logs
- ✅ GDPR compliance tools

**Analytics**:
- ✅ Dashboard analytics
- ✅ Pattern detection
- ✅ Forecasting (AI-powered)
- ✅ Scheduled reports

Legend: ✅ = Completed, 🚧 = In Progress, 📋 = Roadmap

---

## Security Architecture

### Authentication & Authorization

**Clerk Authentication**:
- OAuth 2.0 / OIDC
- Multi-factor authentication (MFA)
- Session management
- SSO (SAML for enterprise)

**Authorization**:
- Role-based access control (RBAC)
- Permission-based scopes
- Organization-level isolation
- API key authentication

### Data Security

**Encryption**:
- **At Rest**: AES-256 encryption for database and storage
- **In Transit**: TLS 1.3 for all API calls
- **Credentials**: Encrypted using AWS KMS

**Data Isolation**:
- Multi-tenant database with organization-based filtering
- Row-level security (RLS) in PostgreSQL
- Separate S3/R2 buckets per organization

**Compliance**:
- GDPR compliant (data export, deletion)
- SOC 2 controls documented
- Audit logging for all actions
- Data retention policies

### Network Security

**Vercel Edge Network**:
- DDoS protection
- Rate limiting (60-300 req/min)
- IP allowlisting (enterprise)
- WAF (Web Application Firewall)

**API Security**:
- HMAC signature verification for webhooks
- API key rotation
- Request throttling
- Input validation (Zod schemas)

---

## Scalability Considerations

### Current Scale

- **Users**: Supports 1,000+ concurrent users
- **Documents**: 10,000+ documents/month
- **API**: 100,000+ requests/month
- **Storage**: Unlimited (Cloudflare R2)

### Horizontal Scaling

**Serverless Architecture**:
- Next.js API Routes auto-scale on Vercel
- No servers to manage
- Pay per execution

**Database Scaling**:
- Neon autoscales compute (0-10 vCPUs)
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)

**Caching Strategy**:
- Redis (future) for hot data
- CDN caching for static assets
- React Server Components caching

### Performance Optimizations

**Frontend**:
- Server-side rendering (SSR)
- Streaming for faster TTI
- Image optimization (next/image)
- Code splitting

**Backend**:
- Database query optimization
- Materialized views for analytics
- Background job queues (Inngest)
- API response caching

**Monitoring**:
- Sentry performance monitoring
- Vercel Analytics (Core Web Vitals)
- Database query performance tracking
- AI latency monitoring (Langfuse)

---

## Future Architecture Enhancements

### Planned Improvements

1. **GraphQL API**: For more flexible querying
2. **Real-time Updates**: WebSockets for live notifications
3. **Mobile Apps**: React Native for iOS/Android
4. **Advanced AI**: Custom fine-tuned models for higher accuracy
5. **Blockchain**: For immutable audit trail (enterprise)
6. **Multi-region**: Deploy in EU and APAC regions

---

## Glossary

- **SSR**: Server-Side Rendering
- **RSC**: React Server Components
- **tRPC**: TypeScript RPC (Remote Procedure Call)
- **ORM**: Object-Relational Mapping
- **RBAC**: Role-Based Access Control
- **SAML**: Security Assertion Markup Language
- **OIDC**: OpenID Connect
- **TTI**: Time to Interactive
- **CDN**: Content Delivery Network

---

**Questions?** Contact architecture@clearway.com or see [Developer Setup Guide](../development/SETUP.md)

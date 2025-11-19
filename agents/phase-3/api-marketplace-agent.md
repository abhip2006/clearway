# API Marketplace Agent - Phase 3 Specification

## Executive Summary

The API Marketplace Agent is the core component of Clearway's Phase 3 implementation, transforming the platform into a comprehensive developer ecosystem. This agent manages all API infrastructure, third-party integrations, monetization, and developer experience across REST, GraphQL, webhooks, and SDK layers.

**Status**: Phase 3
**Owner**: API Marketplace Agent
**Timeline**: Weeks 37-40
**Priority**: Critical

---

## 1. Core Architecture

### 1.1 Agent Responsibilities

The API Marketplace Agent is responsible for:

- **API Gateway Management**: Routing, authentication, rate limiting for all API traffic
- **Developer Platform**: Portal, documentation, API keys, credentials management
- **API Versioning**: Version management (v1, v2), deprecation policies
- **Marketplace Operations**: Third-party app listing, discovery, monetization
- **Authentication & Authorization**: OAuth 2.0, API key management, scope permissions
- **Infrastructure Monitoring**: Analytics, usage tracking, health checks
- **Developer Experience**: SDKs, playground, documentation, support
- **Monetization**: Tier management, billing integration, usage-based pricing
- **Webhook Management**: Event subscriptions, delivery guarantees, retry logic

### 1.2 Integration Points

```
┌─────────────────────────────────────────────────────────┐
│             API Marketplace Agent                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Gateway (REST + GraphQL)                    │   │
│  │  • Request routing & validation                  │   │
│  │  • Authentication & authorization                │   │
│  │  • Rate limiting & throttling                    │   │
│  │  • Request/response transformation               │   │
│  └──────────────────────────────────────────────────┘   │
│           ↓                ↓                ↓            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  REST API    │  │ GraphQL API  │  │  Webhooks    │   │
│  │  v1, v2      │  │  (Apollo)    │  │  (Events)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Developer Portal                                │   │
│  │  • API keys & credentials                        │   │
│  │  • Billing & usage analytics                     │   │
│  │  • App management                                │   │
│  │  • Documentation & playground                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Third-Party Marketplace                         │   │
│  │  • App listing & discovery                       │   │
│  │  • OAuth integration                             │   │
│  │  • Revenue sharing & monetization                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  SDKs & Tools                                    │   │
│  │  • Node.js, Python, Ruby, Go                     │   │
│  │  • API Playground (interactive)                  │   │
│  │  • CLI tools & utilities                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
         │                 │                │
         ↓                 ↓                ↓
    [Database]      [Analytics]      [External Services]
```

---

## 2. REST API Specification

### 2.1 API Endpoints (v1 & v2)

#### Authentication Endpoints

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/verify-email
POST /api/v1/auth/reset-password
GET  /api/v1/auth/user (requires authentication)
```

#### API Key Management

```
GET    /api/v1/keys - List API keys
POST   /api/v1/keys - Create new API key
GET    /api/v1/keys/{keyId} - Get specific key details
PUT    /api/v1/keys/{keyId} - Rotate/update API key
DELETE /api/v1/keys/{keyId} - Revoke API key
POST   /api/v1/keys/{keyId}/regenerate - Generate new secret
```

#### Marketplace App Management

```
GET    /api/v1/apps - List all marketplace apps
POST   /api/v1/apps - Submit new app to marketplace
GET    /api/v1/apps/{appId} - Get app details
PUT    /api/v1/apps/{appId} - Update app information
DELETE /api/v1/apps/{appId} - Remove app from marketplace
GET    /api/v1/apps/{appId}/reviews - Get app reviews
POST   /api/v1/apps/{appId}/reviews - Submit app review
GET    /api/v1/apps/{appId}/oauth/config - Get OAuth configuration
POST   /api/v1/apps/install - Install third-party app
DELETE /api/v1/apps/{installId}/uninstall - Uninstall app
```

#### Developer Portfolio Management

```
GET    /api/v1/portfolio - Get portfolio summary
POST   /api/v1/portfolio/projects - Create new project
GET    /api/v1/portfolio/projects - List portfolio projects
GET    /api/v1/portfolio/projects/{projectId} - Get project details
PUT    /api/v1/portfolio/projects/{projectId} - Update project
DELETE /api/v1/portfolio/projects/{projectId} - Delete project
POST   /api/v1/portfolio/projects/{projectId}/publish - Publish project
```

#### Usage & Analytics

```
GET  /api/v1/analytics/usage - Get API usage statistics
GET  /api/v1/analytics/endpoints - Get per-endpoint analytics
GET  /api/v1/analytics/errors - Get error tracking
GET  /api/v1/analytics/performance - Get performance metrics
GET  /api/v1/analytics/costs - Get usage-based billing costs
```

#### Billing & Subscription Management

```
GET    /api/v1/billing/plans - Get available subscription plans
GET    /api/v1/billing/current - Get current subscription
POST   /api/v1/billing/upgrade - Upgrade subscription tier
POST   /api/v1/billing/downgrade - Downgrade subscription tier
GET    /api/v1/billing/invoices - List invoices
GET    /api/v1/billing/invoices/{invoiceId} - Get invoice details
POST   /api/v1/billing/payment-methods - Add payment method
DELETE /api/v1/billing/payment-methods/{methodId} - Remove payment method
```

#### Webhook Management

```
GET    /api/v1/webhooks - List subscribed webhooks
POST   /api/v1/webhooks - Subscribe to webhook events
GET    /api/v1/webhooks/{webhookId} - Get webhook details
PUT    /api/v1/webhooks/{webhookId} - Update webhook subscription
DELETE /api/v1/webhooks/{webhookId} - Unsubscribe from webhook
POST   /api/v1/webhooks/{webhookId}/test - Send test webhook
GET    /api/v1/webhooks/{webhookId}/logs - Get webhook delivery logs
```

#### Admin Endpoints

```
GET    /api/v1/admin/users - List all users
GET    /api/v1/admin/users/{userId} - Get user details
PUT    /api/v1/admin/users/{userId} - Update user
DELETE /api/v1/admin/users/{userId} - Delete user account
GET    /api/v1/admin/apps/pending - List pending marketplace apps
POST   /api/v1/admin/apps/{appId}/approve - Approve marketplace app
POST   /api/v1/admin/apps/{appId}/reject - Reject marketplace app
GET    /api/v1/admin/analytics - Get platform-wide analytics
```

### 2.2 API v2 Enhancements

v2 API introduces breaking improvements:

```
GET  /api/v2/developers/{devId}/profile - New unified profile endpoint
POST /api/v2/integrations/batch - Batch operation support
GET  /api/v2/marketplace/search - Advanced search with filters
GET  /api/v2/analytics/realtime - Real-time analytics streaming
POST /api/v2/webhooks/batch-subscribe - Subscribe to multiple events
GET  /api/v2/billing/usage-forecast - AI-powered usage forecasting
```

### 2.3 Request/Response Formats

#### Standard Request Structure

```json
{
  "id": "req_1234567890",
  "timestamp": "2025-11-19T10:30:00Z",
  "version": "v1",
  "metadata": {
    "user_agent": "Clearway-SDK/1.0.0",
    "client_id": "app_abc123",
    "request_id": "trace_xyz789"
  }
}
```

#### Standard Response Structure

```json
{
  "id": "req_1234567890",
  "status": "success",
  "code": 200,
  "data": {
    // Response payload
  },
  "meta": {
    "timestamp": "2025-11-19T10:30:00Z",
    "rate_limit": {
      "limit": 1000,
      "remaining": 999,
      "reset": 1637329200
    },
    "trace_id": "trace_xyz789"
  }
}
```

#### Error Response Structure

```json
{
  "status": "error",
  "code": 400,
  "error": {
    "type": "validation_error",
    "message": "Invalid API key format",
    "details": {
      "field": "api_key",
      "issue": "format_invalid"
    }
  },
  "meta": {
    "trace_id": "trace_xyz789",
    "timestamp": "2025-11-19T10:30:00Z"
  }
}
```

---

## 3. GraphQL API Specification

### 3.1 GraphQL Schema

```graphql
# Core Types
type User {
  id: ID!
  email: String!
  name: String!
  avatar: String
  joinDate: DateTime!
  subscription: Subscription!
  apiKeys: [APIKey!]!
  apps: [App!]!
  webhooks: [Webhook!]!
}

type APIKey {
  id: ID!
  name: String!
  key: String! (masked in lists)
  secret: String! (never exposed)
  createdAt: DateTime!
  lastUsed: DateTime
  rateLimit: RateLimit!
  scopes: [String!]!
  active: Boolean!
}

type App {
  id: ID!
  name: String!
  description: String!
  category: String!
  version: String!
  icon: String
  owner: User!
  status: AppStatus! # DRAFT, PENDING, APPROVED, ACTIVE, DEPRECATED
  publishedAt: DateTime
  rating: Float
  reviews: [AppReview!]!
  oauthConfig: OAuthConfig
  webhooks: [WebhookEvent!]!
  pricing: AppPricing
  installCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type AppReview {
  id: ID!
  app: App!
  reviewer: User!
  rating: Int! # 1-5
  comment: String
  helpful: Int
  createdAt: DateTime!
}

type OAuthConfig {
  clientId: String!
  clientSecret: String! (never exposed)
  redirectUris: [String!]!
  scopes: [String!]!
  authorizationUrl: String!
  tokenUrl: String!
}

type Subscription {
  id: ID!
  tier: SubscriptionTier! # STARTER, PRO, ENTERPRISE
  status: SubscriptionStatus! # ACTIVE, CANCELED, SUSPENDED
  currentPeriod: Period!
  nextBillingDate: DateTime
  canceledAt: DateTime
  apiQuota: RateLimit!
  features: [String!]!
  price: Float!
  billingCycle: String! # MONTHLY, ANNUAL
}

type RateLimit {
  requestsPerSecond: Int!
  requestsPerDay: Int!
  requestsPerMonth: Int!
  concurrent: Int
}

type Webhook {
  id: ID!
  url: String!
  events: [String!]!
  active: Boolean!
  retryPolicy: RetryPolicy!
  headers: [Header!]
  deliveryLogs: [DeliveryLog!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type RetryPolicy {
  maxRetries: Int!
  backoffMultiplier: Float!
  initialDelayMs: Int!
}

type DeliveryLog {
  id: ID!
  webhook: Webhook!
  event: String!
  payload: JSON!
  statusCode: Int
  response: String
  attempt: Int!
  deliveredAt: DateTime
  nextRetryAt: DateTime
}

type Usage {
  userId: ID!
  period: DateTime!
  requestCount: Int!
  errorCount: Int!
  totalLatencyMs: Int!
  byEndpoint: [EndpointUsage!]!
  estimatedCost: Float!
}

type EndpointUsage {
  endpoint: String!
  method: String!
  callCount: Int!
  errorCount: Int!
  avgLatencyMs: Float!
}

# Queries
type Query {
  # User queries
  me: User
  user(id: ID!): User

  # API Key queries
  apiKeys: [APIKey!]!
  apiKey(id: ID!): APIKey

  # App queries
  apps(
    limit: Int = 20
    offset: Int = 0
    category: String
    status: AppStatus
    search: String
    sort: String = "publishedAt"
  ): AppConnection!
  app(id: ID!): App
  featuredApps: [App!]!

  # Analytics queries
  usage(period: DateTime!): Usage
  usageHistory(start: DateTime!, end: DateTime!): [Usage!]!
  analyticsMetrics(period: DateTime!): AnalyticsMetrics!

  # Subscription queries
  subscription: Subscription
  availablePlans: [Plan!]!

  # Webhook queries
  webhooks: [Webhook!]!
  webhook(id: ID!): Webhook
}

# Mutations
type Mutation {
  # Authentication
  register(email: String!, password: String!, name: String!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  logout: Boolean!
  refreshToken: AuthPayload!

  # API Key management
  createAPIKey(name: String!, scopes: [String!]!): APIKey!
  updateAPIKey(id: ID!, name: String, scopes: [String!]): APIKey!
  deleteAPIKey(id: ID!): Boolean!
  regenerateAPIKey(id: ID!): APIKey!

  # App management
  createApp(input: CreateAppInput!): App!
  updateApp(id: ID!, input: UpdateAppInput!): App!
  deleteApp(id: ID!): Boolean!
  publishApp(id: ID!): App!

  # App reviews
  submitAppReview(appId: ID!, rating: Int!, comment: String): AppReview!
  deleteAppReview(id: ID!): Boolean!

  # Subscription management
  upgradePlan(planId: ID!): Subscription!
  downgradePlan(planId: ID!): Subscription!
  cancelSubscription: Boolean!

  # Webhook management
  createWebhook(input: CreateWebhookInput!): Webhook!
  updateWebhook(id: ID!, input: UpdateWebhookInput!): Webhook!
  deleteWebhook(id: ID!): Boolean!
  testWebhook(id: ID!): DeliveryLog!
}

# Subscriptions (real-time)
type Subscription {
  webhookDelivered(webhookId: ID!): DeliveryLog!
  apiKeyQuotaExceeded(keyId: ID!): QuotaAlert!
  usageThresholdReached(threshold: Int!): UsageAlert!
}
```

### 3.2 GraphQL Queries Examples

```graphql
# Get current user with API keys and apps
query GetUserProfile {
  me {
    id
    email
    name
    subscription {
      tier
      features
      apiQuota {
        requestsPerMonth
        requestsPerSecond
      }
    }
    apiKeys {
      id
      name
      lastUsed
      scopes
    }
    apps {
      id
      name
      rating
      installCount
    }
  }
}

# Search marketplace apps with advanced filters
query SearchMarketplaceApps($search: String, $category: String, $limit: Int) {
  apps(search: $search, category: $category, limit: $limit) {
    edges {
      node {
        id
        name
        description
        rating
        reviews {
          rating
          comment
        }
        owner {
          name
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Get real-time usage analytics
query GetRealTimeUsage($period: DateTime!) {
  usage(period: $period) {
    requestCount
    errorCount
    estimatedCost
    byEndpoint {
      endpoint
      callCount
      avgLatencyMs
    }
  }
}
```

---

## 4. API Versioning Strategy

### 4.1 Version Management

| Version | Status | Endpoints | GraphQL | Support Until |
|---------|--------|-----------|---------|---------------|
| v1      | Active | Yes       | Yes     | 2026-12-31    |
| v2      | Beta   | Yes       | Yes     | TBD           |

### 4.2 Versioning Headers

```
# Request using API version header
GET /api/apps
X-API-Version: 2025-11-01

# Or version in URL (recommended)
GET /api/v2/apps
```

### 4.3 Deprecation Policy

1. **Announcement Phase** (90 days): Public notice of deprecation
2. **Grace Period** (180 days): Old version continues to work
3. **Migration Support**: Detailed migration guides provided
4. **Final Sunset**: Old version disabled

### 4.4 Version Migration Guide

```markdown
## Migrating from v1 to v2

### Breaking Changes
- Response envelope changed (removed legacy `meta` wrapper)
- Pagination now uses cursor-based instead of offset
- Field names: `_id` → `id` across all resources

### New Features in v2
- GraphQL support with real-time subscriptions
- Batch operation endpoints
- Advanced filtering and search
- Real-time analytics streaming
- Improved error messages with actionable suggestions

### Migration Timeline
- v1 deprecated: 2025-12-01
- v1 sunset: 2026-12-01
```

---

## 5. Developer Portal Specification

### 5.1 Portal Features

#### Dashboard
- **API Activity**: Real-time graphs of API calls, errors, latency
- **Quick Actions**: Generate API keys, manage webhooks, view docs
- **Notifications**: Quota alerts, billing updates, deprecation notices
- **Account Health**: Uptime status, last API call, quota usage percentage

#### API Key Management
- **Key Generation**: Secure generation with auto-save options
- **Key Rotation**: Schedule automated key rotation
- **Scope Management**: Granular permission control per key
- **Usage Tracking**: Per-key analytics and quota limits

#### App Management Console
- **Version Control**: Track app versions, rollback capability
- **Status Monitoring**: Real-time status of deployed apps
- **Configuration**: Environment variables, feature flags, settings
- **Integrations**: OAuth setup, webhook configuration, third-party services

#### Billing & Usage
- **Usage Analytics**: Detailed breakdown by endpoint, time period, user
- **Cost Breakdown**: Itemized billing with cost predictions
- **Invoice Management**: Download invoices, view payment history
- **Usage Alerts**: Automated notifications at usage thresholds

#### Documentation Hub
- **API Reference**: Auto-generated from OpenAPI spec
- **Tutorials**: Getting started guides, integration examples
- **Code Samples**: Pre-built examples in multiple languages
- **FAQ & Support**: Knowledge base with search functionality

### 5.2 Portal Authentication

```
┌─────────────────────────────────┐
│   Developer Portal Login        │
├─────────────────────────────────┤
│                                 │
│  Email Login + 2FA              │
│  GitHub/Google OAuth            │
│  SSO (Enterprise)               │
│                                 │
└─────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│   Session Management            │
├─────────────────────────────────┤
│                                 │
│  JWT tokens (access + refresh)  │
│  CSRF protection                │
│  Rate limiting per session      │
│                                 │
└─────────────────────────────────┘
```

### 5.3 Portal Routes

```
/dashboard                          - Main dashboard
/dashboard/api-keys                 - Manage API keys
/dashboard/apps                     - Manage applications
/dashboard/billing                  - Billing information
/dashboard/usage                    - Usage analytics
/dashboard/webhooks                 - Webhook management
/dashboard/settings                 - Account settings
/dashboard/security                 - Security settings

/marketplace                        - App marketplace browse
/marketplace/apps/{appId}          - App details page
/marketplace/my-apps               - Your published apps
/marketplace/publish               - Publish new app

/docs                              - Documentation home
/docs/getting-started              - Getting started guide
/docs/api/rest                     - REST API reference
/docs/api/graphql                  - GraphQL reference
/docs/webhooks                     - Webhook guide
/docs/sdks                         - SDK documentation
/docs/examples                     - Code examples

/support                           - Support center
/support/tickets                   - Support tickets
/support/contact                   - Contact form
```

---

## 6. API Playground Specification

### 6.1 Interactive Testing Environment

The API Playground provides an interactive environment for testing API endpoints.

#### Features
- **Request Builder**: Visual form to construct HTTP requests
- **Code Generation**: Auto-generate code snippets (cURL, Python, JavaScript)
- **Response Viewer**: Formatted response with syntax highlighting
- **Authentication**: Integrated API key management
- **History**: Save and replay previous requests
- **Collections**: Organize requests into collections
- **Environment Variables**: Store and reuse variables in requests
- **Pre-request Scripts**: Run code before requests
- **Post-response Scripts**: Transform and validate responses
- **Mock Responses**: Test with mock data

#### UI Components

```
┌────────────────────────────────────────────────────────┐
│           API Playground Interface                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Method │ URL Dropdown │ [GET /api/v1/apps    ]  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Headers │ Body │ Auth │ Scripts │ Tests        │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ Authorization: Bearer {api_key}                │  │
│  │ Content-Type: application/json                 │  │
│  │ X-API-Version: 2025-11-01                      │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [Send] [Save] [Code Gen] [Clear]               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ RESPONSE (200 OK)                              │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ {                                              │  │
│  │   "status": "success",                         │  │
│  │   "data": [                                    │  │
│  │     {                                          │  │
│  │       "id": "app_123",                        │  │
│  │       "name": "Sample App"                    │  │
│  │     }                                          │  │
│  │   ]                                            │  │
│  │ }                                              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

#### Code Generation Examples

```bash
# cURL
curl -X GET "https://api.clearway.io/api/v1/apps" \
  -H "Authorization: Bearer key_abc123" \
  -H "X-API-Version: 2025-11-01"

# Python
import requests
response = requests.get(
    "https://api.clearway.io/api/v1/apps",
    headers={"Authorization": "Bearer key_abc123"}
)

# JavaScript
const response = await fetch("https://api.clearway.io/api/v1/apps", {
  headers: { "Authorization": "Bearer key_abc123" }
});
```

### 6.2 Saved Collections

Users can save and organize API requests:

```json
{
  "id": "col_abc123",
  "name": "App Management",
  "description": "CRUD operations for apps",
  "requests": [
    {
      "id": "req_1",
      "name": "List Apps",
      "method": "GET",
      "url": "/api/v1/apps"
    },
    {
      "id": "req_2",
      "name": "Create App",
      "method": "POST",
      "url": "/api/v1/apps",
      "body": {}
    }
  ]
}
```

---

## 7. Third-Party App Marketplace

### 7.1 Marketplace Features

#### App Submission & Approval
1. **Submission**: Developers submit app with metadata and OAuth config
2. **Review**: Clearway team reviews for quality and security
3. **Testing**: Automated and manual testing in sandbox environment
4. **Approval**: App published to marketplace
5. **Monitoring**: Ongoing performance and compliance monitoring

#### App Listing Display

```
┌──────────────────────────────────────────┐
│     App Name                   ⭐ 4.8/5  │
├──────────────────────────────────────────┤
│                                           │
│  [App Icon]  App Description             │
│              Category: Productivity       │
│              Version: 2.1.0               │
│              Last Updated: 2 weeks ago    │
│                                           │
│  Developer: John Doe                     │
│  Installs: 1,250+                        │
│                                           │
│  Features:                               │
│  • Feature 1                             │
│  • Feature 2                             │
│  • Feature 3                             │
│                                           │
│  [Install] [View Reviews] [Learn More]   │
│                                           │
└──────────────────────────────────────────┘
```

#### Marketplace Categories
- Integrations
- Analytics
- Automation
- Communication
- Storage
- Security
- Developer Tools
- Workflow Automation

#### App Discovery
- **Search**: Full-text search with autocomplete
- **Filters**: Category, rating, price, installs
- **Sorting**: Popular, newest, trending, highest rated
- **Featured**: Curated apps highlighted on homepage
- **Collections**: Curated collections by use case

### 7.2 App Listing Schema

```json
{
  "id": "app_abc123",
  "name": "Slack Integration",
  "slug": "slack-integration",
  "description": "Send notifications and messages to Slack",
  "longDescription": "Comprehensive Slack integration...",
  "icon": "https://cdn.clearway.io/apps/slack.png",
  "category": "Communication",
  "owner": {
    "id": "dev_123",
    "name": "Slack Developer",
    "verified": true
  },
  "version": "2.1.0",
  "status": "ACTIVE",
  "rating": 4.8,
  "reviewCount": 124,
  "installCount": 1250,
  "priceModel": "FREE",
  "features": [
    "Post messages",
    "Upload files",
    "User mentions"
  ],
  "permissions": [
    "messages.write",
    "files.upload"
  ],
  "documentation": "https://docs.clearway.io/slack",
  "supportUrl": "https://support.slack.io",
  "publishedAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2025-10-01T14:30:00Z"
}
```

### 7.3 Marketplace Analytics

Developers can track app performance:

```
App: Slack Integration
Last 30 days:

Installs: +42
Uninstalls: -8
Active Users: 1,203
Total API Calls: 45,320
Avg Rating: 4.8 (9 new reviews)
Revenue: $1,245.63

Top Features Used:
- Post messages: 25,100 calls
- Upload files: 12,200 calls
- User mentions: 8,020 calls
```

---

## 8. OAuth 2.0 Integration

### 8.1 OAuth 2.0 Authorization Code Flow

```
┌─────────────┐                                    ┌─────────────┐
│   End User  │                                    │  Third-Party│
│   Browser   │                                    │    App      │
└──────┬──────┘                                    └──────┬──────┘
       │                                                   │
       │  1. Clicks "Connect to Clearway"                │
       │                                                   │
       │<──────────────────────────────────────────────────│
       │                                                   │
       │  2. Redirected to Clearway auth                 │
       │                                                   │
       ├─────────────────────────────────────────────────>│
       │       /oauth/authorize?client_id=...            │
       │                                                   │
       │  [Clearway Login & Consent Screen]              │
       │                                                   │
       │  3. User approves permissions                   │
       │                                                   │
       │  4. Redirected back with code                   │
       │                                                   │
       │<──────────────────────────────────────────────────│
       │     redirect_uri?code=auth_code&state=xyz       │
       │                                                   │
       │                          5. Exchange code       │
       │                             for token           │
       │                                   (Server-to-  │
       │                                    Server)      │
       │                                    │            │
       │                             POST /oauth/token   │
       │                                    │            │
       │                          6. Token returned      │
       │                                    │            │
       │  7. User now connected              │            │
       │     to third-party app             │            │
       │
```

### 8.2 OAuth Configuration for Apps

When registering a third-party app in the marketplace:

```json
{
  "app_id": "app_abc123",
  "oauth_config": {
    "client_id": "client_abc123",
    "client_secret": "secret_xyz789",
    "scopes": [
      "read:apps",
      "write:apps",
      "read:user",
      "read:billing"
    ],
    "redirect_uris": [
      "https://myapp.com/oauth/callback",
      "https://staging.myapp.com/oauth/callback"
    ],
    "token_endpoint_auth_method": "client_secret_basic",
    "access_token_lifetime": 3600,
    "refresh_token_lifetime": 2592000,
    "authorize_url": "https://api.clearway.io/oauth/authorize",
    "token_url": "https://api.clearway.io/oauth/token",
    "revoke_url": "https://api.clearway.io/oauth/revoke"
  }
}
```

### 8.3 OAuth Scopes

| Scope | Resource | Permission |
|-------|----------|-----------|
| `read:apps` | Apps | Read app information |
| `write:apps` | Apps | Create and modify apps |
| `delete:apps` | Apps | Delete apps |
| `read:user` | User | Read user profile |
| `write:user` | User | Update user profile |
| `read:billing` | Billing | View billing information |
| `read:analytics` | Analytics | View usage analytics |
| `write:webhooks` | Webhooks | Manage webhook subscriptions |
| `read:marketplace` | Marketplace | Browse marketplace |
| `write:marketplace` | Marketplace | Publish apps to marketplace |

### 8.4 Token Response Example

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_abc123xyz789",
  "scope": "read:apps write:apps read:user",
  "state": "xyz789"
}
```

### 8.5 Token Refresh Flow

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=refresh_abc123xyz789&
client_id=client_abc123&
client_secret=secret_xyz789

Response:
{
  "access_token": "new_access_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:apps write:apps read:user"
}
```

---

## 9. Webhook Subscriptions

### 9.1 Webhook Events

Developers can subscribe to real-time events:

```
app.created       - When an app is created
app.updated       - When an app is modified
app.deleted       - When an app is deleted
app.published     - When an app is published
app.install       - When an app is installed by a user
app.uninstall     - When an app is uninstalled
user.signup       - When a new user signs up
user.deleted      - When a user account is deleted
key.created       - When an API key is created
key.rotated       - When an API key is rotated
key.deleted       - When an API key is deleted
quota.exceeded    - When API quota is exceeded
billing.payment_failed - When a payment fails
billing.upgraded   - When user upgrades plan
webhook.failed    - When webhook delivery fails
```

### 9.2 Webhook Subscription Management

#### Creating a Webhook Subscription

```bash
POST /api/v1/webhooks

{
  "url": "https://myapp.com/clearway-webhook",
  "events": ["app.installed", "app.uninstalled"],
  "active": true,
  "retryPolicy": {
    "maxRetries": 5,
    "backoffMultiplier": 2,
    "initialDelayMs": 1000
  },
  "headers": {
    "X-Custom-Header": "value"
  }
}

Response:
{
  "id": "webhook_abc123",
  "url": "https://myapp.com/clearway-webhook",
  "events": ["app.installed", "app.uninstalled"],
  "active": true,
  "secret": "whsec_abc123xyz789",
  "createdAt": "2025-11-19T10:00:00Z"
}
```

#### Webhook Request Format

```json
{
  "id": "evt_abc123xyz789",
  "type": "app.installed",
  "timestamp": "2025-11-19T10:30:00Z",
  "data": {
    "app_id": "app_slack123",
    "app_name": "Slack Integration",
    "user_id": "user_xyz",
    "installed_at": "2025-11-19T10:30:00Z"
  },
  "attempt": 1,
  "webhook_id": "webhook_abc123"
}
```

#### Webhook Signature Verification

All webhooks are signed with HMAC-SHA256:

```bash
# Compute signature
signature = HMAC-SHA256(
  key=webhook_secret,
  message=payload_json
)

# Compare with header
X-Clearway-Signature: sha256=signature_value
```

Example verification in Node.js:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${computed}`)
  );
}
```

### 9.3 Webhook Delivery & Retry Logic

```
Attempt 1: Immediate
         ↓ (fails)
Attempt 2: After 1 second
         ↓ (fails)
Attempt 3: After 2 seconds (2^1)
         ↓ (fails)
Attempt 4: After 4 seconds (2^2)
         ↓ (fails)
Attempt 5: After 8 seconds (2^3)
         ↓ (fails)
FAILED - Manual review required
```

### 9.4 Webhook Delivery Logs

```
GET /api/v1/webhooks/{webhookId}/logs

{
  "logs": [
    {
      "id": "log_abc123",
      "event_id": "evt_xyz",
      "event_type": "app.installed",
      "attempt": 1,
      "status_code": 200,
      "response": "OK",
      "delivered_at": "2025-11-19T10:30:00Z"
    },
    {
      "id": "log_abc124",
      "event_id": "evt_abc",
      "event_type": "app.uninstalled",
      "attempt": 1,
      "status_code": 500,
      "response": "Internal Server Error",
      "next_retry_at": "2025-11-19T10:30:01Z"
    }
  ]
}
```

---

## 10. Rate Limiting & Usage Analytics

### 10.1 Rate Limiting Strategy

#### Three-Tier Rate Limiting

```
Tier 1: Per-second limit
        ├─ Prevents single-second spikes
        └─ Default: 100 requests/second

Tier 2: Per-day limit
        ├─ Prevents daily quota abuse
        └─ Default: 100,000 requests/day

Tier 3: Per-month limit
        ├─ Hard quota for billing
        └─ Depends on subscription tier
```

#### Subscription Tier Limits

| Tier | Req/Sec | Req/Day | Req/Month | Concurrent |
|------|---------|---------|-----------|-----------|
| Starter | 10 | 10,000 | 100,000 | 5 |
| Pro | 50 | 100,000 | 10,000,000 | 25 |
| Enterprise | 1,000 | 10,000,000 | Unlimited | 1,000 |

### 10.2 Rate Limit Headers

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1637329200
X-RateLimit-Period: 3600
X-RateLimit-Retry-After: 60
```

### 10.3 Rate Limit Response (429 Too Many Requests)

```json
{
  "status": "error",
  "code": 429,
  "error": {
    "type": "rate_limit_exceeded",
    "message": "API rate limit exceeded",
    "details": {
      "limit": 1000,
      "period": "3600s",
      "retry_after": 60
    }
  }
}
```

### 10.4 Usage Analytics

#### Endpoint-Level Analytics

```json
{
  "period": "2025-11-19",
  "endpoints": [
    {
      "method": "GET",
      "path": "/api/v1/apps",
      "calls": 5230,
      "errors": 12,
      "success_rate": 99.77,
      "avg_latency_ms": 45,
      "p95_latency_ms": 120,
      "p99_latency_ms": 250,
      "bandwidth_mb": 125
    },
    {
      "method": "POST",
      "path": "/api/v1/apps",
      "calls": 340,
      "errors": 2,
      "success_rate": 99.41,
      "avg_latency_ms": 230,
      "p95_latency_ms": 450,
      "p99_latency_ms": 750,
      "bandwidth_mb": 85
    }
  ]
}
```

#### User-Level Analytics

```json
{
  "period": "2025-11-19",
  "user_id": "user_abc123",
  "total_requests": 5230,
  "total_errors": 12,
  "error_rate": 0.23,
  "success_rate": 99.77,
  "bandwidth_usage_mb": 210,
  "estimated_cost": 2.50,
  "top_endpoints": [
    "/api/v1/apps",
    "/api/v1/keys",
    "/api/v1/analytics/usage"
  ],
  "error_breakdown": {
    "404": 8,
    "500": 2,
    "429": 2
  }
}
```

#### Real-Time Analytics Dashboard

```
┌──────────────────────────────────────────────┐
│       API Analytics Dashboard                │
├──────────────────────────────────────────────┤
│                                              │
│ Requests/sec: ▁▂▂▃▃▃▂▂▁▂ [125 requests/s]  │
│ Errors/min:   ▁▁▁▁▂▁▁▁▁▁ [2 errors/min]    │
│ Avg Latency:  ▂▂▂▂▂▃▃▃▂▂ [45ms]            │
│                                              │
│ Top Endpoints:                              │
│ 1. GET /api/v1/apps       [4,250 calls]    │
│ 2. GET /api/v1/keys       [850 calls]      │
│ 3. POST /api/v1/webhooks  [130 calls]      │
│                                              │
│ Error Distribution:                         │
│ ✓ Success: 99.8%                           │
│ ✗ 4xx: 0.1%                                │
│ ✗ 5xx: 0.1%                                │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 11. API SDKs

### 11.1 Node.js SDK

#### Installation

```bash
npm install @clearway/sdk
# or
yarn add @clearway/sdk
```

#### Basic Usage

```javascript
const { ClearwayClient } = require('@clearway/sdk');

const client = new ClearwayClient({
  apiKey: 'key_abc123',
  apiSecret: 'secret_xyz789'
});

// Create an app
const app = await client.apps.create({
  name: 'My Integration',
  description: 'Integration with my service',
  category: 'Integrations'
});

// Get usage analytics
const usage = await client.analytics.getUsage({
  period: '2025-11-19'
});

// Subscribe to webhooks
const webhook = await client.webhooks.create({
  url: 'https://myapp.com/webhook',
  events: ['app.installed', 'app.uninstalled']
});
```

#### Advanced Features

```javascript
// Batch operations
const results = await client.batch([
  { method: 'GET', url: '/api/v1/apps/app1' },
  { method: 'GET', url: '/api/v1/apps/app2' },
  { method: 'GET', url: '/api/v1/apps/app3' }
]);

// Pagination with cursor
let page = await client.apps.list({ limit: 10 });
while (page.hasNextPage) {
  page = await page.nextPage();
}

// Event streaming
client.on('app.installed', (event) => {
  console.log(`App installed: ${event.data.app_name}`);
});
```

### 11.2 Python SDK

#### Installation

```bash
pip install clearway-sdk
```

#### Basic Usage

```python
from clearway import ClearwayClient

client = ClearwayClient(
    api_key='key_abc123',
    api_secret='secret_xyz789'
)

# Create an app
app = client.apps.create(
    name='My Integration',
    description='Integration with my service',
    category='Integrations'
)

# Get usage
usage = client.analytics.get_usage(period='2025-11-19')

# Async requests
import asyncio

async def fetch_apps():
    apps = await client.apps.list_async()
    return apps

asyncio.run(fetch_apps())
```

#### Type Hints

```python
from clearway.types import App, Usage
from typing import List

def process_apps(apps: List[App]) -> None:
    for app in apps:
        print(app.name)

usage: Usage = client.analytics.get_usage()
```

### 11.3 Ruby SDK

#### Installation

```ruby
gem 'clearway-sdk'
```

```bash
bundle install
```

#### Basic Usage

```ruby
require 'clearway'

client = Clearway::Client.new(
  api_key: 'key_abc123',
  api_secret: 'secret_xyz789'
)

# Create an app
app = client.apps.create(
  name: 'My Integration',
  description: 'Integration with my service',
  category: 'Integrations'
)

# Get usage
usage = client.analytics.usage(period: '2025-11-19')

# Iterate apps
client.apps.list(per_page: 25).each do |app|
  puts app.name
end
```

### 11.4 Go SDK

#### Installation

```bash
go get github.com/clearway/sdk-go
```

#### Basic Usage

```go
package main

import (
  "github.com/clearway/sdk-go/v1"
)

func main() {
  client := clearway.NewClient(
    clearway.WithAPIKey("key_abc123"),
    clearway.WithAPISecret("secret_xyz789"),
  )

  // Create an app
  app, err := client.Apps.Create(ctx, &clearway.CreateAppInput{
    Name:        "My Integration",
    Description: "Integration with my service",
    Category:    "Integrations",
  })

  // Get usage
  usage, err := client.Analytics.GetUsage(ctx, &clearway.UsageFilter{
    Period: "2025-11-19",
  })
}
```

### 11.5 SDK Features Comparison

| Feature | Node.js | Python | Ruby | Go |
|---------|---------|--------|------|-----|
| REST API | ✓ | ✓ | ✓ | ✓ |
| GraphQL | ✓ | ✓ | ✓ | ✓ |
| Webhooks | ✓ | ✓ | ✓ | ✓ |
| Batch Ops | ✓ | ✓ | ✓ | ✓ |
| Pagination | ✓ | ✓ | ✓ | ✓ |
| Type Hints | ✓ | ✓ | ✓ | ✓ |
| Async | ✓ | ✓ | ✓ | ✓ |
| OAuth | ✓ | ✓ | ✓ | ✓ |

---

## 12. Database Schema

### 12.1 API Keys & Credentials

```sql
CREATE TABLE api_keys (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  secret_hash VARCHAR(255) NOT NULL,
  scopes JSON NOT NULL,
  rate_limit_id VARCHAR(32),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rate_limit_id) REFERENCES rate_limits(id),
  INDEX idx_user_id (user_id),
  INDEX idx_key_prefix (key_prefix),
  INDEX idx_active (is_active)
);

CREATE TABLE oauth_apps (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  app_id VARCHAR(32) NOT NULL,
  client_id VARCHAR(255) NOT NULL UNIQUE,
  client_secret_hash VARCHAR(255) NOT NULL,
  redirect_uris JSON NOT NULL,
  scopes JSON NOT NULL,
  token_endpoint_auth_method VARCHAR(50),
  access_token_lifetime INT DEFAULT 3600,
  refresh_token_lifetime INT DEFAULT 2592000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (app_id) REFERENCES apps(id),
  INDEX idx_client_id (client_id),
  INDEX idx_user_id (user_id)
);

CREATE TABLE oauth_tokens (
  id VARCHAR(32) PRIMARY KEY,
  oauth_app_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  access_token_hash VARCHAR(255) NOT NULL UNIQUE,
  refresh_token_hash VARCHAR(255),
  scopes JSON NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  FOREIGN KEY (oauth_app_id) REFERENCES oauth_apps(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_access_token_hash (access_token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);
```

### 12.2 Apps & Marketplace

```sql
CREATE TABLE apps (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  long_description TEXT,
  category VARCHAR(100),
  icon_url VARCHAR(500),
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'DEPRECATED'),
  version VARCHAR(50) DEFAULT '1.0.0',
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_category (category),
  FULLTEXT INDEX idx_search (name, description)
);

CREATE TABLE app_reviews (
  id VARCHAR(32) PRIMARY KEY,
  app_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_review (app_id, user_id),
  INDEX idx_app_id (app_id),
  INDEX idx_rating (rating)
);

CREATE TABLE app_installations (
  id VARCHAR(32) PRIMARY KEY,
  app_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  oauth_token_id VARCHAR(32),
  configuration JSON,
  status ENUM('ACTIVE', 'PAUSED', 'DISABLED'),
  installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uninstalled_at TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES apps(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (oauth_token_id) REFERENCES oauth_tokens(id),
  UNIQUE KEY unique_install (app_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

CREATE TABLE app_pricing (
  id VARCHAR(32) PRIMARY KEY,
  app_id VARCHAR(32) NOT NULL,
  price_model ENUM('FREE', 'FIXED', 'USAGE_BASED', 'FREEMIUM'),
  base_price DECIMAL(10, 2),
  per_unit_price DECIMAL(10, 4),
  free_tier_limit INT,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
  UNIQUE KEY unique_pricing (app_id)
);
```

### 12.3 Webhooks

```sql
CREATE TABLE webhooks (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events JSON NOT NULL,
  secret_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_retries INT DEFAULT 5,
  backoff_multiplier FLOAT DEFAULT 2.0,
  initial_delay_ms INT DEFAULT 1000,
  headers JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_active (is_active)
);

CREATE TABLE webhook_events (
  id VARCHAR(32) PRIMARY KEY,
  webhook_id VARCHAR(32) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  attempt INT DEFAULT 1,
  status_code INT,
  response_text TEXT,
  next_retry_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
  INDEX idx_webhook_id (webhook_id),
  INDEX idx_event_type (event_type),
  INDEX idx_delivered_at (delivered_at)
);

CREATE TABLE webhook_delivery_logs (
  id VARCHAR(32) PRIMARY KEY,
  webhook_id VARCHAR(32) NOT NULL,
  webhook_event_id VARCHAR(32) NOT NULL,
  attempt_number INT NOT NULL,
  status_code INT,
  response_time_ms INT,
  headers_sent JSON,
  response_body TEXT,
  error_message TEXT,
  delivered_at TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
  FOREIGN KEY (webhook_event_id) REFERENCES webhook_events(id),
  INDEX idx_webhook_id (webhook_id),
  INDEX idx_delivered_at (delivered_at)
);
```

### 12.4 Rate Limiting & Usage Tracking

```sql
CREATE TABLE rate_limits (
  id VARCHAR(32) PRIMARY KEY,
  api_key_id VARCHAR(32),
  user_id VARCHAR(32),
  subscription_tier VARCHAR(50),
  requests_per_second INT NOT NULL,
  requests_per_day INT NOT NULL,
  requests_per_month INT NOT NULL,
  concurrent_requests INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id)
);

CREATE TABLE api_usage (
  id VARCHAR(32) PRIMARY KEY,
  api_key_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  request_time_ms INT,
  request_size_bytes INT,
  response_size_bytes INT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_endpoint (endpoint)
);

CREATE TABLE usage_daily_summary (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  date DATE NOT NULL,
  request_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  total_latency_ms INT DEFAULT 0,
  bandwidth_bytes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_summary (user_id, date),
  INDEX idx_user_id (user_id),
  INDEX idx_date (date)
);
```

### 12.5 Billing & Subscriptions

```sql
CREATE TABLE subscription_plans (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tier ENUM('STARTER', 'PRO', 'ENTERPRISE'),
  monthly_price DECIMAL(10, 2),
  annual_price DECIMAL(10, 2),
  requests_per_month INT,
  concurrent_requests INT,
  features JSON,
  created_at TIMESTAMP
);

CREATE TABLE user_subscriptions (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  plan_id VARCHAR(32) NOT NULL,
  status ENUM('ACTIVE', 'CANCELED', 'SUSPENDED', 'EXPIRED'),
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  canceled_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

CREATE TABLE billing_invoices (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  subscription_id VARCHAR(32) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('DRAFT', 'SENT', 'PAID', 'FAILED', 'REFUNDED'),
  period_start DATE,
  period_end DATE,
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

---

## 13. Developer Documentation Site

### 13.1 Documentation Structure

```
/docs
├── index.md (Home & Introduction)
├── getting-started/
│   ├── authentication.md
│   ├── your-first-request.md
│   ├── rate-limits.md
│   └── best-practices.md
├── api/
│   ├── rest/
│   │   ├── overview.md
│   │   ├── apps.md
│   │   ├── keys.md
│   │   ├── analytics.md
│   │   ├── webhooks.md
│   │   └── errors.md
│   ├── graphql/
│   │   ├── overview.md
│   │   ├── queries.md
│   │   ├── mutations.md
│   │   ├── subscriptions.md
│   │   └── examples.md
│   └── versioning.md
├── marketplace/
│   ├── overview.md
│   ├── publishing.md
│   ├── oauth-guide.md
│   ├── listing-best-practices.md
│   └── monetization.md
├── sdks/
│   ├── nodejs.md
│   ├── python.md
│   ├── ruby.md
│   ├── go.md
│   └── community-sdks.md
├── webhooks/
│   ├── overview.md
│   ├── events.md
│   ├── signatures.md
│   ├── delivery-guarantees.md
│   └── examples.md
├── examples/
│   ├── nodejs-app.md
│   ├── python-automation.md
│   ├── ruby-integration.md
│   └── go-service.md
├── support/
│   ├── faq.md
│   ├── troubleshooting.md
│   ├── contact.md
│   └── status.md
└── CHANGELOG.md
```

### 13.2 Documentation Features

- **Search**: Full-text search across all documentation
- **Code Examples**: Copy-paste ready examples in multiple languages
- **Versioning**: Separate docs for API v1 and v2
- **Changelog**: Track API updates and changes
- **Visual Guides**: Diagrams and flow charts
- **Interactive Tutorials**: Guided walkthroughs with API Playground
- **OpenAPI/Swagger**: Auto-generated from API spec
- **PDF Export**: Download docs as PDF
- **GitHub Integration**: Link to example repositories

---

## 14. API Monetization

### 14.1 Subscription Tiers

#### Starter Plan - Free
- **Price**: $0/month
- **API Requests**: 100,000/month
- **Requests/Second**: 10
- **Concurrent**: 5
- **Apps**: 3 max
- **Support**: Community forum
- **Features**:
  - Basic API access
  - Simple analytics
  - Email support (24h response)

#### Pro Plan - $99/month
- **Price**: $99/month ($1,188/year, save 10%)
- **API Requests**: 10,000,000/month
- **Requests/Second**: 50
- **Concurrent**: 25
- **Apps**: Unlimited
- **Support**: Priority email support
- **Features**:
  - Full REST & GraphQL API
  - Advanced analytics
  - Webhook support
  - API key rotation
  - Custom domains (up to 5)
  - Email support (4h response)
  - Monthly usage reports

#### Enterprise Plan - Custom
- **Price**: Custom pricing
- **API Requests**: Unlimited
- **Requests/Second**: 1,000+
- **Concurrent**: 1,000+
- **Apps**: Unlimited
- **Support**: Dedicated account manager
- **Features**:
  - Everything in Pro
  - SLA agreement
  - Custom rate limits
  - Dedicated webhooks infrastructure
  - Custom integrations
  - On-premise deployment option
  - 1-hour support response
  - Quarterly business reviews

### 14.2 Usage-Based Pricing

Additional charges beyond included quota:

```
Base Plan Fee: $99/month (includes 10M requests)

Usage-Based Overage:
- Requests 10M - 20M: $0.10 per 1,000 requests
- Requests 20M - 50M: $0.08 per 1,000 requests
- Requests 50M+: $0.05 per 1,000 requests

Example:
  12M requests in month = 2M overage
  Cost = 2M × ($0.10/1000) = $200
  Total = $99 + $200 = $299
```

### 14.3 Monetization for App Developers

Third-party app developers can monetize through the marketplace:

#### Revenue Sharing Models

```
Model 1: Revenue Split
  Developer Share: 70%
  Clearway Share: 30%

Model 2: Freemium
  Free tier: Limited usage
  Paid tier: Full features
  Developer keeps: 70% of paid tier revenue

Model 3: Fixed Subscription
  App Price: Developer sets
  Developer keeps: 70%
  Clearway takes: 30%
```

#### App Billing Example

```json
{
  "app_id": "app_slack",
  "pricing_model": "FREEMIUM",
  "free_tier": {
    "request_limit": 1000,
    "features": ["basic_notifications"]
  },
  "paid_tier": {
    "monthly_price": 9.99,
    "request_limit": 100000,
    "features": ["advanced_features", "priority_support"]
  }
}
```

#### Developer Payouts

- **Payout Schedule**: Monthly on 15th
- **Minimum Threshold**: $25
- **Payment Methods**: Bank transfer, PayPal, Stripe
- **Reporting**: Detailed dashboard with transaction history

---

## 15. Implementation Timeline

### Week 37: API Gateway & REST Foundation

**Objectives**:
- Deploy API Gateway infrastructure
- Implement v1 REST endpoints
- Set up rate limiting service
- Configure API key management

**Deliverables**:
- [ ] API Gateway deployed (Kong or AWS API Gateway)
- [ ] Core REST endpoints operational
- [ ] Rate limiting working across tiers
- [ ] API key CRUD operations
- [ ] Basic usage tracking

**Resource Allocation**:
- Backend Engineers: 4
- DevOps: 2
- QA: 2

### Week 38: GraphQL, SDKs, and Developer Portal

**Objectives**:
- Launch GraphQL API
- Publish SDKs (Node.js, Python)
- Deploy developer portal MVP
- Implement API Playground

**Deliverables**:
- [ ] GraphQL API with full schema
- [ ] Node.js SDK complete
- [ ] Python SDK complete
- [ ] Developer portal live
- [ ] API Playground functional
- [ ] Documentation site v1

**Resource Allocation**:
- Backend Engineers: 3
- Frontend Engineers: 2
- SDK Developers: 2
- Technical Writers: 2

### Week 39: Marketplace & OAuth

**Objectives**:
- Implement OAuth 2.0 framework
- Launch app marketplace
- Set up app submission workflow
- Implement webhook infrastructure

**Deliverables**:
- [ ] OAuth 2.0 authorization code flow
- [ ] App marketplace operational
- [ ] App submission & approval workflow
- [ ] Webhook event system
- [ ] Webhook delivery & retry logic
- [ ] Ruby & Go SDKs published

**Resource Allocation**:
- Backend Engineers: 3
- Marketplace Manager: 1
- Security Engineer: 1
- SDK Developers: 2

### Week 40: Monetization, Analytics & Polish

**Objectives**:
- Integrate billing system
- Implement usage analytics
- Deploy monitoring & observability
- Complete documentation

**Deliverables**:
- [ ] Stripe/Paddle integration
- [ ] Subscription tier enforcement
- [ ] Usage analytics dashboard
- [ ] Monitoring & alerting
- [ ] Error tracking (Sentry)
- [ ] API v2 preview released
- [ ] Complete documentation
- [ ] Security audit completed

**Resource Allocation**:
- Backend Engineers: 2
- Finance/Billing: 1
- DevOps: 2
- QA: 2

### Timeline Milestones

```
Week 37        Week 38        Week 39        Week 40
├──────────────├──────────────├──────────────├──────────┐
│ REST API     │ GraphQL      │ OAuth/       │ Billing/ │
│ Gateway      │ SDKs         │ Marketplace  │ Analytics│
│ Rate Limit   │ Portal       │ Webhooks     │ Monitor  │
│ API Keys     │ Playground   │              │          │
│              │              │              │ PUBLIC   │
│              │              │              │ LAUNCH   │
└──────────────┴──────────────┴──────────────┴──────────┘
```

---

## 16. Success Metrics

### 16.1 API Usage Metrics

| Metric | Week 37 | Week 38 | Week 39 | Week 40 | Final Target |
|--------|---------|---------|---------|---------|--------------|
| API Calls/Month | - | 500K | 2M | 5M | 10M+ |
| Avg Response Time | <100ms | <100ms | <100ms | <100ms | <100ms |
| Error Rate | <1% | <1% | <1% | <0.5% | <0.5% |
| API Uptime | 99.5% | 99.5% | 99.9% | 99.99% | 99.99% |

### 16.2 Developer Ecosystem Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Developer Signups | 1,000+ | Week 40 end |
| Active API Keys | 500+ | Week 40 end |
| Apps in Marketplace | 50+ | Week 40 end |
| Third-Party App Installs | 2,000+ | Month 2 |
| Average App Rating | 4.5+ stars | Ongoing |

### 16.3 Business Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Pro Tier Subscriptions | 100+ | Month 2 |
| Enterprise Contracts | 5+ | Month 3 |
| Developer Revenue | $5,000+/month | Month 3 |
| Platform Revenue | $10,000+/month | Month 3 |

### 16.4 Quality Metrics

| Metric | Target |
|--------|--------|
| Test Coverage | >90% |
| Documentation Completeness | 100% |
| Code Security Scan | 0 critical issues |
| Performance Tests | Pass all benchmarks |
| Load Testing | 10,000 RPS capacity |

### 16.5 Developer Satisfaction

| Metric | Target |
|--------|--------|
| Developer NPS | >50 |
| Documentation Rating | >4.5/5 |
| SDK Satisfaction | >4.5/5 |
| API Playground Usage | >80% of devs |
| Support Response Time | <4 hours (Pro) |

### 16.6 Monitoring Dashboard

```
┌─────────────────────────────────────────────────┐
│         Success Metrics Dashboard               │
├─────────────────────────────────────────────────┤
│                                                 │
│ API Metrics:                                   │
│ ├─ Calls/Month: 8.2M / 10M target  ▓▓▓▓░      │
│ ├─ Avg Latency: 42ms / <100ms     ▓░        │
│ ├─ Error Rate: 0.3% / <0.5%        ▓░        │
│ └─ Uptime: 99.98% / 99.99%         ▓▓▓▓░    │
│                                                 │
│ Developer Metrics:                             │
│ ├─ Signups: 1,250 / 1,000 target   ▓▓▓▓▓     │
│ ├─ API Keys: 620 / 500 target      ▓▓▓▓▓     │
│ ├─ Marketplace Apps: 65 / 50       ▓▓▓▓▓     │
│ └─ App Installs: 2,100 / 2,000     ▓▓▓▓▓     │
│                                                 │
│ Business Metrics:                              │
│ ├─ Pro Subscriptions: 125 / 100    ▓▓▓▓▓     │
│ ├─ Monthly Revenue: $12,500        ▓▓▓▓▓     │
│ └─ Developer Revenue: $6,200       ▓▓▓▓▓     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 17. Risk Mitigation

### 17.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| API Gateway bottleneck | Medium | High | Load testing, auto-scaling |
| OAuth implementation bugs | Medium | High | Security audit, pen testing |
| Webhook delivery failures | Medium | Medium | Exponential backoff, DLQ |
| Rate limit bypass | Low | High | Security review, monitoring |
| Database performance | Medium | High | Query optimization, caching |

### 17.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Low adoption | Medium | High | Marketing push, beta incentives |
| Competitive threats | Medium | Medium | Feature differentiation, pricing strategy |
| Security breach | Low | Critical | Security team, bug bounty program |
| Developer support costs | Medium | Medium | Self-service docs, community forums |

### 17.3 Contingency Planning

**If rate limiting fails**:
- Fall back to token bucket algorithm
- Implement circuit breaker pattern
- Manual quota enforcement layer

**If OAuth has bugs**:
- API key authentication as fallback
- Emergency hotfix process
- Temporary disable third-party apps

**If webhooks are unreliable**:
- Event log with replay capability
- GraphQL subscriptions as alternative
- Manual webhook triggering admin tool

---

## 18. Security Considerations

### 18.1 Authentication & Authorization

- **API Key Authentication**: HMAC-SHA256 signing
- **OAuth 2.0**: Industry-standard for third-party access
- **JWT Tokens**: Stateless, time-limited access tokens
- **Scopes**: Fine-grained permission control
- **Rate Limiting**: Per-key rate limiting to prevent abuse

### 18.2 Data Protection

- **TLS 1.3**: All API traffic encrypted in transit
- **Secrets Rotation**: Automated key rotation
- **PII Encryption**: Database encryption at rest
- **Audit Logging**: All API access logged
- **GDPR Compliance**: Data deletion, export capabilities

### 18.3 Vulnerability Management

- **OWASP Top 10**: Regular security reviews
- **Dependency Scanning**: Automated vulnerability scanning
- **Penetration Testing**: Annual third-party pen testing
- **Bug Bounty Program**: Responsible disclosure program
- **Security Headers**: HSTS, CSP, X-Frame-Options

---

## 19. Maintenance & Operations

### 19.1 SLA Commitments

- **Uptime**: 99.99% (52 minutes downtime/year)
- **Response Time**: <100ms p99 latency
- **Support**: 24/7 monitoring, <4h response (Pro)
- **Incident Response**: <15min incident detection

### 19.2 Maintenance Windows

- **Scheduled**: Sundays 2-4am UTC (lowest traffic)
- **Notification**: 72-hour advance notice
- **Zero-downtime**: Blue-green deployments
- **Rollback Plan**: Automated rollback on errors

### 19.3 Monitoring & Alerting

- **Uptime Monitoring**: Synthetic checks every 30s
- **Error Rate**: Alert if >0.5%
- **Latency**: Alert if p95 >500ms
- **Rate Limit**: Alert if quota approaching
- **Dependency Health**: Check all integrations hourly

---

## Conclusion

The API Marketplace Agent represents Phase 3's commitment to building a world-class developer ecosystem. With comprehensive REST and GraphQL APIs, robust SDK support, marketplace infrastructure, and enterprise-grade monetization, Clearway will become the platform of choice for API-driven development.

**Key Success Factors**:
1. Developer-first design philosophy
2. Comprehensive documentation and examples
3. Robust infrastructure and monitoring
4. Fair monetization for ecosystem
5. Community-driven evolution

**Next Steps**:
- Week 37: Begin infrastructure deployment
- Week 38: Launch public preview
- Week 39: Marketplace opening to developers
- Week 40: Full Phase 3 public launch


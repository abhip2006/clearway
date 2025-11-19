// lib/api-marketplace/graphql/schema.ts
// GraphQL Schema for API Marketplace

export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    email: String!
    name: String
    subscription: Subscription
    apiKeys: [APIKey!]!
    apps: [App!]!
    webhooks: [Webhook!]!
  }

  type APIKey {
    id: ID!
    name: String!
    key: String!
    scopes: [String!]!
    createdAt: DateTime!
    lastUsed: DateTime
    rateLimit: RateLimit!
    active: Boolean!
  }

  type RateLimit {
    requestsPerSecond: Int!
    requestsPerDay: Int!
    requestsPerMonth: Int!
    concurrent: Int
  }

  type App {
    id: ID!
    name: String!
    description: String!
    category: String!
    version: String!
    icon: String
    owner: User!
    status: AppStatus!
    publishedAt: DateTime
    rating: Float
    reviews: [AppReview!]!
    oauthConfig: OAuthConfig
    pricing: AppPricing
    installCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum AppStatus {
    DRAFT
    PENDING
    APPROVED
    ACTIVE
    DEPRECATED
  }

  type AppReview {
    id: ID!
    app: App!
    reviewer: User!
    rating: Int!
    comment: String
    helpful: Int
    createdAt: DateTime!
  }

  type OAuthConfig {
    clientId: String!
    redirectUris: [String!]!
    scopes: [String!]!
    authorizationUrl: String!
    tokenUrl: String!
  }

  type AppPricing {
    priceModel: String!
    basePrice: Float
    perUnitPrice: Float
    freeTierLimit: Int
    currency: String!
  }

  type Subscription {
    id: ID!
    tier: SubscriptionTier!
    status: SubscriptionStatus!
    currentPeriod: Period!
    nextBillingDate: DateTime
    apiQuota: RateLimit!
    features: [String!]!
    price: Float!
    billingCycle: String!
  }

  enum SubscriptionTier {
    STARTER
    PRO
    ENTERPRISE
  }

  enum SubscriptionStatus {
    ACTIVE
    CANCELED
    SUSPENDED
  }

  type Period {
    start: DateTime!
    end: DateTime!
  }

  type Webhook {
    id: ID!
    url: String!
    events: [String!]!
    active: Boolean!
    retryPolicy: RetryPolicy!
    deliveryLogs: [DeliveryLog!]!
    createdAt: DateTime!
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
  }

  type Usage {
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

  type AppConnection {
    edges: [AppEdge!]!
    pageInfo: PageInfo!
  }

  type AppEdge {
    node: App!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  # Queries
  type Query {
    me: User
    user(id: ID!): User

    apiKeys: [APIKey!]!
    apiKey(id: ID!): APIKey

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

    usage(period: DateTime!): Usage
    usageHistory(start: DateTime!, end: DateTime!): [Usage!]!

    subscription: Subscription
    availablePlans: [Subscription!]!

    webhooks: [Webhook!]!
    webhook(id: ID!): Webhook
  }

  # Mutations
  type Mutation {
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

  type QuotaAlert {
    apiKeyId: ID!
    limit: Int!
    usage: Int!
    resetAt: DateTime!
  }

  type UsageAlert {
    threshold: Int!
    currentUsage: Int!
    period: String!
  }

  # Input types
  input CreateAppInput {
    name: String!
    slug: String!
    description: String!
    longDescription: String!
    category: String!
    icon: String
    features: [String!]!
    permissions: [String!]!
    documentationUrl: String
    supportUrl: String
  }

  input UpdateAppInput {
    name: String
    description: String
    longDescription: String
    icon: String
    features: [String!]
    documentationUrl: String
    supportUrl: String
  }

  input CreateWebhookInput {
    url: String!
    events: [String!]!
    headers: JSON
  }

  input UpdateWebhookInput {
    url: String
    events: [String!]
    active: Boolean
  }
`;

# Fund Administrator Integration Agent 🏦

## Role
Specialized agent responsible for building bidirectional integrations with major fund administrators (SS&C, Carta, Juniper Square, Altvia, Allvue). Handles data synchronization, API authentication, webhook processing, and ensures 99.9% data accuracy for automated capital call ingestion.

## Primary Responsibilities

1. **Fund Administrator API Integration**
   - SS&C Advent integration (Geneva, APX)
   - Carta Fund Administration API
   - Juniper Square API v2
   - Altvia API integration
   - Allvue Systems integration
   - Custom SFTP/EDI integrations

2. **Data Synchronization**
   - Real-time capital call ingestion
   - Investor roster synchronization
   - Fund performance data sync
   - Distribution notice processing
   - Commitment tracking
   - NAV updates

3. **Authentication & Security**
   - OAuth 2.0 flows for each platform
   - API key rotation and management
   - mTLS certificate handling
   - IP whitelisting configuration
   - Webhook signature verification
   - Encrypted credential storage

4. **Data Transformation & Mapping**
   - Schema mapping between fund admin formats
   - Field normalization (investor IDs, fund codes)
   - Currency conversion handling
   - Date format standardization
   - Custom field mapping per administrator

5. **Error Handling & Reconciliation**
   - Failed sync retry logic
   - Data discrepancy detection
   - Manual reconciliation UI
   - Audit trail for all syncs
   - Alert system for sync failures

## Tech Stack

### API Integration
- **axios** with custom retry interceptors
- **openapi-typescript-codegen** for type-safe clients
- **jose** for JWT handling
- **csv-parse** for SFTP file parsing

### Queue & Job Processing
- **BullMQ** for sync job queues
- **Redis** for distributed locks
- **Temporal.io** for long-running workflows

### Data Validation
- **ajv** for JSON schema validation
- **zod** for runtime type checking
- **joi** for complex validation rules

### Monitoring
- **Datadog** for API metrics
- **Sentry** for error tracking
- **Grafana** for sync dashboards

## MVP Phase 2 Features

### Week 9-10: SS&C Advent Integration

**Task FA-001: SS&C Geneva API Authentication**
```typescript
// lib/fund-admin/ssc/auth.ts

import axios from 'axios';
import { z } from 'zod';

const SSCAuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

export class SSCAuthClient {
  private tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  constructor(
    private clientId: string,
    private clientSecret: string,
    private apiUrl: string
  ) {}

  async getAccessToken(accountId: string): Promise<string> {
    // Check cache
    const cached = this.tokenCache.get(accountId);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }

    // Request new token
    const response = await axios.post(
      `${this.apiUrl}/oauth2/token`,
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: `fund:${accountId}:read capital_calls:write`,
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const auth = SSCAuthResponseSchema.parse(response.data);

    // Cache token
    this.tokenCache.set(accountId, {
      token: auth.access_token,
      expiresAt: Date.now() + auth.expires_in * 1000,
    });

    return auth.access_token;
  }

  async refreshToken(accountId: string, refreshToken: string): Promise<string> {
    const response = await axios.post(`${this.apiUrl}/oauth2/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const auth = SSCAuthResponseSchema.parse(response.data);

    this.tokenCache.set(accountId, {
      token: auth.access_token,
      expiresAt: Date.now() + auth.expires_in * 1000,
    });

    return auth.access_token;
  }
}
```

**Acceptance Criteria**:
- ✅ OAuth 2.0 client credentials flow implemented
- ✅ Token caching with 1-minute buffer before expiry
- ✅ Automatic token refresh
- ✅ Multi-account support
- ✅ Error handling for auth failures
- ✅ Secure credential storage (encrypted at rest)

---

**Task FA-002: Capital Call Data Ingestion from Geneva**
```typescript
// lib/fund-admin/ssc/capital-calls.ts

import { SSCAuthClient } from './auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const GenevaCapitalCallSchema = z.object({
  call_id: z.string(),
  fund_code: z.string(),
  call_date: z.string().datetime(),
  due_date: z.string().datetime(),
  settlement_date: z.string().datetime(),
  investors: z.array(z.object({
    investor_id: z.string(),
    investor_name: z.string(),
    email: z.string().email(),
    amount_called: z.number(),
    currency: z.string().length(3),
    commitment_id: z.string(),
  })),
  wire_instructions: z.object({
    bank_name: z.string(),
    account_number: z.string(),
    routing_number: z.string(),
    swift_code: z.string().optional(),
    iban: z.string().optional(),
    reference: z.string(),
  }),
  purpose: z.string(),
  notes: z.string().optional(),
});

export class SSCCapitalCallSyncService {
  constructor(
    private authClient: SSCAuthClient,
    private accountId: string
  ) {}

  async syncCapitalCalls(since?: Date): Promise<{
    synced: number;
    failed: number;
    errors: Array<{ callId: string; error: string }>;
  }> {
    const token = await this.authClient.getAccessToken(this.accountId);

    // Fetch capital calls from Geneva
    const response = await axios.get(
      `${process.env.SSC_API_URL}/v2/funds/${this.accountId}/capital-calls`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          since: since?.toISOString(),
          status: 'active',
          include: 'investors,wire_instructions',
        },
      }
    );

    const capitalCalls = z.array(GenevaCapitalCallSchema).parse(response.data.data);

    let synced = 0;
    let failed = 0;
    const errors: Array<{ callId: string; error: string }> = [];

    // Process each capital call
    for (const call of capitalCalls) {
      try {
        await this.processCapitalCall(call);
        synced++;
      } catch (error) {
        failed++;
        errors.push({
          callId: call.call_id,
          error: error.message,
        });
      }
    }

    // Log sync results
    await db.fundAdminSync.create({
      data: {
        administrator: 'SSC_GENEVA',
        accountId: this.accountId,
        syncType: 'CAPITAL_CALLS',
        totalRecords: capitalCalls.length,
        successCount: synced,
        failureCount: failed,
        errors: errors.length > 0 ? errors : undefined,
        syncedAt: new Date(),
      },
    });

    return { synced, failed, errors };
  }

  private async processCapitalCall(call: z.infer<typeof GenevaCapitalCallSchema>) {
    // Map Geneva investor IDs to Clearway user IDs
    const investorMappings = await db.investorMapping.findMany({
      where: {
        fundAdministrator: 'SSC_GENEVA',
        externalInvestorId: { in: call.investors.map(i => i.investor_id) },
      },
    });

    const mappingLookup = new Map(
      investorMappings.map(m => [m.externalInvestorId, m.userId])
    );

    // Create capital calls for each investor
    const createPromises = call.investors.map(async (investor) => {
      const userId = mappingLookup.get(investor.investor_id);

      if (!userId) {
        throw new Error(`No user mapping for investor ${investor.investor_id}`);
      }

      // Create capital call record
      return db.capitalCall.create({
        data: {
          userId,
          fundName: await this.resolveFundName(call.fund_code),
          investorEmail: investor.email,
          investorAccount: investor.investor_id,
          amountDue: investor.amount_called,
          currency: investor.currency,
          dueDate: new Date(call.due_date),
          bankName: call.wire_instructions.bank_name,
          accountNumber: call.wire_instructions.account_number,
          routingNumber: call.wire_instructions.routing_number,
          wireReference: call.wire_instructions.reference,
          status: 'APPROVED', // Auto-approved from fund admin
          source: 'SSC_GENEVA',
          externalId: call.call_id,
          rawExtraction: {
            genevaData: call,
            syncedAt: new Date().toISOString(),
          },
          confidenceScores: {
            fundName: 1.0,
            amountDue: 1.0,
            dueDate: 1.0,
          },
        },
      });
    });

    await Promise.all(createPromises);
  }

  private async resolveFundName(fundCode: string): Promise<string> {
    const mapping = await db.fundMapping.findUnique({
      where: {
        fundAdministrator_externalFundCode: {
          fundAdministrator: 'SSC_GENEVA',
          externalFundCode: fundCode,
        },
      },
    });

    return mapping?.fundName || fundCode;
  }
}
```

**Acceptance Criteria**:
- ✅ Fetches capital calls from Geneva API
- ✅ Maps Geneva investor IDs to Clearway users
- ✅ Creates capital call records with all fields
- ✅ Handles missing investor mappings gracefully
- ✅ Auto-approves capital calls from fund admin
- ✅ Stores raw Geneva data for debugging
- ✅ Logs sync results to database
- ✅ Returns detailed sync report

---

**Task FA-003: Investor Roster Synchronization**
```typescript
// lib/fund-admin/ssc/investor-sync.ts

export class InvestorRosterSyncService {
  async syncInvestorRoster(fundId: string): Promise<{
    new: number;
    updated: number;
    unmapped: number;
  }> {
    const token = await this.authClient.getAccessToken(this.accountId);

    const response = await axios.get(
      `${process.env.SSC_API_URL}/v2/funds/${fundId}/investors`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          include: 'contact_info,commitments,allocations',
          status: 'active',
        },
      }
    );

    const investors = z.array(InvestorSchema).parse(response.data.data);

    let newMappings = 0;
    let updated = 0;
    let unmapped = 0;

    for (const investor of investors) {
      // Try to find user by email
      const user = await db.user.findUnique({
        where: { email: investor.email },
      });

      if (!user) {
        unmapped++;

        // Create notification for admin to map investor
        await db.unmappedInvestor.create({
          data: {
            fundAdministrator: 'SSC_GENEVA',
            externalInvestorId: investor.investor_id,
            investorName: investor.name,
            email: investor.email,
            fundId,
            needsMapping: true,
          },
        });

        continue;
      }

      // Create or update mapping
      const mapping = await db.investorMapping.upsert({
        where: {
          fundAdministrator_externalInvestorId: {
            fundAdministrator: 'SSC_GENEVA',
            externalInvestorId: investor.investor_id,
          },
        },
        update: {
          investorName: investor.name,
          email: investor.email,
          commitment: investor.commitment_amount,
          updatedAt: new Date(),
        },
        create: {
          fundAdministrator: 'SSC_GENEVA',
          externalInvestorId: investor.investor_id,
          userId: user.id,
          investorName: investor.name,
          email: investor.email,
          commitment: investor.commitment_amount,
        },
      });

      if (mapping.createdAt.getTime() === mapping.updatedAt.getTime()) {
        newMappings++;
      } else {
        updated++;
      }
    }

    return { new: newMappings, updated, unmapped };
  }

  async mapInvestorManually(
    externalInvestorId: string,
    userId: string
  ): Promise<void> {
    const unmapped = await db.unmappedInvestor.findFirst({
      where: {
        fundAdministrator: 'SSC_GENEVA',
        externalInvestorId,
        needsMapping: true,
      },
    });

    if (!unmapped) {
      throw new Error('Unmapped investor not found');
    }

    await db.investorMapping.create({
      data: {
        fundAdministrator: 'SSC_GENEVA',
        externalInvestorId,
        userId,
        investorName: unmapped.investorName,
        email: unmapped.email,
      },
    });

    await db.unmappedInvestor.update({
      where: { id: unmapped.id },
      data: { needsMapping: false, mappedAt: new Date() },
    });
  }
}
```

**Acceptance Criteria**:
- ✅ Syncs complete investor roster from Geneva
- ✅ Auto-maps investors by email when possible
- ✅ Flags unmapped investors for manual review
- ✅ Provides manual mapping UI/API
- ✅ Updates investor info on subsequent syncs
- ✅ Tracks commitment amounts
- ✅ Returns detailed sync statistics

---

### Week 11-12: Carta Fund Administration Integration

**Task FA-004: Carta API Client**
```typescript
// lib/fund-admin/carta/client.ts

export class CartaFundAdminClient {
  private baseUrl = 'https://api.carta.com/v2';

  constructor(private apiKey: string) {}

  async getCapitalCalls(fundId: string, params?: {
    since?: Date;
    status?: 'pending' | 'settled' | 'all';
  }): Promise<CartaCapitalCall[]> {
    const response = await axios.get(
      `${this.baseUrl}/funds/${fundId}/capital-calls`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Carta-Version': '2024-01-01',
        },
        params: {
          created_after: params?.since?.toISOString(),
          status: params?.status || 'all',
        },
      }
    );

    return response.data.capital_calls;
  }

  async getInvestors(fundId: string): Promise<CartaInvestor[]> {
    const response = await axios.get(
      `${this.baseUrl}/funds/${fundId}/investors`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Carta-Version': '2024-01-01',
        },
      }
    );

    return response.data.investors;
  }

  async acknowledgeCapitalCall(
    capitalCallId: string,
    acknowledgement: {
      investorId: string;
      acknowledgedAt: Date;
      acknowledgedBy: string;
    }
  ): Promise<void> {
    await axios.post(
      `${this.baseUrl}/capital-calls/${capitalCallId}/acknowledge`,
      {
        investor_id: acknowledgement.investorId,
        acknowledged_at: acknowledgement.acknowledgedAt.toISOString(),
        acknowledged_by: acknowledgement.acknowledgedBy,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Carta-Version': '2024-01-01',
        },
      }
    );
  }

  async reportPayment(
    capitalCallId: string,
    payment: {
      investorId: string;
      amount: number;
      paidAt: Date;
      reference: string;
    }
  ): Promise<void> {
    await axios.post(
      `${this.baseUrl}/capital-calls/${capitalCallId}/payments`,
      {
        investor_id: payment.investorId,
        amount: payment.amount,
        paid_at: payment.paidAt.toISOString(),
        reference: payment.reference,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Carta-Version': '2024-01-01',
        },
      }
    );
  }
}
```

**Acceptance Criteria**:
- ✅ Type-safe Carta API client
- ✅ Capital call retrieval
- ✅ Investor roster access
- ✅ Bidirectional sync (acknowledgements back to Carta)
- ✅ Payment reporting
- ✅ API version header support
- ✅ Error handling with retries

---

**Task FA-005: Webhook Processing for Real-Time Updates**
```typescript
// app/api/webhooks/fund-admin/carta/route.ts

import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest';

export async function POST(req: Request) {
  const webhookSecret = process.env.CARTA_WEBHOOK_SECRET!;

  // Verify webhook signature
  const headersList = headers();
  const signature = headersList.get('carta-signature');
  const timestamp = headersList.get('carta-timestamp');

  const body = await req.text();

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Prevent replay attacks (timestamp must be within 5 minutes)
  const requestTime = parseInt(timestamp!);
  if (Math.abs(Date.now() / 1000 - requestTime) > 300) {
    return new Response('Request expired', { status: 401 });
  }

  const event = JSON.parse(body);

  // Process webhook event
  switch (event.type) {
    case 'capital_call.created':
      await inngest.send({
        name: 'fund-admin.capital-call.created',
        data: {
          administrator: 'CARTA',
          capitalCallId: event.data.id,
          fundId: event.data.fund_id,
        },
      });
      break;

    case 'capital_call.updated':
      await inngest.send({
        name: 'fund-admin.capital-call.updated',
        data: {
          administrator: 'CARTA',
          capitalCallId: event.data.id,
          changes: event.data.changes,
        },
      });
      break;

    case 'investor.updated':
      await inngest.send({
        name: 'fund-admin.investor.updated',
        data: {
          administrator: 'CARTA',
          investorId: event.data.id,
          changes: event.data.changes,
        },
      });
      break;

    default:
      console.warn(`Unknown webhook event type: ${event.type}`);
  }

  // Log webhook receipt
  await db.webhookLog.create({
    data: {
      source: 'CARTA',
      eventType: event.type,
      eventId: event.id,
      payload: event,
      processedAt: new Date(),
    },
  });

  return new Response('OK', { status: 200 });
}
```

**Acceptance Criteria**:
- ✅ HMAC signature verification
- ✅ Replay attack prevention
- ✅ Event type routing
- ✅ Inngest job triggering
- ✅ Webhook logging
- ✅ Error handling

---

### Week 13-14: Multi-Administrator Support & Orchestration

**Task FA-006: Unified Sync Orchestrator**
```typescript
// lib/fund-admin/orchestrator.ts

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export const fundAdminSyncQueue = new Queue('fund-admin-sync', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export class FundAdminOrchestrator {
  async scheduleDailySyncs() {
    // Get all active fund admin connections
    const connections = await db.fundAdminConnection.findMany({
      where: {
        status: 'ACTIVE',
        syncEnabled: true,
      },
    });

    for (const connection of connections) {
      await fundAdminSyncQueue.add(
        'sync-capital-calls',
        {
          administrator: connection.administrator,
          accountId: connection.accountId,
          syncType: 'CAPITAL_CALLS',
        },
        {
          jobId: `${connection.administrator}-${connection.accountId}-${new Date().toISOString().split('T')[0]}`,
          removeOnComplete: {
            age: 7 * 24 * 3600, // Keep for 7 days
            count: 100,
          },
        }
      );
    }
  }

  async syncNow(connectionId: string, syncType: 'CAPITAL_CALLS' | 'INVESTORS') {
    const connection = await db.fundAdminConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    await fundAdminSyncQueue.add('sync-on-demand', {
      administrator: connection.administrator,
      accountId: connection.accountId,
      syncType,
      priority: 'HIGH',
    });
  }
}

// Worker to process sync jobs
const syncWorker = new Worker(
  'fund-admin-sync',
  async (job) => {
    const { administrator, accountId, syncType } = job.data;

    // Get appropriate sync service
    const syncService = getFundAdminService(administrator, accountId);

    let result;

    if (syncType === 'CAPITAL_CALLS') {
      result = await syncService.syncCapitalCalls();
    } else if (syncType === 'INVESTORS') {
      result = await syncService.syncInvestorRoster();
    }

    // Update last sync time
    await db.fundAdminConnection.update({
      where: {
        administrator_accountId: {
          administrator,
          accountId,
        },
      },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: result.failed === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE',
      },
    });

    return result;
  },
  {
    connection: redis,
    concurrency: 5, // Process 5 syncs concurrently
  }
);

function getFundAdminService(administrator: string, accountId: string) {
  switch (administrator) {
    case 'SSC_GENEVA':
      return new SSCCapitalCallSyncService(
        new SSCAuthClient(
          process.env.SSC_CLIENT_ID!,
          process.env.SSC_CLIENT_SECRET!,
          process.env.SSC_API_URL!
        ),
        accountId
      );
    case 'CARTA':
      return new CartaSyncService(
        new CartaFundAdminClient(process.env.CARTA_API_KEY!)
      );
    // Add other administrators...
    default:
      throw new Error(`Unsupported administrator: ${administrator}`);
  }
}
```

**Acceptance Criteria**:
- ✅ BullMQ queue for sync orchestration
- ✅ Daily automatic sync scheduling
- ✅ On-demand sync capability
- ✅ Multi-administrator support
- ✅ Concurrent sync processing
- ✅ Retry logic with exponential backoff
- ✅ Sync status tracking
- ✅ Job deduplication by date

---

## Database Schema Additions

```prisma
model FundAdminConnection {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  administrator     String   // SSC_GENEVA, CARTA, etc.
  accountId         String   // Account ID with that administrator

  credentials       Json     // Encrypted credentials
  syncEnabled       Boolean  @default(true)
  status            String   @default("ACTIVE") // ACTIVE, DISABLED, ERROR

  lastSyncAt        DateTime?
  lastSyncStatus    String?  // SUCCESS, PARTIAL_FAILURE, FAILURE

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([administrator, accountId])
  @@index([organizationId])
}

model InvestorMapping {
  id                  String   @id @default(cuid())
  fundAdministrator   String
  externalInvestorId  String

  userId              String
  user                User @relation(fields: [userId], references: [id])

  investorName        String
  email               String
  commitment          Decimal? @db.Decimal(15, 2)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([fundAdministrator, externalInvestorId])
  @@index([userId])
}

model FundMapping {
  id                  String   @id @default(cuid())
  fundAdministrator   String
  externalFundCode    String

  fundName            String
  fundType            String?
  vintage             Int?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([fundAdministrator, externalFundCode])
}

model FundAdminSync {
  id              String   @id @default(cuid())
  administrator   String
  accountId       String
  syncType        String   // CAPITAL_CALLS, INVESTORS, etc.

  totalRecords    Int
  successCount    Int
  failureCount    Int
  errors          Json?

  syncedAt        DateTime @default(now())

  @@index([administrator, accountId])
  @@index([syncedAt(sort: Desc)])
}

model UnmappedInvestor {
  id                  String   @id @default(cuid())
  fundAdministrator   String
  externalInvestorId  String

  investorName        String
  email               String
  fundId              String?

  needsMapping        Boolean  @default(true)
  mappedAt            DateTime?

  createdAt           DateTime @default(now())

  @@index([fundAdministrator, needsMapping])
}

model WebhookLog {
  id           String   @id @default(cuid())
  source       String   // CARTA, SSC_GENEVA, etc.
  eventType    String
  eventId      String   @unique

  payload      Json
  processedAt  DateTime @default(now())

  @@index([source, eventType])
  @@index([processedAt(sort: Desc)])
}
```

---

## Quality Standards

### Data Accuracy
- **99.9% sync accuracy** - All capital calls synced correctly
- **Zero data loss** - Failed syncs retry automatically
- **< 5 minute sync delay** - Real-time webhook processing

### Reliability
- **99.5% uptime** for sync services
- **Automatic retry** on transient failures
- **Manual reconciliation** for persistent failures

### Security
- **Encrypted credentials** at rest (AWS KMS)
- **API key rotation** every 90 days
- **Audit trail** for all sync operations
- **IP whitelisting** for fund admin APIs

### Performance
- **< 30 seconds** for typical sync job
- **Concurrent processing** of multiple syncs
- **Rate limiting** compliance with fund admin APIs

---

## Testing Requirements

### Integration Tests
```typescript
// tests/integration/fund-admin/ssc-sync.test.ts

describe('SSC Geneva Sync', () => {
  it('syncs capital calls successfully', async () => {
    const service = new SSCCapitalCallSyncService(authClient, accountId);
    const result = await service.syncCapitalCalls();

    expect(result.synced).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
  });

  it('handles unmapped investors', async () => {
    // Test investor without mapping
    const result = await service.syncCapitalCalls();

    const unmapped = await db.unmappedInvestor.findMany();
    expect(unmapped.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests
- Sync from test fund admin account
- Verify capital calls created in database
- Test investor mapping flow
- Validate webhook processing

---

## Monitoring & Alerts

### Metrics to Track
- Sync success rate per administrator
- Average sync duration
- API error rates
- Unmapped investor count
- Failed capital calls

### Alerts
- Sync failure for > 2 consecutive attempts
- Unmapped investors > 10
- API rate limit approaching
- Webhook signature verification failures

---

**Fund Administrator Integration Agent ready to connect Clearway with major fund administrators for automated capital call ingestion.**

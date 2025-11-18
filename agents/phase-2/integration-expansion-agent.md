# Integration Expansion Agent 🔗

## Role
Specialized agent responsible for expanding integrations beyond MVP: accounting software (QuickBooks, Xero), banking APIs (Plaid+), document signing (DocuSign), tax software (TurboTax, TaxAct), portfolio management (Bloomberg, FactSet), and webhook marketplace.

## Primary Responsibilities

1. **Accounting Integration**
   - QuickBooks Online sync
   - Xero integration
   - NetSuite connector
   - Auto-posting to GL accounts
   - Reconciliation automation

2. **Enhanced Banking**
   - Plaid balance monitoring
   - Real-time payment verification
   - Multi-bank account support
   - Treasury management APIs
   - FX rate integration

3. **Document Workflow**
   - DocuSign for approvals
   - HelloSign integration
   - Adobe Sign connector
   - E-signature tracking
   - Document version control

4. **Tax Software Integration**
   - K-1 data export
   - TurboTax import
   - Tax lot tracking
   - Cost basis reporting

5. **Portfolio Management**
   - Bloomberg Terminal API
   - FactSet integration
   - Morningstar data
   - Custom data feeds
   - Investment performance tracking

6. **Webhook Marketplace**
   - Zapier integration
   - Make.com workflows
   - Custom webhook endpoints
   - Event streaming (Kafka)

## Tech Stack

### Integration Platforms
- **Merge.dev** for unified API
- **Zapier** for no-code automation
- **Tray.io** for enterprise workflows

### APIs
- **Plaid** for banking
- **QuickBooks API**
- **DocuSign eSignature API**
- **Bloomberg API** (Terminal Connect)

### Message Queue
- **Apache Kafka** for event streaming
- **AWS SQS** for queues
- **RabbitMQ** for job routing

## Phase 2 Features

### Week 19-20: Accounting Software Integration

**Task INT-EXP-001: QuickBooks Online Integration**
```typescript
// lib/integrations/quickbooks.ts

import OAuth2 from 'oauth2';

export class QuickBooksService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2({
      client: {
        id: process.env.QUICKBOOKS_CLIENT_ID!,
        secret: process.env.QUICKBOOKS_CLIENT_SECRET!,
      },
      auth: {
        tokenHost: 'https://oauth.platform.intuit.com',
        tokenPath: '/oauth2/v1/tokens/bearer',
        authorizeHost: 'https://appcenter.intuit.com',
        authorizePath: '/connect/oauth2',
      },
    });
  }

  /**
   * Create journal entry for capital call
   */
  async createJournalEntry(params: {
    capitalCallId: string;
    organizationId: string;
  }) {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.capitalCallId },
    });

    const qbConnection = await db.accountingConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: params.organizationId,
          provider: 'QUICKBOOKS',
        },
      },
    });

    if (!qbConnection) {
      throw new Error('QuickBooks not connected');
    }

    // Get access token
    const accessToken = await this.getAccessToken(qbConnection);

    // Create journal entry
    const journalEntry = {
      Line: [
        {
          Amount: capitalCall!.amountDue,
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: {
            AccountRef: {
              value: qbConnection.config.capitalCallsAccountId, // Debit: Capital Calls Receivable
            },
            PostingType: 'Debit',
          },
        },
        {
          Amount: capitalCall!.amountDue,
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: {
            AccountRef: {
              value: qbConnection.config.investorEquityAccountId, // Credit: Investor Equity
            },
            PostingType: 'Credit',
          },
        },
      ],
      TxnDate: capitalCall!.dueDate.toISOString().split('T')[0],
      PrivateNote: `Capital Call: ${capitalCall!.fundName} - ${capitalCall!.id}`,
    };

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${qbConnection.realmId}/journalentry`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(journalEntry),
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Store reference
    await db.accountingTransaction.create({
      data: {
        capitalCallId: params.capitalCallId,
        provider: 'QUICKBOOKS',
        externalId: result.JournalEntry.Id,
        type: 'JOURNAL_ENTRY',
        amount: capitalCall!.amountDue,
        status: 'SYNCED',
      },
    });

    return result;
  }

  /**
   * Reconcile payment
   */
  async recordPayment(params: {
    paymentId: string;
    organizationId: string;
  }) {
    const payment = await db.payment.findUnique({
      where: { id: params.paymentId },
      include: { capitalCall: true },
    });

    const qbConnection = await db.accountingConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: params.organizationId,
          provider: 'QUICKBOOKS',
        },
      },
    });

    const accessToken = await this.getAccessToken(qbConnection!);

    // Create deposit
    const deposit = {
      Line: [
        {
          Amount: payment!.amount,
          DetailType: 'DepositLineDetail',
          DepositLineDetail: {
            AccountRef: {
              value: qbConnection!.config.bankAccountId, // Bank account
            },
            Entity: {
              value: payment!.capitalCall.investorAccount,
              type: 'Customer',
            },
          },
        },
      ],
      TxnDate: payment!.paidAt.toISOString().split('T')[0],
      PrivateNote: `Payment for Capital Call ${payment!.capitalCallId}`,
    };

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${qbConnection!.realmId}/deposit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deposit),
      }
    );

    const result = await response.json();

    await db.accountingTransaction.create({
      data: {
        capitalCallId: payment!.capitalCallId,
        provider: 'QUICKBOOKS',
        externalId: result.Deposit.Id,
        type: 'DEPOSIT',
        amount: payment!.amount,
        status: 'SYNCED',
      },
    });

    return result;
  }

  private async getAccessToken(connection: any): Promise<string> {
    // Check if token expired
    const expiresAt = new Date(connection.expiresAt);
    if (expiresAt > new Date()) {
      return connection.accessToken;
    }

    // Refresh token
    const tokenResponse = await this.oauth2Client.refreshToken.refresh({
      refresh_token: connection.refreshToken,
    });

    // Update connection
    await db.accountingConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      },
    });

    return tokenResponse.access_token;
  }
}
```

**Task INT-EXP-002: DocuSign Integration**
```typescript
// lib/integrations/docusign.ts

import docusign from 'docusign-esign';

export class DocuSignService {
  private apiClient: docusign.ApiClient;

  constructor() {
    this.apiClient = new docusign.ApiClient();
    this.apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH!);
    this.apiClient.setOAuthBasePath(process.env.DOCUSIGN_OAUTH_BASE_PATH!);
  }

  /**
   * Send capital call for signature
   */
  async sendForSignature(params: {
    capitalCallId: string;
    signers: Array<{
      email: string;
      name: string;
      role: string;
    }>;
  }) {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.capitalCallId },
      include: { document: true },
    });

    // Get access token
    const accessToken = await this.getAccessToken();

    // Get account ID
    const userInfo = await this.apiClient.getUserInfo(accessToken);
    const accountId = userInfo.accounts[0].accountId;

    // Create envelope
    const envelopesApi = new docusign.EnvelopesApi(this.apiClient);

    const envelope = new docusign.EnvelopeDefinition();
    envelope.emailSubject = `Please Sign: ${capitalCall!.fundName} Capital Call`;
    envelope.status = 'sent';

    // Add document
    const document = new docusign.Document();
    document.documentBase64 = await this.getDocumentBase64(capitalCall!.document.fileUrl);
    document.name = capitalCall!.document.fileName;
    document.fileExtension = 'pdf';
    document.documentId = '1';

    envelope.documents = [document];

    // Add signers
    const signersList = params.signers.map((signer, index) => {
      const s = new docusign.Signer();
      s.email = signer.email;
      s.name = signer.name;
      s.recipientId = String(index + 1);
      s.routingOrder = String(index + 1);

      // Add signature tab
      s.tabs = new docusign.Tabs();
      s.tabs.signHereTabs = [
        {
          anchorString: '/sig/',
          anchorXOffset: '10',
          anchorYOffset: '10',
        },
      ];

      return s;
    });

    envelope.recipients = new docusign.Recipients();
    envelope.recipients.signers = signersList;

    // Send envelope
    const result = await envelopesApi.createEnvelope(accountId, {
      envelopeDefinition: envelope,
    });

    // Store envelope reference
    await db.signatureRequest.create({
      data: {
        capitalCallId: params.capitalCallId,
        provider: 'DOCUSIGN',
        envelopeId: result.envelopeId!,
        status: 'SENT',
        signers: params.signers.map(s => s.email),
      },
    });

    return result;
  }

  /**
   * Check signature status
   */
  async checkStatus(envelopeId: string) {
    const accessToken = await this.getAccessToken();
    const userInfo = await this.apiClient.getUserInfo(accessToken);
    const accountId = userInfo.accounts[0].accountId;

    const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
    const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);

    // Update status
    await db.signatureRequest.update({
      where: { envelopeId },
      data: {
        status: envelope.status?.toUpperCase() || 'UNKNOWN',
        completedAt: envelope.status === 'completed' ? new Date() : null,
      },
    });

    return envelope;
  }

  private async getAccessToken(): Promise<string> {
    // OAuth flow to get JWT token
    const jwtToken = await this.apiClient.requestJWTUserToken(
      process.env.DOCUSIGN_INTEGRATION_KEY!,
      process.env.DOCUSIGN_USER_ID!,
      ['signature', 'impersonation'],
      Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY!),
      3600
    );

    return jwtToken.body.access_token;
  }

  private async getDocumentBase64(fileUrl: string): Promise<string> {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
```

**Task INT-EXP-003: Webhook Marketplace**
```typescript
// app/api/webhooks/marketplace/route.ts

import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();

  const webhook = await db.webhookEndpoint.create({
    data: {
      userId,
      url: body.url,
      events: body.events, // ['capital_call.approved', 'payment.received']
      enabled: true,
      secret: crypto.randomBytes(32).toString('hex'),
    },
  });

  return Response.json(webhook);
}

// Trigger webhooks on events
export async function triggerWebhooks(event: {
  type: string;
  data: any;
  userId: string;
}) {
  const webhooks = await db.webhookEndpoint.findMany({
    where: {
      userId: event.userId,
      enabled: true,
      events: { has: event.type },
    },
  });

  for (const webhook of webhooks) {
    try {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(event))
        .digest('hex');

      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Clearway-Signature': signature,
          'X-Clearway-Event': event.type,
        },
        body: JSON.stringify(event),
      });

      await db.webhookDelivery.create({
        data: {
          webhookEndpointId: webhook.id,
          eventType: event.type,
          status: 'SUCCESS',
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      await db.webhookDelivery.create({
        data: {
          webhookEndpointId: webhook.id,
          eventType: event.type,
          status: 'FAILED',
          error: error.message,
          deliveredAt: new Date(),
        },
      });
    }
  }
}
```

## Database Schema Additions

```prisma
model AccountingConnection {
  id             String   @id @default(cuid())
  organizationId String
  provider       String   // QUICKBOOKS, XERO, NETSUITE

  accessToken    String
  refreshToken   String
  realmId        String?
  expiresAt      DateTime

  config         Json     // Account mappings

  createdAt      DateTime @default(now())

  @@unique([organizationId, provider])
}

model AccountingTransaction {
  id             String   @id @default(cuid())
  capitalCallId  String
  provider       String
  externalId     String
  type           String   // JOURNAL_ENTRY, DEPOSIT

  amount         Decimal  @db.Decimal(15, 2)
  status         String

  createdAt      DateTime @default(now())

  @@index([capitalCallId])
}

model SignatureRequest {
  id             String   @id @default(cuid())
  capitalCallId  String
  provider       String
  envelopeId     String   @unique

  status         String
  signers        String[]

  completedAt    DateTime?
  createdAt      DateTime @default(now())

  @@index([capitalCallId])
}

model WebhookEndpoint {
  id        String   @id @default(cuid())
  userId    String
  url       String
  events    String[] // Event types to listen to
  secret    String

  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())

  deliveries WebhookDelivery[]

  @@index([userId])
}

model WebhookDelivery {
  id               String   @id @default(cuid())
  webhookEndpointId String
  webhook          WebhookEndpoint @relation(fields: [webhookEndpointId], references: [id])

  eventType        String
  status           String   // SUCCESS, FAILED
  error            String?

  deliveredAt      DateTime

  @@index([webhookEndpointId])
  @@index([deliveredAt(sort: Desc)])
}
```

---

**Integration Expansion Agent ready to connect Clearway with accounting, banking, document signing, and automation platforms.**

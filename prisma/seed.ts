// Clearway Database Seed Script
// Database Agent - Task DB-005

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@clearway.com' },
    update: {},
    create: {
      email: 'test@clearway.com',
      name: 'Test User',
      clerkId: 'test_clerk_id',
    },
  });

  console.log('✅ Created user:', user.id);

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-ria' },
    update: {},
    create: {
      name: 'Demo RIA Firm',
      slug: 'demo-ria',
    },
  });

  console.log('✅ Created organization:', organization.id);

  // Update user with organization
  await prisma.user.update({
    where: { id: user.id },
    data: { organizationId: organization.id },
  });

  console.log('✅ Linked user to organization');

  // Create test documents with capital calls
  const capitalCalls = [
    {
      fundName: 'Apollo Fund XI',
      amountDue: 250000,
      dueDate: new Date('2025-12-15'),
      bankName: 'JPMorgan Chase',
      accountNumber: 'XXXXX1234',
      routingNumber: '021000021',
      wireReference: 'APOLLO-XI-CC-001',
      fileName: 'apollo-capital-call-q4-2025.pdf',
    },
    {
      fundName: 'Blackstone Real Estate Fund VII',
      amountDue: 500000,
      dueDate: new Date('2025-12-20'),
      bankName: 'Bank of America',
      accountNumber: 'XXXXX5678',
      routingNumber: '026009593',
      wireReference: 'BX-REFVII-CC-042',
      fileName: 'blackstone-capital-call-december.pdf',
    },
    {
      fundName: 'KKR Global Impact Fund',
      amountDue: 150000,
      dueDate: new Date('2026-01-10'),
      bankName: 'Wells Fargo',
      accountNumber: 'XXXXX9012',
      routingNumber: '121000248',
      wireReference: 'KKR-GIF-CC-018',
      fileName: 'kkr-capital-call-jan-2026.pdf',
    },
    {
      fundName: 'Carlyle Partners VIII',
      amountDue: 350000,
      dueDate: new Date('2026-01-15'),
      bankName: 'Citibank',
      accountNumber: 'XXXXX3456',
      routingNumber: '021000089',
      wireReference: 'CG-P8-CC-023',
      fileName: 'carlyle-capital-call-q1.pdf',
    },
    {
      fundName: 'TPG Growth V',
      amountDue: 200000,
      dueDate: new Date('2026-01-25'),
      bankName: 'Goldman Sachs',
      accountNumber: 'XXXXX7890',
      routingNumber: '021001088',
      wireReference: 'TPG-GR5-CC-015',
      fileName: 'tpg-growth-capital-call.pdf',
    },
  ];

  for (const [index, call] of capitalCalls.entries()) {
    const { fileName, ...callData } = call;

    // Check if document already exists
    const existingDoc = await prisma.document.findFirst({
      where: {
        fileName,
        userId: user.id,
      },
    });

    if (existingDoc) {
      console.log(`⏭️  Skipping existing document: ${fileName}`);
      continue;
    }

    const document = await prisma.document.create({
      data: {
        fileName,
        fileUrl: `https://demo.clearway.app/documents/${fileName}`,
        fileSize: 1024000 + index * 1000,
        mimeType: 'application/pdf',
        userId: user.id,
        organizationId: organization.id,
        status: 'APPROVED',
        capitalCall: {
          create: {
            ...callData,
            userId: user.id,
            status: 'APPROVED',
            investorEmail: user.email,
            confidenceScores: {
              fundName: 0.95,
              amountDue: 0.98,
              dueDate: 0.92,
              bankName: 0.90,
              wireReference: 0.88,
            },
            rawExtraction: {
              extractedAt: new Date().toISOString(),
              model: 'gpt-4o-mini',
              processingTime: 2500 + index * 100,
            },
          },
        },
      },
    });

    console.log(`✅ Created document with capital call: ${document.fileName}`);
  }

  // Create some pending documents (not yet processed)
  const pendingDoc = await prisma.document.create({
    data: {
      fileName: 'new-capital-call-pending.pdf',
      fileUrl: 'https://demo.clearway.app/documents/new-capital-call-pending.pdf',
      fileSize: 1050000,
      mimeType: 'application/pdf',
      userId: user.id,
      organizationId: organization.id,
      status: 'PENDING',
    },
  });

  console.log(`✅ Created pending document: ${pendingDoc.fileName}`);

  // Create a document in review status
  const reviewDoc = await prisma.document.create({
    data: {
      fileName: 'capital-call-needs-review.pdf',
      fileUrl: 'https://demo.clearway.app/documents/capital-call-needs-review.pdf',
      fileSize: 980000,
      mimeType: 'application/pdf',
      userId: user.id,
      organizationId: organization.id,
      status: 'REVIEW',
      capitalCall: {
        create: {
          fundName: 'Vista Equity Partners Fund VIII',
          amountDue: 425000,
          dueDate: new Date('2026-02-01'),
          bankName: 'Morgan Stanley',
          accountNumber: 'XXXXX4567',
          routingNumber: '021000018',
          wireReference: 'VISTA-F8-CC-007',
          userId: user.id,
          status: 'PENDING_REVIEW',
          investorEmail: user.email,
          confidenceScores: {
            fundName: 0.85,
            amountDue: 0.88,
            dueDate: 0.75,
          },
        },
      },
    },
  });

  console.log(`✅ Created review document: ${reviewDoc.fileName}`);

  // Create fund administrators
  const fundAdmins = [
    {
      name: 'SS&C Technologies',
      slug: 'ssc-technologies',
      apiKey: 'fa_ssc_demo_key_' + Math.random().toString(36).substring(7),
      contactEmail: 'api@ssctech.com',
      website: 'https://www.ssctech.com',
    },
    {
      name: 'Citco Fund Services',
      slug: 'citco',
      apiKey: 'fa_citco_demo_key_' + Math.random().toString(36).substring(7),
      contactEmail: 'api@citco.com',
      website: 'https://www.citco.com',
    },
    {
      name: 'Alter Domus',
      slug: 'alter-domus',
      apiKey: 'fa_alterdomus_demo_key_' + Math.random().toString(36).substring(7),
      contactEmail: 'api@alterdomus.com',
      website: 'https://www.alterdomus.com',
    },
  ];

  for (const admin of fundAdmins) {
    const fundAdmin = await prisma.fundAdministrator.upsert({
      where: { slug: admin.slug },
      update: {},
      create: admin,
    });

    console.log(`✅ Created fund administrator: ${fundAdmin.name}`);
  }

  // ============================================
  // PHASE 2: Payment Processing
  // ============================================
  console.log('\n💰 Seeding Phase 2: Payment Processing...');

  // Create some payments for approved capital calls
  const approvedCalls = await prisma.capitalCall.findMany({
    where: { status: 'APPROVED' },
    take: 3,
  });

  for (const call of approvedCalls) {
    const payment = await prisma.payment.create({
      data: {
        capitalCallId: call.id,
        userId: user.id,
        amount: call.amountDue,
        currency: 'USD',
        paidAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        paymentMethod: ['WIRE', 'ACH', 'CHECK'][Math.floor(Math.random() * 3)],
        status: 'COMPLETED',
        reference: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      },
    });

    console.log(`   ✅ Created payment: ${payment.id}`);
  }

  // Create bank account
  const bankAccount = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      plaidAccessToken: 'access-sandbox-encrypted-token',
      plaidAccountId: 'plaid-account-demo-123',
      accountName: 'Business Checking',
      accountMask: '4567',
      accountType: 'CHECKING',
      status: 'ACTIVE',
    },
  });

  console.log(`   ✅ Created bank account: ${bankAccount.id}`);

  // ============================================
  // PHASE 2: Fund Admin Connections
  // ============================================
  console.log('\n🔗 Seeding Phase 2: Fund Admin Connections...');

  const fundAdminConnection = await prisma.fundAdminConnection.create({
    data: {
      organizationId: organization.id,
      administrator: 'SSC_GENEVA',
      accountId: 'ORG-' + organization.slug.toUpperCase(),
      credentials: {
        apiKey: 'encrypted_api_key_demo',
        apiSecret: 'encrypted_api_secret_demo',
      },
      syncEnabled: true,
      status: 'ACTIVE',
      lastSyncAt: new Date(),
      lastSyncStatus: 'SUCCESS',
    },
  });

  console.log(`   ✅ Created fund admin connection: ${fundAdminConnection.id}`);

  // Create investor mapping
  const investorMapping = await prisma.investorMapping.create({
    data: {
      fundAdministrator: 'SSC_GENEVA',
      externalInvestorId: 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      userId: user.id,
      investorName: user.name || 'Test User',
      email: user.email,
      commitment: 5000000,
    },
  });

  console.log(`   ✅ Created investor mapping: ${investorMapping.id}`);

  // Create fund mapping
  const fundMapping = await prisma.fundMapping.create({
    data: {
      fundAdministrator: 'SSC_GENEVA',
      externalFundCode: 'APO-XI',
      fundName: 'Apollo Fund XI',
      fundType: 'PRIVATE_EQUITY',
      vintage: 2024,
    },
  });

  console.log(`   ✅ Created fund mapping: ${fundMapping.id}`);

  // ============================================
  // PHASE 2: Organization Members & Roles
  // ============================================
  console.log('\n👥 Seeding Phase 2: Organization Members & Roles...');

  // Create custom role
  const adminRole = await prisma.organizationRole.create({
    data: {
      organizationId: organization.id,
      name: 'Admin',
      permissions: [
        'capital_calls:*',
        'documents:*',
        'users:*',
        'settings:*',
        'integrations:*',
      ],
      description: 'Full administrative access',
    },
  });

  console.log(`   ✅ Created organization role: ${adminRole.name}`);

  // Add user as organization member
  const orgMember = await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: 'Admin',
      permissions: adminRole.permissions,
    },
  });

  console.log(`   ✅ Created organization member: ${orgMember.id}`);

  // Create organization invite
  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: organization.id,
      email: 'invited-user@example.com',
      role: 'Viewer',
      invitedBy: user.id,
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`   ✅ Created organization invite: ${invite.email}`);

  // ============================================
  // PHASE 2: Audit Logs
  // ============================================
  console.log('\n🔒 Seeding Phase 2: Audit Logs...');

  const auditActions = [
    { action: 'USER_LOGIN', securityLevel: 'LOW' },
    { action: 'CAPITAL_CALL_CREATED', securityLevel: 'MEDIUM' },
    { action: 'PAYMENT_PROCESSED', securityLevel: 'HIGH' },
    { action: 'DOCUMENT_DOWNLOADED', securityLevel: 'MEDIUM' },
    { action: 'SETTINGS_UPDATED', securityLevel: 'HIGH' },
  ];

  for (const auditAction of auditActions) {
    await prisma.auditLog.create({
      data: {
        action: auditAction.action,
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        securityLevel: auditAction.securityLevel,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'seed_script',
        },
      },
    });
  }

  console.log(`   ✅ Created ${auditActions.length} audit log entries`);

  // ============================================
  // PHASE 2: Scheduled Reports
  // ============================================
  console.log('\n📊 Seeding Phase 2: Scheduled Reports...');

  const scheduledReport = await prisma.scheduledReport.create({
    data: {
      userId: user.id,
      name: 'Monthly Capital Calls Summary',
      config: {
        reportType: 'CAPITAL_CALLS_SUMMARY',
        dateRange: 'LAST_MONTH',
        includeCharts: true,
        format: 'PDF',
      },
      schedule: 'MONTHLY',
      recipients: [user.email, 'finance@example.com'],
      active: true,
    },
  });

  console.log(`   ✅ Created scheduled report: ${scheduledReport.name}`);

  // Create report execution
  const reportExecution = await prisma.reportExecution.create({
    data: {
      scheduledReportId: scheduledReport.id,
      recipientCount: 2,
      status: 'SUCCESS',
    },
  });

  console.log(`   ✅ Created report execution: ${reportExecution.id}`);

  // ============================================
  // PHASE 2: Webhook Endpoints
  // ============================================
  console.log('\n🪝 Seeding Phase 2: Webhook Endpoints...');

  const webhookEndpoint = await prisma.webhookEndpoint.create({
    data: {
      userId: user.id,
      url: 'https://api.example.com/webhooks/clearway',
      events: ['capital_call.created', 'capital_call.paid', 'document.uploaded'],
      secret: 'whsec_' + Math.random().toString(36).substring(2, 25),
      enabled: true,
    },
  });

  console.log(`   ✅ Created webhook endpoint: ${webhookEndpoint.url}`);

  // Create webhook deliveries
  for (let i = 0; i < 3; i++) {
    await prisma.webhookDelivery.create({
      data: {
        webhookEndpointId: webhookEndpoint.id,
        eventType: 'capital_call.created',
        status: 'SUCCESS',
        statusCode: 200,
        payload: {
          event: 'capital_call.created',
          data: { id: 'test-id-' + i },
        },
      },
    });
  }

  console.log(`   ✅ Created 3 webhook deliveries`);

  // ============================================
  // PHASE 2: Accounting Connection (Demo)
  // ============================================
  console.log('\n📚 Seeding Phase 2: Accounting Connection...');

  const accountingConnection = await prisma.accountingConnection.create({
    data: {
      organizationId: organization.id,
      provider: 'QUICKBOOKS',
      accessToken: 'encrypted_access_token_demo',
      refreshToken: 'encrypted_refresh_token_demo',
      realmId: 'QB-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      config: {
        accountMappings: {
          capitalCallsAccount: '1000',
          revenueAccount: '4000',
        },
      },
    },
  });

  console.log(`   ✅ Created accounting connection: ${accountingConnection.provider}`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📊 Summary:');
  console.log('   - Users: 1');
  console.log('   - Organizations: 1');
  console.log('   - Documents: 7');
  console.log('   - Capital Calls: 6');
  console.log('   - Fund Administrators: 3');
  console.log('\n   Phase 2 Additions:');
  console.log('   - Payments: 3');
  console.log('   - Bank Accounts: 1');
  console.log('   - Fund Admin Connections: 1');
  console.log('   - Investor Mappings: 1');
  console.log('   - Fund Mappings: 1');
  console.log('   - Organization Members: 1');
  console.log('   - Organization Roles: 1');
  console.log('   - Organization Invites: 1');
  console.log('   - Audit Logs: 5');
  console.log('   - Scheduled Reports: 1');
  console.log('   - Report Executions: 1');
  console.log('   - Webhook Endpoints: 1');
  console.log('   - Webhook Deliveries: 3');
  console.log('   - Accounting Connections: 1');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

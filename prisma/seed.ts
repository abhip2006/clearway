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

  console.log('\n🎉 Seeding complete!');
  console.log('\n📊 Summary:');
  console.log('   - Users: 1');
  console.log('   - Organizations: 1');
  console.log('   - Documents: 7');
  console.log('   - Capital Calls: 6');
  console.log('   - Fund Administrators: 3');
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

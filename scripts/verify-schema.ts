#!/usr/bin/env tsx
// Schema Verification Script
// Database Migration Agent
//
// Verifies that all Phase 2 tables and indexes are properly created

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableCheck {
  table: string;
  exists: boolean;
  category: string;
}

const EXPECTED_TABLES = {
  'Core MVP': [
    'User',
    'Organization',
    'Document',
    'CapitalCall',
  ],
  'Payment Processing': [
    'Payment',
    'BankAccount',
    'StatementReconciliation',
  ],
  'Fund Administrator': [
    'FundAdministrator',
    'FundAdminConnection',
    'InvestorMapping',
    'FundMapping',
    'FundAdminSync',
    'UnmappedInvestor',
    'WebhookLog',
  ],
  'Accounting Integration': [
    'AccountingConnection',
    'AccountingTransaction',
  ],
  'Document Signatures': [
    'SignatureRequest',
  ],
  'Webhook Marketplace': [
    'WebhookEndpoint',
    'WebhookDelivery',
  ],
  'Security & Compliance': [
    'AuditLog',
    'LegalHold',
    'DataProcessingAgreement',
  ],
  'Multi-Tenant': [
    'OrganizationMember',
    'OrganizationRole',
    'OrganizationInvite',
    'SSOConnection',
  ],
  'Analytics & Reporting': [
    'ScheduledReport',
    'ReportExecution',
  ],
};

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      );`
    );
    return result[0]?.exists || false;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

async function checkMaterializedViews(): Promise<{ name: string; exists: boolean }[]> {
  const views = ['monthly_call_summary', 'fund_performance_summary'];
  const results = [];

  for (const view of views) {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (
          SELECT FROM pg_matviews
          WHERE schemaname = 'public'
          AND matviewname = '${view}'
        );`
      );
      results.push({ name: view, exists: result[0]?.exists || false });
    } catch (error) {
      results.push({ name: view, exists: false });
    }
  }

  return results;
}

async function getTableStats(): Promise<void> {
  try {
    const result = await prisma.$queryRaw<Array<{
      tablename: string;
      row_count: bigint;
    }>>`
      SELECT
        schemaname||'.'||tablename as tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 10;
    `;

    console.log('\n📊 Top 10 Tables by Row Count:\n');
    for (const row of result) {
      console.log(`   ${row.tablename}: ${row.row_count.toString()} rows`);
    }
  } catch (error) {
    console.error('   Error fetching table stats:', error);
  }
}

async function main() {
  console.log('🔍 Clearway Schema Verification Tool\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Connect to database
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Check all tables by category
  const results: TableCheck[] = [];
  let totalTables = 0;
  let existingTables = 0;

  for (const [category, tables] of Object.entries(EXPECTED_TABLES)) {
    console.log(`📁 ${category}\n`);

    for (const table of tables) {
      const exists = await checkTableExists(table);
      results.push({ table, exists, category });
      totalTables++;

      if (exists) {
        existingTables++;
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (NOT FOUND)`);
      }
    }

    console.log();
  }

  // Check materialized views
  console.log('🗂️  Materialized Views\n');
  const views = await checkMaterializedViews();
  for (const view of views) {
    if (view.exists) {
      console.log(`   ✅ ${view.name}`);
    } else {
      console.log(`   ❌ ${view.name} (NOT FOUND)`);
    }
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Verification Summary\n');
  console.log(`   Total Expected Tables: ${totalTables}`);
  console.log(`   Tables Found: ${existingTables}`);
  console.log(`   Tables Missing: ${totalTables - existingTables}`);
  console.log(`   Materialized Views: ${views.filter(v => v.exists).length}/${views.length}`);

  const completionRate = Math.round((existingTables / totalTables) * 100);
  console.log(`\n   Schema Completion: ${completionRate}%\n`);

  // Get table statistics
  await getTableStats();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Status
  if (existingTables === totalTables && views.every(v => v.exists)) {
    console.log('✅ Schema verification PASSED!');
    console.log('   All Phase 2 tables and views are present.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Schema verification INCOMPLETE');
    console.log('   Some tables or views are missing.');
    console.log('   Run: npm run db:migrate:phase2\n');
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

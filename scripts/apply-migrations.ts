#!/usr/bin/env tsx
// Clearway Database Migration Script
// Database Migration Agent
//
// Safely applies all pending database migrations in the correct order
// Usage: npm run migrate or tsx scripts/apply-migrations.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const prisma = new PrismaClient();

// Migration order - IMPORTANT: Run in this specific order
const MIGRATION_ORDER = [
  'integration_expansion_phase2.sql',
  'phase2_complete_schema.sql',
  'add_materialized_views.sql',
];

interface MigrationResult {
  file: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
}

class MigrationRunner {
  private results: MigrationResult[] = [];
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  }

  async run(dryRun: boolean = false): Promise<void> {
    console.log('🗄️  Clearway Database Migration Tool\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Pre-flight checks
    await this.preFlightChecks();

    // Backup reminder
    this.displayBackupReminder();

    if (!dryRun) {
      const proceed = await this.confirmProceed();
      if (!proceed) {
        console.log('\n❌ Migration cancelled by user');
        process.exit(0);
      }
    }

    console.log('\n📋 Running migrations...\n');

    // Run each migration in order
    for (const migrationFile of MIGRATION_ORDER) {
      await this.runMigration(migrationFile, dryRun);
    }

    // Display results
    this.displayResults();

    // Post-migration verification
    if (!dryRun) {
      await this.verifySchema();
    }
  }

  private async preFlightChecks(): Promise<void> {
    console.log('✅ Pre-flight checks\n');

    // Check database connection
    try {
      await prisma.$connect();
      console.log('   ✓ Database connection successful');
    } catch (error) {
      console.error('   ✗ Database connection failed:', error);
      process.exit(1);
    }

    // Check migration files exist
    let allFilesExist = true;
    for (const file of MIGRATION_ORDER) {
      const filePath = path.join(this.migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        console.error(`   ✗ Migration file not found: ${file}`);
        allFilesExist = false;
      } else {
        console.log(`   ✓ Found migration: ${file}`);
      }
    }

    if (!allFilesExist) {
      console.error('\n❌ Missing migration files. Exiting.');
      process.exit(1);
    }

    console.log('\n   All pre-flight checks passed!\n');
  }

  private displayBackupReminder(): void {
    console.log('⚠️  IMPORTANT: Backup Reminder\n');
    console.log('   Before running migrations on production:');
    console.log('   1. Create a full database backup');
    console.log('   2. Test migrations on a staging environment');
    console.log('   3. Plan a maintenance window');
    console.log('   4. Have a rollback plan ready\n');
    console.log('   Backup command (PostgreSQL):');
    console.log('   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql\n');
  }

  private async confirmProceed(): Promise<boolean> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  Are you ready to proceed with the migration?');
    console.log('   This will modify your database schema.\n');

    // In automated environments, check for CONFIRM_MIGRATION env var
    if (process.env.CONFIRM_MIGRATION === 'yes') {
      console.log('   ✓ Confirmed via CONFIRM_MIGRATION=yes\n');
      return true;
    }

    // For interactive use
    console.log('   Set CONFIRM_MIGRATION=yes to auto-confirm\n');
    console.log('   Press Ctrl+C to cancel, or continue...');

    // Simple delay to allow user to read and cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    return true;
  }

  private async runMigration(file: string, dryRun: boolean): Promise<void> {
    const startTime = Date.now();
    console.log(`📄 ${file}`);

    try {
      const filePath = path.join(this.migrationsDir, file);
      const sql = await readFile(filePath, 'utf-8');

      if (dryRun) {
        console.log('   ℹ️  DRY RUN - SQL loaded but not executed');
        console.log(`   ℹ️  Would execute ${sql.split(';').length} statements\n`);
        this.results.push({
          file,
          status: 'skipped',
        });
        return;
      }

      // Execute the migration
      await prisma.$executeRawUnsafe(sql);

      const duration = Date.now() - startTime;
      console.log(`   ✓ Migration completed in ${duration}ms\n`);

      this.results.push({
        file,
        status: 'success',
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`   ✗ Migration failed: ${errorMessage}\n`);

      this.results.push({
        file,
        status: 'failed',
        error: errorMessage,
        duration,
      });

      // Stop on first failure
      throw new Error(`Migration failed: ${file}`);
    }
  }

  private displayResults(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Migration Results\n');

    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    console.log(`   Total migrations: ${this.results.length}`);
    console.log(`   ✓ Successful: ${successful}`);
    console.log(`   ✗ Failed: ${failed}`);
    console.log(`   ⊘ Skipped: ${skipped}\n`);

    // Show details
    for (const result of this.results) {
      const icon = result.status === 'success' ? '✓' :
                   result.status === 'failed' ? '✗' : '⊘';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`   ${icon} ${result.file}${duration}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  private async verifySchema(): Promise<void> {
    console.log('🔍 Verifying schema...\n');

    try {
      // Check that key tables exist
      const tablesToCheck = [
        'User',
        'Organization',
        'Document',
        'CapitalCall',
        'Payment',
        'BankAccount',
        'FundAdminConnection',
        'InvestorMapping',
        'AuditLog',
        'OrganizationMember',
        'SSOConnection',
        'ScheduledReport',
      ];

      for (const table of tablesToCheck) {
        const result = await prisma.$queryRawUnsafe(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = '${table}'
          );`
        );

        if (Array.isArray(result) && result[0]?.exists) {
          console.log(`   ✓ Table verified: ${table}`);
        } else {
          console.warn(`   ⚠️  Table not found: ${table}`);
        }
      }

      console.log('\n   Schema verification complete!\n');
    } catch (error) {
      console.error('   ⚠️  Schema verification failed:', error);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const runner = new MigrationRunner();

  try {
    await runner.run(dryRun);
    console.log('✅ Migration process completed successfully!\n');

    if (!dryRun) {
      console.log('📝 Next steps:\n');
      console.log('   1. Run: npm run prisma:generate');
      console.log('   2. Run: npm run seed (optional)');
      console.log('   3. Restart your application\n');
    } else {
      console.log('💡 To apply migrations, run without --dry-run flag\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration process failed!\n');
    console.error(error);
    console.log('\n📋 Rollback instructions:\n');
    console.log('   1. Restore from backup:');
    console.log('      psql $DATABASE_URL < backup_file.sql\n');
    console.log('   2. Or manually rollback changes\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main();

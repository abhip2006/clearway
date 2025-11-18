/**
 * Fund Administrator Integration - Main Exports
 * Central export point for all fund admin integration components
 */

// SS&C Geneva
export { SSCAuthClient } from './ssc/auth';
export { SSCCapitalCallSyncService } from './ssc/capital-calls';
export { InvestorRosterSyncService } from './ssc/investor-sync';

// Carta
export { CartaFundAdminClient } from './carta/client';
export type {
  CartaCapitalCallParams,
  CartaAcknowledgement,
  CartaPayment,
} from './carta/client';

// Orchestrator
export {
  FundAdminOrchestrator,
  fundAdminSyncQueue,
  createSyncWorker,
} from './orchestrator';
export type { SyncJobData } from './orchestrator';

// Types
export * from './types';

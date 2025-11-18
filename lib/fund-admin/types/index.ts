/**
 * Fund Administrator Integration Types
 * Shared types and schemas for fund admin integrations
 */

import { z } from 'zod';

// ============================================
// FUND ADMINISTRATOR ENUMS
// ============================================

export enum FundAdministrator {
  SSC_GENEVA = 'SSC_GENEVA',
  CARTA = 'CARTA',
  JUNIPER_SQUARE = 'JUNIPER_SQUARE',
  ALTVIA = 'ALTVIA',
  ALLVUE = 'ALLVUE',
}

export enum SyncType {
  CAPITAL_CALLS = 'CAPITAL_CALLS',
  INVESTORS = 'INVESTORS',
  DISTRIBUTIONS = 'DISTRIBUTIONS',
  NAV_UPDATES = 'NAV_UPDATES',
}

export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
  FAILURE = 'FAILURE',
}

export enum ConnectionStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ERROR = 'ERROR',
}

// ============================================
// SS&C GENEVA SCHEMAS
// ============================================

export const SSCAuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

export const GenevaCapitalCallSchema = z.object({
  call_id: z.string(),
  fund_code: z.string(),
  call_date: z.string().datetime(),
  due_date: z.string().datetime(),
  settlement_date: z.string().datetime(),
  investors: z.array(
    z.object({
      investor_id: z.string(),
      investor_name: z.string(),
      email: z.string().email(),
      amount_called: z.number(),
      currency: z.string().length(3),
      commitment_id: z.string(),
    })
  ),
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

export const GenevaInvestorSchema = z.object({
  investor_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  commitment_amount: z.number(),
  commitment_date: z.string().datetime(),
  entity_type: z.string(),
  tax_id: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string(),
    })
    .optional(),
  contact_person: z
    .object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string(),
    })
    .optional(),
});

// ============================================
// CARTA SCHEMAS
// ============================================

export const CartaCapitalCallSchema = z.object({
  id: z.string(),
  fund_id: z.string(),
  fund_name: z.string(),
  call_number: z.number(),
  call_date: z.string().datetime(),
  due_date: z.string().datetime(),
  settlement_date: z.string().datetime(),
  status: z.enum(['pending', 'settled', 'cancelled']),
  total_amount: z.number(),
  currency: z.string().length(3),
  investors: z.array(
    z.object({
      investor_id: z.string(),
      investor_name: z.string(),
      email: z.string().email(),
      amount_due: z.number(),
      commitment_percentage: z.number(),
    })
  ),
  wire_instructions: z.object({
    bank_name: z.string(),
    account_number: z.string(),
    routing_number: z.string(),
    swift_code: z.string().optional(),
    reference: z.string(),
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CartaInvestorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  entity_type: z.string(),
  commitment_amount: z.number(),
  invested_amount: z.number(),
  status: z.enum(['active', 'inactive', 'pending']),
  tax_id: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CartaWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  created_at: z.string().datetime(),
});

// ============================================
// SYNC RESULT TYPES
// ============================================

export interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ callId: string; error: string }>;
}

export interface InvestorSyncResult {
  new: number;
  updated: number;
  unmapped: number;
}

// ============================================
// TYPE EXPORTS
// ============================================

export type SSCAuthResponse = z.infer<typeof SSCAuthResponseSchema>;
export type GenevaCapitalCall = z.infer<typeof GenevaCapitalCallSchema>;
export type GenevaInvestor = z.infer<typeof GenevaInvestorSchema>;

export type CartaCapitalCall = z.infer<typeof CartaCapitalCallSchema>;
export type CartaInvestor = z.infer<typeof CartaInvestorSchema>;
export type CartaWebhookEvent = z.infer<typeof CartaWebhookEventSchema>;

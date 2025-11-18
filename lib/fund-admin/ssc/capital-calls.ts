/**
 * SS&C Geneva Capital Call Data Ingestion Service
 * Task FA-002: Fetch, map, and create capital call records from Geneva
 */

import axios, { AxiosError } from 'axios';
import { SSCAuthClient } from './auth';
import { db } from '@/lib/db';
import { GenevaCapitalCallSchema, type GenevaCapitalCall, type SyncResult } from '../types';

export class SSCCapitalCallSyncService {
  constructor(
    private authClient: SSCAuthClient,
    private accountId: string
  ) {}

  /**
   * Sync capital calls from Geneva
   * @param since - Optional date to sync capital calls created after
   * @returns Sync statistics (synced, failed, errors)
   */
  async syncCapitalCalls(since?: Date): Promise<SyncResult> {
    try {
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
          timeout: 30000, // 30 second timeout
        }
      );

      const capitalCalls = this.parseCapitalCalls(response.data.data);

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
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({
            callId: call.call_id,
            error: errorMessage,
          });
          console.error(`Failed to process capital call ${call.call_id}:`, error);
        }
      }

      // Log sync results to database
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(
          `Failed to fetch capital calls from Geneva: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`
        );
      }
      throw new Error(`Failed to sync capital calls: ${error}`);
    }
  }

  /**
   * Parse and validate capital calls from Geneva API response
   */
  private parseCapitalCalls(data: unknown): GenevaCapitalCall[] {
    try {
      return data instanceof Array
        ? data.map((item) => GenevaCapitalCallSchema.parse(item))
        : [GenevaCapitalCallSchema.parse(data)];
    } catch (error) {
      console.error('Failed to parse Geneva capital call data:', error);
      throw new Error('Invalid capital call data received from Geneva');
    }
  }

  /**
   * Process a single capital call
   * Maps investors and creates capital call records
   */
  private async processCapitalCall(call: GenevaCapitalCall): Promise<void> {
    // Map Geneva investor IDs to Clearway user IDs
    const investorMappings = await db.investorMapping.findMany({
      where: {
        fundAdministrator: 'SSC_GENEVA',
        externalInvestorId: { in: call.investors.map((i) => i.investor_id) },
      },
      include: {
        user: true,
      },
    });

    const mappingLookup = new Map(
      investorMappings.map((m) => [m.externalInvestorId, m])
    );

    // Resolve fund name
    const fundName = await this.resolveFundName(call.fund_code);

    // Create capital calls for each investor
    const createPromises = call.investors.map(async (investor) => {
      const mapping = mappingLookup.get(investor.investor_id);

      if (!mapping) {
        throw new Error(
          `No user mapping for investor ${investor.investor_id} (${investor.investor_name})`
        );
      }

      // Check if capital call already exists
      const existing = await db.capitalCall.findFirst({
        where: {
          source: 'SSC_GENEVA',
          externalId: `${call.call_id}-${investor.investor_id}`,
        },
      });

      if (existing) {
        console.log(
          `Capital call ${call.call_id} for investor ${investor.investor_id} already exists, skipping`
        );
        return;
      }

      // Create a document record (required by schema)
      const document = await db.document.create({
        data: {
          fileName: `Geneva Capital Call ${call.call_id}`,
          fileUrl: `ssc-geneva://capital-call/${call.call_id}`,
          fileSize: 0,
          mimeType: 'application/json',
          userId: mapping.userId,
          organizationId: mapping.user.organizationId,
          status: 'APPROVED', // Auto-approved from fund admin
        },
      });

      // Create capital call record
      return db.capitalCall.create({
        data: {
          userId: mapping.userId,
          organizationId: mapping.user.organizationId,
          documentId: document.id,
          fundName,
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
          externalId: `${call.call_id}-${investor.investor_id}`,
          rawExtraction: {
            genevaData: call,
            investor: investor,
            syncedAt: new Date().toISOString(),
          },
          confidenceScores: {
            fundName: 1.0,
            amountDue: 1.0,
            dueDate: 1.0,
            wireInstructions: 1.0,
          },
        },
      });
    });

    await Promise.all(createPromises);
  }

  /**
   * Resolve fund name from fund code using mapping table
   */
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

  /**
   * Sync a specific capital call by ID
   */
  async syncCapitalCallById(callId: string): Promise<void> {
    const token = await this.authClient.getAccessToken(this.accountId);

    const response = await axios.get(
      `${process.env.SSC_API_URL}/v2/funds/${this.accountId}/capital-calls/${callId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          include: 'investors,wire_instructions',
        },
        timeout: 30000,
      }
    );

    const call = GenevaCapitalCallSchema.parse(response.data);
    await this.processCapitalCall(call);
  }
}

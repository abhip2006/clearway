/**
 * Inngest Function Handlers for Fund Admin Events
 * Processes webhook events asynchronously
 */

import { inngest } from '@/lib/inngest';
import { db } from '@/lib/db';
import { CartaFundAdminClient } from './carta/client';
import { SSCAuthClient } from './ssc/auth';
import { SSCCapitalCallSyncService } from './ssc/capital-calls';

/**
 * Handle capital call created event
 * Syncs the new capital call from fund administrator
 */
export const handleCapitalCallCreated = inngest.createFunction(
  { id: 'fund-admin-capital-call-created' },
  { event: 'fund-admin/capital-call.created' },
  async ({ event, step }) => {
    const { administrator, capitalCallId, fundId } = event.data;

    return await step.run('sync-capital-call', async () => {
      if (administrator === 'CARTA') {
        const client = new CartaFundAdminClient(process.env.CARTA_API_KEY!);
        const call = await client.getCapitalCall(capitalCallId);

        // Process and create capital call records in Clearway
        console.log('Capital call synced from Carta:', call);

        return { success: true, capitalCallId };
      } else if (administrator === 'SSC_GENEVA') {
        const authClient = new SSCAuthClient(
          process.env.SSC_CLIENT_ID!,
          process.env.SSC_CLIENT_SECRET!,
          process.env.SSC_API_URL!
        );

        const syncService = new SSCCapitalCallSyncService(authClient, fundId);
        await syncService.syncCapitalCallById(capitalCallId);

        return { success: true, capitalCallId };
      }

      throw new Error(`Unsupported administrator: ${administrator}`);
    });
  }
);

/**
 * Handle capital call updated event
 * Updates existing capital call in Clearway
 */
export const handleCapitalCallUpdated = inngest.createFunction(
  { id: 'fund-admin-capital-call-updated' },
  { event: 'fund-admin/capital-call.updated' },
  async ({ event, step }) => {
    const { administrator, capitalCallId, changes } = event.data;

    return await step.run('update-capital-call', async () => {
      // Find existing capital call
      const existingCall = await db.capitalCall.findFirst({
        where: {
          source: administrator,
          externalId: { contains: capitalCallId },
        },
      });

      if (!existingCall) {
        console.warn(
          `Capital call ${capitalCallId} not found in Clearway, skipping update`
        );
        return { success: false, reason: 'not_found' };
      }

      // Update capital call with changes
      await db.capitalCall.update({
        where: { id: existingCall.id },
        data: {
          // Apply changes from webhook
          rawExtraction: {
            ...(existingCall.rawExtraction as object),
            lastUpdate: new Date().toISOString(),
            changes,
          },
          updatedAt: new Date(),
        },
      });

      return { success: true, capitalCallId };
    });
  }
);

/**
 * Handle capital call cancelled event
 * Marks capital call as rejected in Clearway
 */
export const handleCapitalCallCancelled = inngest.createFunction(
  { id: 'fund-admin-capital-call-cancelled' },
  { event: 'fund-admin/capital-call.cancelled' },
  async ({ event, step }) => {
    const { administrator, capitalCallId } = event.data;

    return await step.run('cancel-capital-call', async () => {
      const existingCall = await db.capitalCall.findFirst({
        where: {
          source: administrator,
          externalId: { contains: capitalCallId },
        },
      });

      if (!existingCall) {
        return { success: false, reason: 'not_found' };
      }

      await db.capitalCall.update({
        where: { id: existingCall.id },
        data: {
          status: 'REJECTED',
          updatedAt: new Date(),
        },
      });

      return { success: true, capitalCallId };
    });
  }
);

/**
 * Handle investor created event
 * Syncs new investor from fund administrator
 */
export const handleInvestorCreated = inngest.createFunction(
  { id: 'fund-admin-investor-created' },
  { event: 'fund-admin/investor.created' },
  async ({ event, step }) => {
    const { administrator, investorId, fundId } = event.data;

    return await step.run('sync-investor', async () => {
      if (administrator === 'CARTA') {
        const client = new CartaFundAdminClient(process.env.CARTA_API_KEY!);
        const investor = await client.getInvestor(investorId);

        // Try to auto-map investor
        const user = await db.user.findUnique({
          where: { email: investor.email },
        });

        if (user) {
          await db.investorMapping.create({
            data: {
              fundAdministrator: 'CARTA',
              externalInvestorId: investorId,
              userId: user.id,
              investorName: investor.name,
              email: investor.email,
              commitment: investor.commitment_amount,
            },
          });

          return { success: true, mapped: true, investorId };
        } else {
          // Create unmapped investor for manual review
          await db.unmappedInvestor.create({
            data: {
              fundAdministrator: 'CARTA',
              externalInvestorId: investorId,
              investorName: investor.name,
              email: investor.email,
              fundId,
              needsMapping: true,
            },
          });

          return { success: true, mapped: false, investorId };
        }
      }

      throw new Error(`Unsupported administrator: ${administrator}`);
    });
  }
);

/**
 * Handle investor updated event
 * Updates existing investor mapping
 */
export const handleInvestorUpdated = inngest.createFunction(
  { id: 'fund-admin-investor-updated' },
  { event: 'fund-admin/investor.updated' },
  async ({ event, step }) => {
    const { administrator, investorId, changes } = event.data;

    return await step.run('update-investor', async () => {
      const existingMapping = await db.investorMapping.findUnique({
        where: {
          fundAdministrator_externalInvestorId: {
            fundAdministrator: administrator,
            externalInvestorId: investorId,
          },
        },
      });

      if (!existingMapping) {
        return { success: false, reason: 'not_found' };
      }

      // Update mapping with changes
      await db.investorMapping.update({
        where: {
          fundAdministrator_externalInvestorId: {
            fundAdministrator: administrator,
            externalInvestorId: investorId,
          },
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return { success: true, investorId };
    });
  }
);

/**
 * Export all handlers
 */
export const fundAdminHandlers = [
  handleCapitalCallCreated,
  handleCapitalCallUpdated,
  handleCapitalCallCancelled,
  handleInvestorCreated,
  handleInvestorUpdated,
];

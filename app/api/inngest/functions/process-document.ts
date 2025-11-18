// app/api/inngest/functions/process-document.ts
// Task BE-003: Inngest Document Processing Function

import { inngest } from '@/lib/inngest';
import { extractCapitalCall } from '@/lib/ai/extract';
import { db } from '@/lib/db';

export const processDocument = inngest.createFunction(
  {
    id: 'process-document',
    retries: 3,
  },
  { event: 'document.uploaded' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Update status to PROCESSING
    await step.run('update-status-processing', async () => {
      await db.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });
    });

    // Step 2: Extract capital call data (calls AI/ML Agent's function)
    const extraction = await step.run('extract-data', async () => {
      try {
        return await extractCapitalCall(documentId);
      } catch (error) {
        console.error('Extraction failed:', error);
        throw error;
      }
    });

    // Step 3: Save extraction to database
    await step.run('save-extraction', async () => {
      try {
        await db.capitalCall.create({
          data: {
            documentId,
            userId: extraction.userId,
            fundName: extraction.data.fundName,
            investorEmail: extraction.data.investorEmail,
            investorAccount: extraction.data.investorAccount,
            amountDue: extraction.data.amountDue,
            currency: extraction.data.currency,
            dueDate: extraction.data.dueDate,
            bankName: extraction.data.bankName,
            accountNumber: extraction.data.accountNumber,
            routingNumber: extraction.data.routingNumber,
            wireReference: extraction.data.wireReference,
            confidenceScores: extraction.data.confidenceScores,
            rawExtraction: extraction.data.rawExtraction,
            status: 'PENDING_REVIEW',
          },
        });

        await db.document.update({
          where: { id: documentId },
          data: { status: 'REVIEW' },
        });
      } catch (error) {
        // Mark as failed if DB save fails
        await db.document.update({
          where: { id: documentId },
          data: { status: 'FAILED' },
        });
        throw error;
      }
    });

    return { success: true, documentId };
  }
);

// app/api/inngest/functions/classify-and-route.ts
// Advanced AI Integration - Document Classification and Routing
// AI-ADV-001: Intelligent Document Classification Workflow

import { inngest } from '@/lib/inngest';
import { documentClassifier } from '@/lib/ai/classifier';
import { db } from '@/lib/db';

/**
 * Intelligent document classification and routing function
 * This is an enhancement to the basic document processing workflow
 *
 * Workflow:
 * 1. Classify document type using Claude 3.5 Sonnet
 * 2. Route to appropriate processor based on classification
 * 3. Log classification for analytics
 */
export const classifyAndRouteDocument = inngest.createFunction(
  {
    id: 'classify-and-route-document',
    name: 'Classify and Route Document',
    retries: 2,
  },
  { event: 'document.classify' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Classify document
    const classification = await step.run('classify-document', async () => {
      console.log(`Classifying document ${documentId}...`);
      return await documentClassifier.routeDocument(documentId);
    });

    // Step 2: Log classification result
    await step.run('log-classification', async () => {
      console.log(`Classification complete:`, {
        documentId,
        type: classification.type,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
      });

      // In production, you might log to analytics service
      // await analytics.track('document_classified', {
      //   documentId,
      //   documentType: classification.type,
      //   confidence: classification.confidence,
      // });
    });

    // Step 3: Update document status if classification failed
    if (classification.confidence < 0.75) {
      await step.run('flag-for-review', async () => {
        await db.document.update({
          where: { id: documentId },
          data: { status: 'REVIEW' },
        });
      });
    }

    return {
      success: true,
      documentId,
      classification: {
        type: classification.type,
        confidence: classification.confidence,
        suggestedActions: classification.suggestedActions,
      },
    };
  }
);

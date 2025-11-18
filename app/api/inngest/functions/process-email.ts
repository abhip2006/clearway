// app/api/inngest/functions/process-email.ts
// Advanced AI Integration - Email Parsing
// AI-ADV-003: Intelligent Email Processing for Capital Calls

import { inngest } from '@/lib/inngest';
import { emailParser } from '@/lib/ai/email-parser';
import { db } from '@/lib/db';

/**
 * Email processing function for capital call detection
 * Analyzes incoming emails to automatically identify and extract capital call information
 *
 * Workflow:
 * 1. Parse email for capital call indicators
 * 2. Extract structured data if present
 * 3. Create capital call record or flag attachment for processing
 * 4. Send confirmation notification
 */
export const processCapitalCallEmail = inngest.createFunction(
  {
    id: 'process-capital-call-email',
    name: 'Process Capital Call Email',
    retries: 2,
  },
  { event: 'email.received' },
  async ({ event, step }) => {
    const { emailId, subject, body, from, attachments, userId } = event.data;

    // Step 1: Parse email for capital call information
    const emailAnalysis = await step.run('parse-email', async () => {
      return await emailParser.parseEmailForCapitalCall({
        subject,
        body,
        from,
        attachments: attachments || [],
      });
    });

    // Step 2: Log parsing result
    await step.run('log-parsing-result', async () => {
      console.log(`Email ${emailId} analysis complete:`, {
        hasCapitalCall: emailAnalysis.hasCapitalCall,
        confidence: emailAnalysis.confidence,
        reasoning: emailAnalysis.reasoning,
      });
    });

    // Step 3: Process if capital call detected
    if (emailAnalysis.hasCapitalCall && emailAnalysis.confidence >= 0.75) {
      const result = await step.run('process-capital-call', async () => {
        return await emailParser.processCapitalCallEmail(
          emailId,
          { subject, body, from, attachments: attachments || [] },
          userId
        );
      });

      // Step 4: Send confirmation notification
      if (result.processed) {
        await step.run('send-confirmation', async () => {
          console.log(`Capital call processed from email ${emailId}:`, result);

          // In production, send notification to user
          // await sendEmail({
          //   to: userId,
          //   subject: 'Capital Call Detected',
          //   body: `We've detected a capital call from ${from}. Please review.`
          // });
        });

        // Step 5: Trigger anomaly detection if capital call created
        if (result.capitalCallId) {
          await step.run('trigger-anomaly-detection', async () => {
            await inngest.send({
              name: 'capital-call.created',
              data: { capitalCallId: result.capitalCallId },
            });
          });
        }
      }

      return {
        success: true,
        emailId,
        processed: result.processed,
        capitalCallId: result.capitalCallId,
        documentId: result.documentId,
      };
    }

    return {
      success: true,
      emailId,
      processed: false,
      reason: emailAnalysis.hasCapitalCall
        ? `Confidence too low (${emailAnalysis.confidence})`
        : 'No capital call detected',
    };
  }
);

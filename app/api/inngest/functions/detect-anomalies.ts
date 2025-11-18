// app/api/inngest/functions/detect-anomalies.ts
// Advanced AI Integration - Anomaly Detection
// AI-ADV-002: Anomaly Detection for Capital Calls

import { inngest } from '@/lib/inngest';
import { anomalyDetector } from '@/lib/ai/anomaly-detection';
import { db } from '@/lib/db';

/**
 * Anomaly detection function for capital calls
 * Runs comprehensive checks for:
 * - Amount anomalies (statistical analysis)
 * - Duplicate detection
 * - Fraud indicators
 *
 * Triggered after capital call extraction
 */
export const detectCapitalCallAnomalies = inngest.createFunction(
  {
    id: 'detect-capital-call-anomalies',
    name: 'Detect Capital Call Anomalies',
    retries: 1,
  },
  { event: 'capital-call.created' },
  async ({ event, step }) => {
    const { capitalCallId } = event.data;

    // Step 1: Get capital call data
    const capitalCall = await step.run('fetch-capital-call', async () => {
      const cc = await db.capitalCall.findUnique({
        where: { id: capitalCallId },
      });

      if (!cc) {
        throw new Error(`Capital call ${capitalCallId} not found`);
      }

      return cc;
    });

    // Step 2: Run all anomaly checks
    const anomalies = await step.run('check-anomalies', async () => {
      return await anomalyDetector.checkAllAnomalies({
        id: capitalCall.id,
        fundName: capitalCall.fundName,
        amountDue: capitalCall.amountDue.toNumber(),
        dueDate: capitalCall.dueDate,
        userId: capitalCall.userId,
        bankName: capitalCall.bankName,
        accountNumber: capitalCall.accountNumber,
        wireReference: capitalCall.wireReference,
        routingNumber: capitalCall.routingNumber,
      });
    });

    // Step 3: Log anomaly results
    await step.run('log-anomalies', async () => {
      console.log(`Anomaly detection complete for ${capitalCallId}:`, {
        overallRisk: anomalies.overallRisk,
        shouldFlag: anomalies.shouldFlag,
        amountAnomaly: anomalies.amountAnomaly.isAnomaly,
        isDuplicate: anomalies.duplicateCheck.isDuplicate,
        fraudRiskScore: anomalies.fraudIndicators.riskScore,
      });
    });

    // Step 4: Update capital call with anomaly data
    await step.run('store-anomaly-results', async () => {
      // Store anomaly results in rawExtraction field for now
      // In production, you'd have dedicated anomaly fields in the schema
      await db.capitalCall.update({
        where: { id: capitalCallId },
        data: {
          rawExtraction: {
            ...(capitalCall.rawExtraction as any),
            anomalyDetection: {
              checkedAt: new Date().toISOString(),
              overallRisk: anomalies.overallRisk,
              amountAnomaly: anomalies.amountAnomaly,
              duplicateCheck: anomalies.duplicateCheck,
              fraudIndicators: anomalies.fraudIndicators,
            },
          },
        },
      });
    });

    // Step 5: Flag for manual review if needed
    if (anomalies.shouldFlag) {
      await step.run('flag-for-review', async () => {
        await db.capitalCall.update({
          where: { id: capitalCallId },
          data: { status: 'PENDING_REVIEW' },
        });

        // In production, send notification to admin/user
        console.log(`Capital call ${capitalCallId} flagged for review:`, {
          risk: anomalies.overallRisk,
          reasons: [
            ...anomalies.fraudIndicators.indicators,
            anomalies.amountAnomaly.isAnomaly ? anomalies.amountAnomaly.reason : null,
            anomalies.duplicateCheck.isDuplicate ? anomalies.duplicateCheck.reason : null,
          ].filter(Boolean),
        });
      });
    }

    return {
      success: true,
      capitalCallId,
      anomalies: {
        overallRisk: anomalies.overallRisk,
        shouldFlag: anomalies.shouldFlag,
        details: {
          amountAnomaly: anomalies.amountAnomaly.isAnomaly,
          duplicateDetected: anomalies.duplicateCheck.isDuplicate,
          fraudRiskScore: anomalies.fraudIndicators.riskScore,
        },
      },
    };
  }
);

// lib/ai/anomaly-detection.ts
// AI-ADV-002: Anomaly Detection System
// Advanced AI Agent - Week 15-16

import { db } from '../db';
import { Decimal } from '@prisma/client/runtime/library';

export interface AmountAnomalyResult {
  isAnomaly: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  historicalAverage: number;
  standardDeviations: number;
  recommendation: string;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedCallId?: string;
  similarity: number;
  reason: string;
}

export interface FraudIndicatorResult {
  riskScore: number;
  indicators: string[];
  requiresManualReview: boolean;
  recommendations: string[];
}

export class AnomalyDetector {
  /**
   * Detect unusual capital call amounts using statistical analysis
   * Uses Z-score to identify outliers compared to historical data
   */
  async detectAmountAnomalies(capitalCall: {
    fundName: string;
    amountDue: number;
    userId: string;
  }): Promise<AmountAnomalyResult> {
    // Get historical capital calls for this fund
    const historical = await db.capitalCall.findMany({
      where: {
        fundName: capitalCall.fundName,
        userId: capitalCall.userId,
        status: { in: ['APPROVED', 'PAID'] },
      },
      orderBy: { dueDate: 'desc' },
      take: 20, // Last 20 calls for statistical significance
    });

    if (historical.length < 3) {
      return {
        isAnomaly: false,
        severity: 'LOW',
        reason: 'Insufficient historical data for comparison (less than 3 previous capital calls)',
        historicalAverage: 0,
        standardDeviations: 0,
        recommendation: 'Collect more historical data for accurate anomaly detection',
      };
    }

    // Calculate statistics
    const amounts = historical.map((cc: any) => cc.amountDue.toNumber());
    const average = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((sum: number, val: number) => sum + Math.pow(val - average, 2), 0) /
      amounts.length;
    const stdDev = Math.sqrt(variance);

    // Calculate Z-score: how many standard deviations from mean
    const zScore = stdDev === 0 ? 0 : (capitalCall.amountDue - average) / stdDev;

    let isAnomaly = false;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let reason = '';
    let recommendation = '';

    if (Math.abs(zScore) > 3) {
      isAnomaly = true;
      severity = 'HIGH';
      reason = `Amount is ${Math.abs(zScore).toFixed(
        1
      )} standard deviations from historical average of $${average.toLocaleString(
        'en-US',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}. This is extremely unusual.`;
      recommendation =
        'Verify this amount with fund administrator before processing. Check for potential errors or special circumstances.';
    } else if (Math.abs(zScore) > 2) {
      isAnomaly = true;
      severity = 'MEDIUM';
      reason = `Amount is ${Math.abs(zScore).toFixed(
        1
      )} standard deviations from historical average of $${average.toLocaleString(
        'en-US',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}. This is moderately unusual.`;
      recommendation =
        'Review amount and verify with capital call document. May indicate special distribution or funding requirement.';
    } else {
      reason = `Amount within normal range (${Math.abs(zScore).toFixed(
        1
      )} standard deviations from mean of $${average.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })})`;
      recommendation = 'Amount appears normal based on historical pattern.';
    }

    return {
      isAnomaly,
      severity,
      reason,
      historicalAverage: average,
      standardDeviations: zScore,
      recommendation,
    };
  }

  /**
   * Detect duplicate capital calls
   * Checks for similar amounts and due dates
   */
  async detectDuplicates(capitalCall: {
    fundName: string;
    amountDue: number;
    dueDate: Date;
    userId: string;
  }): Promise<DuplicateDetectionResult> {
    // Find potential duplicates within ±5% amount and ±7 days
    const potentialDuplicates = await db.capitalCall.findMany({
      where: {
        userId: capitalCall.userId,
        fundName: capitalCall.fundName,
        amountDue: {
          gte: capitalCall.amountDue * 0.95,
          lte: capitalCall.amountDue * 1.05,
        },
        dueDate: {
          gte: new Date(
            capitalCall.dueDate.getTime() - 7 * 24 * 60 * 60 * 1000
          ),
          lte: new Date(
            capitalCall.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000
          ),
        },
        status: { not: 'REJECTED' },
      },
    });

    if (potentialDuplicates.length === 0) {
      return {
        isDuplicate: false,
        similarity: 0,
        reason: 'No similar capital calls found',
      };
    }

    // Calculate similarity score for each potential duplicate
    for (const duplicate of potentialDuplicates) {
      const amountDiff = Math.abs(
        duplicate.amountDue.toNumber() - capitalCall.amountDue
      );
      const amountSimilarity = 1 - amountDiff / capitalCall.amountDue;

      const dateDiff = Math.abs(
        duplicate.dueDate.getTime() - capitalCall.dueDate.getTime()
      );
      const dateSimilarity =
        1 - dateDiff / (7 * 24 * 60 * 60 * 1000); // 7 days window

      const similarity = (amountSimilarity + dateSimilarity) / 2;

      if (similarity > 0.9) {
        const dueDateDiff = Math.abs(
          (duplicate.dueDate.getTime() - capitalCall.dueDate.getTime()) /
            (24 * 60 * 60 * 1000)
        );
        return {
          isDuplicate: true,
          matchedCallId: duplicate.id,
          similarity,
          reason: `Very similar capital call found: amount differs by $${amountDiff.toFixed(
            2
          )} and due date differs by ${dueDateDiff.toFixed(
            0
          )} days. This may be a duplicate.`,
        };
      }
    }

    return {
      isDuplicate: false,
      similarity: 0,
      reason: 'No duplicate capital calls found',
    };
  }

  /**
   * Detect fraud indicators
   * Checks for suspicious patterns in wire instructions and other fields
   */
  async detectFraudIndicators(capitalCall: {
    fundName: string;
    bankName?: string | null;
    accountNumber?: string | null;
    wireReference?: string | null;
    routingNumber?: string | null;
  }): Promise<FraudIndicatorResult> {
    const indicators: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Check if wire instructions changed from historical pattern
    const historicalCalls = await db.capitalCall.findMany({
      where: {
        fundName: capitalCall.fundName,
        status: { in: ['APPROVED', 'PAID'] },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    if (historicalCalls.length > 0 && capitalCall.bankName) {
      const uniqueBanks = new Set(
        historicalCalls.map((cc: any) => cc.bankName).filter(Boolean)
      );
      const uniqueAccounts = new Set(
        historicalCalls.map((cc: any) => cc.accountNumber).filter(Boolean)
      );

      // Bank name changed
      if (uniqueBanks.size > 0 && !uniqueBanks.has(capitalCall.bankName)) {
        indicators.push(
          `Bank name changed to "${capitalCall.bankName}" from historical pattern`
        );
        recommendations.push(
          'Verify bank name change with fund administrator via phone or secure channel'
        );
        riskScore += 30;
      }

      // Account number changed
      if (
        capitalCall.accountNumber &&
        uniqueAccounts.size > 0 &&
        !uniqueAccounts.has(capitalCall.accountNumber)
      ) {
        indicators.push('Bank account number changed from historical pattern');
        recommendations.push(
          'Confirm account number change through official fund administrator channels'
        );
        riskScore += 35;
      }
    }

    // Check for suspicious patterns in wire reference
    if (capitalCall.wireReference) {
      const urgencyPattern = /urgent|immediately|asap|rush|time[-\s]sensitive/i;
      if (urgencyPattern.test(capitalCall.wireReference)) {
        indicators.push(
          'Wire reference contains urgency language, common in fraud attempts'
        );
        recommendations.push(
          'Urgency language is a red flag - verify independently before processing'
        );
        riskScore += 25;
      }

      // Check for unusual characters or encoding
      const suspiciousChars = /[^\x00-\x7F]/; // Non-ASCII characters
      if (suspiciousChars.test(capitalCall.wireReference)) {
        indicators.push('Wire reference contains unusual characters');
        recommendations.push('Review wire reference for potential encoding issues');
        riskScore += 15;
      }
    }

    // Check account number format (if provided)
    if (capitalCall.accountNumber) {
      const accountLength = capitalCall.accountNumber.length;
      if (accountLength < 8 || accountLength > 17) {
        indicators.push(
          `Unusual account number length (${accountLength} characters)`
        );
        recommendations.push('Verify account number format with fund administrator');
        riskScore += 10;
      }

      // Check for non-numeric characters (except hyphens)
      if (!/^[\d-]+$/.test(capitalCall.accountNumber)) {
        indicators.push('Account number contains non-numeric characters');
        recommendations.push('Confirm account number format is correct');
        riskScore += 10;
      }
    }

    // Check routing number format (if provided)
    if (capitalCall.routingNumber) {
      // US routing numbers are exactly 9 digits
      if (!/^\d{9}$/.test(capitalCall.routingNumber)) {
        indicators.push('Invalid US routing number format (must be 9 digits)');
        recommendations.push('Verify routing number is correct');
        riskScore += 20;
      } else {
        // Validate routing number checksum (ABA routing number algorithm)
        const isValid = this.validateRoutingNumber(capitalCall.routingNumber);
        if (!isValid) {
          indicators.push('Routing number failed checksum validation');
          recommendations.push(
            'Routing number appears invalid - verify with fund administrator'
          );
          riskScore += 25;
        }
      }
    }

    // Additional recommendations based on risk score
    if (riskScore >= 50) {
      recommendations.push(
        'HIGH RISK: Do not process without independent verification'
      );
      recommendations.push(
        'Contact fund administrator using known phone number (not from document)'
      );
    } else if (riskScore >= 25) {
      recommendations.push('MEDIUM RISK: Require additional verification before processing');
    }

    return {
      riskScore,
      indicators,
      requiresManualReview: riskScore >= 50,
      recommendations,
    };
  }

  /**
   * Validate US routing number using ABA checksum algorithm
   * @param routingNumber 9-digit routing number
   * @returns true if valid, false otherwise
   */
  private validateRoutingNumber(routingNumber: string): boolean {
    if (!/^\d{9}$/.test(routingNumber)) {
      return false;
    }

    const digits = routingNumber.split('').map(Number);
    const checksum =
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      (digits[2] + digits[5] + digits[8]);

    return checksum % 10 === 0;
  }

  /**
   * Comprehensive anomaly check
   * Runs all anomaly detection checks and returns combined results
   */
  async checkAllAnomalies(capitalCall: {
    id?: string;
    fundName: string;
    amountDue: number;
    dueDate: Date;
    userId: string;
    bankName?: string | null;
    accountNumber?: string | null;
    wireReference?: string | null;
    routingNumber?: string | null;
  }): Promise<{
    amountAnomaly: AmountAnomalyResult;
    duplicateCheck: DuplicateDetectionResult;
    fraudIndicators: FraudIndicatorResult;
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    shouldFlag: boolean;
  }> {
    const [amountAnomaly, duplicateCheck, fraudIndicators] = await Promise.all([
      this.detectAmountAnomalies(capitalCall),
      this.detectDuplicates(capitalCall),
      this.detectFraudIndicators(capitalCall),
    ]);

    // Determine overall risk level
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let shouldFlag = false;

    if (
      fraudIndicators?.requiresManualReview ||
      amountAnomaly?.severity === 'HIGH' ||
      duplicateCheck?.isDuplicate
    ) {
      overallRisk = 'HIGH';
      shouldFlag = true;
    } else if (
      fraudIndicators?.riskScore >= 25 ||
      amountAnomaly?.severity === 'MEDIUM'
    ) {
      overallRisk = 'MEDIUM';
      shouldFlag = true;
    }

    return {
      amountAnomaly,
      duplicateCheck,
      fraudIndicators,
      overallRisk,
      shouldFlag,
    };
  }
}

/**
 * Singleton instance
 */
export const anomalyDetector = new AnomalyDetector();

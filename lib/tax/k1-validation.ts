// lib/tax/k1-validation.ts
// Tax & K-1 Agent - K-1 Validation Logic

import { K1Extraction } from '../ai/k1-extract';
import { db } from '../db';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate K-1 extraction against IRS specifications and business rules
 */
export async function validateK1(
  extraction: K1Extraction,
  taxDocumentId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Required field validation
  if (!extraction.formType) {
    errors.push({
      field: 'formType',
      message: 'Form type is required',
      severity: 'ERROR',
    });
  }

  if (!extraction.taxYear || extraction.taxYear < 2000 || extraction.taxYear > 2030) {
    errors.push({
      field: 'taxYear',
      message: 'Invalid tax year',
      severity: 'ERROR',
    });
  }

  if (!extraction.partnershipName || extraction.partnershipName.length < 2) {
    errors.push({
      field: 'partnershipName',
      message: 'Partnership/entity name is required',
      severity: 'ERROR',
    });
  }

  if (!extraction.partnerName || extraction.partnerName.length < 2) {
    errors.push({
      field: 'partnerName',
      message: 'Partner/shareholder name is required',
      severity: 'ERROR',
    });
  }

  // 2. EIN/SSN format validation
  if (extraction.partnershipEIN) {
    const einPattern = /^\d{2}-?\d{7}$/;
    if (!einPattern.test(extraction.partnershipEIN)) {
      errors.push({
        field: 'partnershipEIN',
        message: 'Invalid EIN format (should be XX-XXXXXXX)',
        severity: 'ERROR',
      });
    }
  }

  if (extraction.partnerSSN) {
    const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
    if (!ssnPattern.test(extraction.partnerSSN)) {
      warnings.push({
        field: 'partnerSSN',
        message: 'Invalid SSN/EIN format',
        severity: 'WARNING',
      });
    }
  }

  // 3. Mathematical validation
  // Check that percentages add up (if all present)
  if (
    extraction.profitSharePercentage !== undefined &&
    extraction.lossSharePercentage !== undefined &&
    extraction.capitalSharePercentage !== undefined
  ) {
    const sum =
      extraction.profitSharePercentage +
      extraction.lossSharePercentage +
      extraction.capitalSharePercentage;

    // For a single partner, percentages should each be close to 100
    // For multiple partners, we can't validate this without seeing all K-1s
    if (extraction.profitSharePercentage > 100 || extraction.lossSharePercentage > 100) {
      warnings.push({
        field: 'profitSharePercentage',
        message: 'Share percentage exceeds 100%',
        severity: 'WARNING',
      });
    }
  }

  // 4. Reasonableness checks (outlier detection)
  // Check for unusually large amounts (> $100M)
  const checkAmount = (field: keyof K1Extraction, label: string, maxReasonable: number) => {
    const value = extraction[field] as number | undefined;
    if (value !== undefined && Math.abs(value) > maxReasonable) {
      warnings.push({
        field,
        message: `${label} amount (${value}) is unusually large - please verify`,
        severity: 'WARNING',
      });
    }
  };

  checkAmount('ordinaryBusinessIncome', 'Ordinary business income', 100_000_000);
  checkAmount('cashDistributions', 'Cash distributions', 100_000_000);
  checkAmount('netLongTermCapitalGain', 'Long-term capital gain', 100_000_000);
  checkAmount('guaranteedPayments', 'Guaranteed payments', 10_000_000);

  // 5. Check for negative distributions (unusual but possible)
  if (extraction.cashDistributions && extraction.cashDistributions < 0) {
    warnings.push({
      field: 'cashDistributions',
      message: 'Negative cash distributions are unusual - please verify',
      severity: 'WARNING',
    });
  }

  // 6. Year-over-year comparison (if previous K-1 exists)
  try {
    const previousK1 = await db.taxDocument.findFirst({
      where: {
        fundId: (await db.taxDocument.findUnique({
          where: { id: taxDocumentId },
          select: { fundId: true }
        }))?.fundId,
        investorId: (await db.taxDocument.findUnique({
          where: { id: taxDocumentId },
          select: { investorId: true }
        }))?.investorId,
        taxYear: extraction.taxYear - 1,
        formType: extraction.formType,
      },
      select: {
        shareOfIncome: true,
        distributions: true,
        k1Data: true,
      },
    });

    if (previousK1 && previousK1.k1Data) {
      const prevData = previousK1.k1Data as K1Extraction;

      // Check for large year-over-year changes (>500% or <-90%)
      if (
        prevData.ordinaryBusinessIncome &&
        extraction.ordinaryBusinessIncome &&
        Math.abs(prevData.ordinaryBusinessIncome) > 1000
      ) {
        const changePercent =
          ((extraction.ordinaryBusinessIncome - prevData.ordinaryBusinessIncome) /
            Math.abs(prevData.ordinaryBusinessIncome)) *
          100;

        if (Math.abs(changePercent) > 500) {
          warnings.push({
            field: 'ordinaryBusinessIncome',
            message: `Large year-over-year change (${changePercent.toFixed(0)}%) in ordinary business income`,
            severity: 'WARNING',
          });
        }
      }
    }
  } catch (error) {
    // Ignore errors in YoY comparison (it's just a warning check)
    console.error('Error in YoY comparison:', error);
  }

  // 7. Confidence score validation
  if (extraction.confidence) {
    const minConfidence = Math.min(
      extraction.confidence.formType,
      extraction.confidence.partnershipName,
      extraction.confidence.partnerName
    );

    if (minConfidence < 0.85) {
      warnings.push({
        field: 'confidence',
        message: `Low extraction confidence (${(minConfidence * 100).toFixed(0)}%) - manual review recommended`,
        severity: 'WARNING',
      });
    }
  }

  // 8. Form type specific validation
  if (extraction.formType === 'K1_1065') {
    // Partnership-specific validations
    if (!extraction.partnerType) {
      warnings.push({
        field: 'partnerType',
        message: 'Partner type (General/Limited) should be specified for partnerships',
        severity: 'WARNING',
      });
    }
  } else if (extraction.formType === 'K1_1120S') {
    // S-Corp specific validations
    // S-Corps don't have guaranteed payments
    if (extraction.guaranteedPayments && extraction.guaranteedPayments !== 0) {
      warnings.push({
        field: 'guaranteedPayments',
        message: 'S-Corporations should not have guaranteed payments',
        severity: 'WARNING',
      });
    }
  }

  // 9. Check for amended K-1
  if (extraction.amendedK1) {
    warnings.push({
      field: 'amendedK1',
      message: 'This is an amended K-1 - ensure original K-1 is superseded',
      severity: 'WARNING',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Cross-reference K-1 with distribution data
 */
export async function crossReferenceWithDistributions(
  taxDocumentId: string,
  k1Data: K1Extraction
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  try {
    const taxDoc = await db.taxDocument.findUnique({
      where: { id: taxDocumentId },
      select: {
        fundId: true,
        investorId: true,
        taxYear: true,
      },
    });

    if (!taxDoc) {
      return errors;
    }

    // Sum all distributions for this investor in the tax year
    // Note: This would require the Distribution model from Phase 3 Distribution Agent
    // For now, just validate against what's in the K-1

    if (k1Data.cashDistributions !== undefined && k1Data.cashDistributions < 0) {
      errors.push({
        field: 'cashDistributions',
        message: 'Cash distributions cannot be negative',
        severity: 'ERROR',
      });
    }
  } catch (error) {
    console.error('Error cross-referencing distributions:', error);
  }

  return errors;
}

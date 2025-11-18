// scripts/test-ai-accuracy.ts
// Task AI-003: Accuracy Testing Script with Ground Truth Validation

import { extractCapitalCall } from '../lib/ai/extract';
import { db } from '../lib/db';
import fs from 'fs';
import path from 'path';

interface GroundTruth {
  documentId: string;
  fundName: string;
  amountDue: number;
  dueDate: string;
}

interface AccuracyResults {
  total: number;
  correct: {
    fundName: number;
    amountDue: number;
    dueDate: number;
  };
  errors: Array<{
    documentId: string;
    field?: string;
    expected?: any;
    actual?: any;
    error?: string;
  }>;
}

interface AccuracyMetrics {
  fundName: string;
  amountDue: string;
  dueDate: string;
  overall: string;
}

/**
 * Load ground truth data from JSON file
 */
function loadGroundTruth(): GroundTruth[] {
  const groundTruthPath = path.join(__dirname, 'ground-truth.json');
  const data = fs.readFileSync(groundTruthPath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Validate extraction accuracy against ground truth
 */
async function validateAccuracy(): Promise<AccuracyMetrics> {
  const groundTruth = loadGroundTruth();

  const results: AccuracyResults = {
    total: 0,
    correct: {
      fundName: 0,
      amountDue: 0,
      dueDate: 0,
    },
    errors: [],
  };

  console.log(`\n=== Testing AI Extraction Accuracy ===\n`);
  console.log(`Testing ${groundTruth.length} documents...\n`);

  for (const truth of groundTruth) {
    results.total++;
    console.log(`Testing document: ${truth.documentId}...`);

    try {
      const extraction = await extractCapitalCall(truth.documentId);

      // Check fund name (exact match, case-insensitive)
      const fundNameMatch =
        extraction.data.fundName.toLowerCase().trim() ===
        truth.fundName.toLowerCase().trim();

      if (fundNameMatch) {
        results.correct.fundName++;
        console.log(`  ✓ Fund Name: ${extraction.data.fundName}`);
      } else {
        results.errors.push({
          documentId: truth.documentId,
          field: 'fundName',
          expected: truth.fundName,
          actual: extraction.data.fundName,
        });
        console.log(`  ✗ Fund Name: Expected "${truth.fundName}", got "${extraction.data.fundName}"`);
      }

      // Check amount (allow 1% variance for rounding)
      const amountVariance = Math.abs(
        extraction.data.amountDue - truth.amountDue
      ) / truth.amountDue;

      if (amountVariance < 0.01) {
        results.correct.amountDue++;
        console.log(`  ✓ Amount: $${extraction.data.amountDue.toLocaleString()}`);
      } else {
        results.errors.push({
          documentId: truth.documentId,
          field: 'amountDue',
          expected: truth.amountDue,
          actual: extraction.data.amountDue,
        });
        console.log(`  ✗ Amount: Expected $${truth.amountDue.toLocaleString()}, got $${extraction.data.amountDue.toLocaleString()}`);
      }

      // Check due date (exact match)
      const extractedDate = extraction.data.dueDate.toISOString().split('T')[0];
      if (extractedDate === truth.dueDate) {
        results.correct.dueDate++;
        console.log(`  ✓ Due Date: ${extractedDate}`);
      } else {
        results.errors.push({
          documentId: truth.documentId,
          field: 'dueDate',
          expected: truth.dueDate,
          actual: extractedDate,
        });
        console.log(`  ✗ Due Date: Expected ${truth.dueDate}, got ${extractedDate}`);
      }

      console.log(`  Model used: ${extraction.data.modelUsed}`);
      console.log(`  Cost: $${extraction.data.extractionCost.toFixed(4)}`);
      console.log(`  Confidence: Fund ${(extraction.data.confidenceScores.fundName * 100).toFixed(0)}%, Amount ${(extraction.data.confidenceScores.amountDue * 100).toFixed(0)}%, Date ${(extraction.data.confidenceScores.dueDate * 100).toFixed(0)}%\n`);

    } catch (error) {
      console.error(`  ✗ Failed to extract ${truth.documentId}:`, (error as Error).message);
      results.errors.push({
        documentId: truth.documentId,
        error: (error as Error).message,
      });
    }
  }

  // Calculate accuracy percentages
  const accuracy: AccuracyMetrics = {
    fundName: (results.correct.fundName / results.total * 100).toFixed(1),
    amountDue: (results.correct.amountDue / results.total * 100).toFixed(1),
    dueDate: (results.correct.dueDate / results.total * 100).toFixed(1),
    overall: (
      (results.correct.fundName + results.correct.amountDue + results.correct.dueDate) /
      (results.total * 3) * 100
    ).toFixed(1),
  };

  // Print summary report
  console.log('\n=== AI Extraction Accuracy Report ===\n');
  console.log(`Total Documents: ${results.total}`);
  console.log(`\nAccuracy by Field:`);
  console.log(`  Fund Name:  ${accuracy.fundName}% (${results.correct.fundName}/${results.total})`);
  console.log(`  Amount Due: ${accuracy.amountDue}% (${results.correct.amountDue}/${results.total})`);
  console.log(`  Due Date:   ${accuracy.dueDate}% (${results.correct.dueDate}/${results.total})`);
  console.log(`\nOverall Accuracy: ${accuracy.overall}%`);

  if (results.errors.length > 0) {
    console.log(`\n=== Errors (${results.errors.length}) ===\n`);
    results.errors.forEach((error) => {
      console.log(`Document: ${error.documentId}`);
      if (error.field) {
        console.log(`  Field: ${error.field}`);
        console.log(`  Expected: ${error.expected}`);
        console.log(`  Actual: ${error.actual}`);
      }
      if (error.error) {
        console.log(`  Error: ${error.error}`);
      }
      console.log('');
    });
  }

  // Write detailed report to file
  const reportPath = path.join(__dirname, 'accuracy-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    accuracy,
    results,
    summary: {
      totalDocuments: results.total,
      correctExtractions: {
        fundName: results.correct.fundName,
        amountDue: results.correct.amountDue,
        dueDate: results.correct.dueDate,
      },
      errorCount: results.errors.length,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}\n`);

  return accuracy;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Starting AI extraction accuracy validation...\n');

    const accuracy = await validateAccuracy();

    const overallAccuracy = parseFloat(accuracy.overall);

    if (overallAccuracy < 95) {
      console.error(`\n❌ FAILED: Accuracy ${accuracy.overall}% is below 95% target\n`);
      console.error('Action required:');
      console.error('1. Review error patterns in accuracy-report.json');
      console.error('2. Iterate on system prompts');
      console.error('3. Add more few-shot examples');
      console.error('4. Consider adjusting confidence thresholds\n');
      process.exit(1);
    } else {
      console.log(`\n✅ SUCCESS: Accuracy ${accuracy.overall}% meets 95% target\n`);
      console.log('AI extraction pipeline is performing within acceptable parameters.');
      console.log('Ready for production deployment.\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { validateAccuracy, loadGroundTruth };

// lib/tax/turbotax-export.ts
// Tax & K-1 Agent - TurboTax Export (.txf format)

import { db } from '../db';
import { K1Extraction } from '../ai/k1-extract';

/**
 * Export K-1 data in TurboTax .txf format
 * TXF (Tax Exchange Format) is a standard format for importing tax data into TurboTax
 */
export async function exportToTurboTax(userId: string, taxYear: number): Promise<string> {
  // Fetch all K-1 documents for the user and tax year
  const taxDocuments = await db.taxDocument.findMany({
    where: {
      investorId: userId,
      taxYear,
      status: 'VALIDATED',
      formType: {
        in: ['K1_1065', 'K1_1120S', 'K1_1041'],
      },
    },
    include: {
      document: true,
    },
  });

  // Build TXF file content
  let txfContent = buildTXFHeader(taxYear);

  for (const taxDoc of taxDocuments) {
    if (!taxDoc.k1Data) continue;

    const k1Data = taxDoc.k1Data as K1Extraction;
    txfContent += convertK1ToTXF(k1Data, taxDoc.formType);
  }

  txfContent += buildTXFFooter();

  return txfContent;
}

/**
 * Build TXF file header
 */
function buildTXFHeader(taxYear: number): string {
  return `V042
AClearway Tax Export
D${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
^
TS
D${taxYear}/12/31
^
`;
}

/**
 * Build TXF file footer
 */
function buildTXFFooter(): string {
  return '';
}

/**
 * Convert K-1 data to TXF format entries
 * TXF uses specific codes for different types of income/loss
 */
function convertK1ToTXF(k1Data: K1Extraction, formType: string): string {
  let txfEntries = '';

  // Partnership name
  txfEntries += buildTXFEntry('Text', k1Data.partnershipName, 'Partnership Name');

  // TXF codes for Schedule K-1 (Form 1065) items
  // Box 1: Ordinary business income/loss
  if (k1Data.ordinaryBusinessIncome !== undefined && k1Data.ordinaryBusinessIncome !== 0) {
    txfEntries += buildTXFEntry('705', k1Data.ordinaryBusinessIncome, 'Ordinary business income (loss)');
  }

  // Box 2: Net rental real estate income/loss
  if (k1Data.netRentalRealEstateIncome !== undefined && k1Data.netRentalRealEstateIncome !== 0) {
    txfEntries += buildTXFEntry('706', k1Data.netRentalRealEstateIncome, 'Net rental real estate income (loss)');
  }

  // Box 3: Other net rental income/loss
  if (k1Data.otherNetRentalIncome !== undefined && k1Data.otherNetRentalIncome !== 0) {
    txfEntries += buildTXFEntry('707', k1Data.otherNetRentalIncome, 'Other net rental income (loss)');
  }

  // Box 4: Guaranteed payments
  if (k1Data.guaranteedPayments !== undefined && k1Data.guaranteedPayments !== 0) {
    txfEntries += buildTXFEntry('708', k1Data.guaranteedPayments, 'Guaranteed payments');
  }

  // Box 5: Interest income
  if (k1Data.interestIncome !== undefined && k1Data.interestIncome !== 0) {
    txfEntries += buildTXFEntry('709', k1Data.interestIncome, 'Interest income');
  }

  // Box 6a: Ordinary dividends
  if (k1Data.ordinaryDividends !== undefined && k1Data.ordinaryDividends !== 0) {
    txfEntries += buildTXFEntry('710', k1Data.ordinaryDividends, 'Ordinary dividends');
  }

  // Box 6b: Qualified dividends
  if (k1Data.qualifiedDividends !== undefined && k1Data.qualifiedDividends !== 0) {
    txfEntries += buildTXFEntry('711', k1Data.qualifiedDividends, 'Qualified dividends');
  }

  // Box 7: Royalties
  if (k1Data.royalties !== undefined && k1Data.royalties !== 0) {
    txfEntries += buildTXFEntry('712', k1Data.royalties, 'Royalties');
  }

  // Box 8: Net short-term capital gain/loss
  if (k1Data.netShortTermCapitalGain !== undefined && k1Data.netShortTermCapitalGain !== 0) {
    txfEntries += buildTXFEntry('713', k1Data.netShortTermCapitalGain, 'Net short-term capital gain (loss)');
  }

  // Box 9a: Net long-term capital gain/loss
  if (k1Data.netLongTermCapitalGain !== undefined && k1Data.netLongTermCapitalGain !== 0) {
    txfEntries += buildTXFEntry('714', k1Data.netLongTermCapitalGain, 'Net long-term capital gain (loss)');
  }

  // Box 9b: Collectibles (28%) gain/loss
  if (k1Data.collectiblesGain !== undefined && k1Data.collectiblesGain !== 0) {
    txfEntries += buildTXFEntry('715', k1Data.collectiblesGain, 'Collectibles (28%) gain (loss)');
  }

  // Box 9c: Unrecaptured section 1250 gain
  if (k1Data.unrecaptured1250Gain !== undefined && k1Data.unrecaptured1250Gain !== 0) {
    txfEntries += buildTXFEntry('716', k1Data.unrecaptured1250Gain, 'Unrecaptured section 1250 gain');
  }

  // Box 11: Other income/loss
  if (k1Data.otherIncome !== undefined && k1Data.otherIncome !== 0) {
    txfEntries += buildTXFEntry('717', k1Data.otherIncome, 'Other income (loss)');
  }

  // Box 12: Section 179 deduction
  if (k1Data.section179Deduction !== undefined && k1Data.section179Deduction !== 0) {
    txfEntries += buildTXFEntry('718', k1Data.section179Deduction, 'Section 179 deduction');
  }

  // Box 13: Other deductions
  if (k1Data.otherDeductions !== undefined && k1Data.otherDeductions !== 0) {
    txfEntries += buildTXFEntry('719', k1Data.otherDeductions, 'Other deductions');
  }

  // Box 14: Self-employment earnings
  if (k1Data.selfEmploymentEarnings !== undefined && k1Data.selfEmploymentEarnings !== 0) {
    txfEntries += buildTXFEntry('720', k1Data.selfEmploymentEarnings, 'Self-employment earnings (loss)');
  }

  // Box 15: Credits
  if (k1Data.credits !== undefined && k1Data.credits !== 0) {
    txfEntries += buildTXFEntry('721', k1Data.credits, 'Credits');
  }

  // Box 16: Foreign taxes paid
  if (k1Data.foreignTaxesPaid !== undefined && k1Data.foreignTaxesPaid !== 0) {
    txfEntries += buildTXFEntry('722', k1Data.foreignTaxesPaid, 'Foreign taxes paid');
  }

  // Box 18: Tax-exempt income
  if (k1Data.taxExemptIncome !== undefined && k1Data.taxExemptIncome !== 0) {
    txfEntries += buildTXFEntry('723', k1Data.taxExemptIncome, 'Tax-exempt income');
  }

  // Box 19a: Cash distributions
  if (k1Data.cashDistributions !== undefined && k1Data.cashDistributions !== 0) {
    txfEntries += buildTXFEntry('724', k1Data.cashDistributions, 'Cash distributions');
  }

  // Box 19b: Non-cash distributions
  if (k1Data.nonCashDistributions !== undefined && k1Data.nonCashDistributions !== 0) {
    txfEntries += buildTXFEntry('725', k1Data.nonCashDistributions, 'Non-cash distributions');
  }

  // Box 20: Beginning capital account
  if (k1Data.beginningCapital !== undefined && k1Data.beginningCapital !== 0) {
    txfEntries += buildTXFEntry('726', k1Data.beginningCapital, 'Beginning capital account');
  }

  // Box 20: Ending capital account
  if (k1Data.endingCapital !== undefined && k1Data.endingCapital !== 0) {
    txfEntries += buildTXFEntry('727', k1Data.endingCapital, 'Ending capital account');
  }

  // Capital contributions
  if (k1Data.capitalContributions !== undefined && k1Data.capitalContributions !== 0) {
    txfEntries += buildTXFEntry('728', k1Data.capitalContributions, 'Capital contributions');
  }

  return txfEntries;
}

/**
 * Build a single TXF entry
 */
function buildTXFEntry(code: string, amount: number | string, description: string): string {
  return `T${code}
P${description}
N${amount}
$${typeof amount === 'number' ? amount.toFixed(2) : amount}
^
`;
}

/**
 * Export summary report (PDF format)
 */
export async function exportTaxSummary(userId: string, taxYear: number): Promise<{
  totalIncome: number;
  totalLoss: number;
  totalDistributions: number;
  k1Count: number;
  byFund: Array<{
    fundName: string;
    income: number;
    distributions: number;
  }>;
}> {
  const taxDocuments = await db.taxDocument.findMany({
    where: {
      investorId: userId,
      taxYear,
      status: 'VALIDATED',
      formType: {
        in: ['K1_1065', 'K1_1120S', 'K1_1041'],
      },
    },
    include: {
      document: true,
    },
  });

  let totalIncome = 0;
  let totalLoss = 0;
  let totalDistributions = 0;
  const byFund: Map<string, { fundName: string; income: number; distributions: number }> = new Map();

  for (const taxDoc of taxDocuments) {
    if (!taxDoc.k1Data) continue;

    const k1Data = taxDoc.k1Data as K1Extraction;
    const income = k1Data.ordinaryBusinessIncome || 0;
    const distributions = k1Data.cashDistributions || 0;

    if (income > 0) totalIncome += income;
    if (income < 0) totalLoss += Math.abs(income);
    totalDistributions += distributions;

    // Aggregate by fund
    const fundName = k1Data.partnershipName;
    if (!byFund.has(fundName)) {
      byFund.set(fundName, { fundName, income: 0, distributions: 0 });
    }
    const fundData = byFund.get(fundName)!;
    fundData.income += income;
    fundData.distributions += distributions;
  }

  return {
    totalIncome,
    totalLoss,
    totalDistributions,
    k1Count: taxDocuments.length,
    byFund: Array.from(byFund.values()),
  };
}

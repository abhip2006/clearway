/**
 * Test Fixtures: Capital Calls
 *
 * Predefined test data for capital call testing
 */

export const capitalCallFixtures = {
  // Standard capital call with all fields
  standard: {
    fundName: 'Apollo Fund XI',
    investorEmail: 'investor@example.com',
    investorAccount: 'INV-12345',
    amountDue: 250000,
    currency: 'USD',
    dueDate: new Date('2025-12-15'),
    bankName: 'JPMorgan Chase',
    accountNumber: '987654321',
    routingNumber: '021000021',
    wireReference: 'APOLLO-Q4-2025',
    confidenceScores: {
      fundName: 0.95,
      amountDue: 0.98,
      dueDate: 0.95,
    },
  },

  // Minimal capital call with required fields only
  minimal: {
    fundName: 'Minimal Fund',
    amountDue: 100000,
    currency: 'USD',
    dueDate: new Date('2025-12-31'),
    confidenceScores: {
      fundName: 0.90,
      amountDue: 0.92,
      dueDate: 0.88,
    },
  },

  // Low confidence capital call
  lowConfidence: {
    fundName: 'Uncertain Fund',
    amountDue: 150000,
    currency: 'USD',
    dueDate: new Date('2026-01-15'),
    confidenceScores: {
      fundName: 0.65,
      amountDue: 0.70,
      dueDate: 0.75,
    },
  },

  // European capital call
  european: {
    fundName: 'Blackstone Europe Fund IV',
    investorEmail: 'investor.eu@example.com',
    amountDue: 500000,
    currency: 'EUR',
    dueDate: new Date('2026-02-28'),
    bankName: 'Deutsche Bank',
    accountNumber: 'DE89370400440532013000',
    wireReference: 'BLACKSTONE-EU-Q1',
    confidenceScores: {
      fundName: 0.94,
      amountDue: 0.96,
      dueDate: 0.93,
    },
  },

  // Large amount capital call
  largeAmount: {
    fundName: 'KKR Global Fund XII',
    amountDue: 5000000,
    currency: 'USD',
    dueDate: new Date('2026-03-31'),
    bankName: 'Bank of America',
    accountNumber: '123456789012',
    routingNumber: '026009593',
    wireReference: 'KKR-LARGE-Q1',
    confidenceScores: {
      fundName: 0.97,
      amountDue: 0.99,
      dueDate: 0.96,
    },
  },

  // Past due capital call
  pastDue: {
    fundName: 'Late Payment Fund',
    amountDue: 200000,
    currency: 'USD',
    dueDate: new Date('2025-01-15'), // In the past
    confidenceScores: {
      fundName: 0.91,
      amountDue: 0.94,
      dueDate: 0.90,
    },
  },

  // Array of multiple capital calls for list testing
  list: [
    {
      id: 'cc-1',
      fundName: 'Alpha Fund I',
      amountDue: 100000,
      dueDate: new Date('2025-12-01'),
      status: 'PENDING_REVIEW',
    },
    {
      id: 'cc-2',
      fundName: 'Beta Fund II',
      amountDue: 200000,
      dueDate: new Date('2025-12-15'),
      status: 'APPROVED',
    },
    {
      id: 'cc-3',
      fundName: 'Gamma Fund III',
      amountDue: 300000,
      dueDate: new Date('2026-01-10'),
      status: 'PAID',
    },
    {
      id: 'cc-4',
      fundName: 'Delta Fund IV',
      amountDue: 400000,
      dueDate: new Date('2026-02-20'),
      status: 'REJECTED',
    },
  ],
};

export type CapitalCallFixture = typeof capitalCallFixtures.standard;

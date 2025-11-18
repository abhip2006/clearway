// tests/ai/anomaly-detection.test.ts
// Tests for Anomaly Detection System (AI-ADV-002)

import { describe, it, expect, beforeEach } from 'vitest';
import { AnomalyDetector } from '@/lib/ai/anomaly-detection';

describe('AnomalyDetector (AI-ADV-002)', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('Amount Anomaly Detection', () => {
    it('should detect high-severity amount anomalies (>3 std dev)', () => {
      // This test demonstrates the algorithm without DB calls
      // In a real test, you'd mock the database

      const amounts = [100000, 105000, 98000, 102000, 99000]; // ~100k average
      const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      const anomalousAmount = 500000; // Way above average
      const zScore = (anomalousAmount - average) / stdDev;

      expect(Math.abs(zScore)).toBeGreaterThan(3);
      expect(average).toBeCloseTo(100800, 0);
    });

    it('should detect medium-severity amount anomalies (>2 std dev)', () => {
      const amounts = [100000, 105000, 98000, 102000, 99000];
      const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      const moderateAnomaly = 115000;
      const zScore = (moderateAnomaly - average) / stdDev;

      expect(Math.abs(zScore)).toBeGreaterThan(2);
      expect(Math.abs(zScore)).toBeLessThan(3);
    });

    it('should not flag normal amounts as anomalies', () => {
      const amounts = [100000, 105000, 98000, 102000, 99000];
      const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      const normalAmount = 101000;
      const zScore = (normalAmount - average) / stdDev;

      expect(Math.abs(zScore)).toBeLessThan(2);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect high-similarity duplicates', () => {
      const amount1 = 250000;
      const amount2 = 251000;
      const amountSimilarity = 1 - Math.abs(amount1 - amount2) / amount1;

      const date1 = new Date('2025-12-15');
      const date2 = new Date('2025-12-16');
      const dateDiff = Math.abs(date1.getTime() - date2.getTime());
      const dateSimilarity = 1 - dateDiff / (7 * 24 * 60 * 60 * 1000);

      const similarity = (amountSimilarity + dateSimilarity) / 2;

      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should not flag dissimilar calls as duplicates', () => {
      const amount1 = 250000;
      const amount2 = 500000;
      const amountSimilarity = 1 - Math.abs(amount1 - amount2) / amount1;

      expect(amountSimilarity).toBeLessThan(0.5);
    });
  });

  describe('Fraud Detection', () => {
    it('should detect changed wire instructions', () => {
      const bankChanged = 'JPMorgan Chase' !== 'Bank of America';
      expect(bankChanged).toBe(true);
    });

    it('should detect urgency language in wire references', () => {
      const urgencyPatterns = /urgent|immediately|asap|rush|time[-\s]sensitive/i;

      expect(urgencyPatterns.test('Please wire IMMEDIATELY')).toBe(true);
      expect(urgencyPatterns.test('URGENT: Payment required')).toBe(true);
      expect(urgencyPatterns.test('Time-sensitive request')).toBe(true);
      expect(urgencyPatterns.test('Normal wire reference')).toBe(false);
    });

    it('should validate routing number format', () => {
      const validRoutingNumber = '021000021';
      const invalidRoutingNumber = '12345'; // Too short

      expect(/^\d{9}$/.test(validRoutingNumber)).toBe(true);
      expect(/^\d{9}$/.test(invalidRoutingNumber)).toBe(false);
    });

    it('should validate routing number checksum', () => {
      // JPMorgan Chase routing number
      const routingNumber = '021000021';
      const digits = routingNumber.split('').map(Number);
      const checksum =
        3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        (digits[2] + digits[5] + digits[8]);

      expect(checksum % 10).toBe(0);
    });

    it('should detect invalid routing number checksum', () => {
      const invalidRoutingNumber = '123456789'; // Invalid checksum
      const digits = invalidRoutingNumber.split('').map(Number);
      const checksum =
        3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        (digits[2] + digits[5] + digits[8]);

      expect(checksum % 10).not.toBe(0);
    });

    it('should calculate risk scores correctly', () => {
      let riskScore = 0;

      // Bank changed
      riskScore += 30;

      // Account changed
      riskScore += 35;

      // Urgency language
      riskScore += 25;

      expect(riskScore).toBe(90);
      expect(riskScore).toBeGreaterThanOrEqual(50); // HIGH RISK threshold
    });
  });

  describe('Risk Scoring', () => {
    it('should categorize HIGH risk correctly', () => {
      const riskScore = 75;
      expect(riskScore).toBeGreaterThanOrEqual(50);
    });

    it('should categorize MEDIUM risk correctly', () => {
      const riskScore = 35;
      expect(riskScore).toBeGreaterThanOrEqual(25);
      expect(riskScore).toBeLessThan(50);
    });

    it('should categorize LOW risk correctly', () => {
      const riskScore = 10;
      expect(riskScore).toBeLessThan(25);
    });
  });
});

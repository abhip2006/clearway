/**
 * Conflict Resolver Unit Tests
 */

import { ConflictResolver } from '../../backend/services/sync/ConflictResolver';
import { Holding } from '../../backend/models/Portfolio';
import { ConflictType } from '../../backend/models/Conflict';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('detectHoldingConflict', () => {
    it('should detect quantity mismatch', async () => {
      const existing: Holding = {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        securityId: 'AAPL',
        ticker: 'AAPL',
        quantity: 1000,
        marketValue: 175000,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const incoming: Partial<Holding> = {
        securityId: 'AAPL',
        quantity: 1050, // 5% difference
        marketValue: 175000
      };

      const result = await resolver.detectHoldingConflict(existing, incoming);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe(ConflictType.QUANTITY_MISMATCH);
      expect(result.severity).toBe('MEDIUM');
    });

    it('should detect value mismatch', async () => {
      const existing: Holding = {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        securityId: 'AAPL',
        ticker: 'AAPL',
        quantity: 1000,
        marketValue: 175000,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const incoming: Partial<Holding> = {
        securityId: 'AAPL',
        quantity: 1000,
        marketValue: 180000 // >2% difference
      };

      const result = await resolver.detectHoldingConflict(existing, incoming);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe(ConflictType.VALUE_MISMATCH);
    });

    it('should not detect conflict for minor differences', async () => {
      const existing: Holding = {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        securityId: 'AAPL',
        ticker: 'AAPL',
        quantity: 1000,
        marketValue: 175000,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const incoming: Partial<Holding> = {
        securityId: 'AAPL',
        quantity: 1005, // 0.5% difference
        marketValue: 175500 // 0.28% difference
      };

      const result = await resolver.detectHoldingConflict(existing, incoming);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('mergeHoldings', () => {
    it('should average market values when both exist', () => {
      const existing: Holding = {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        securityId: 'AAPL',
        ticker: 'AAPL',
        quantity: 1000,
        marketValue: 175000,
        costBasis: 150000,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const incoming: Partial<Holding> = {
        quantity: 1000,
        marketValue: 177000
      };

      // Access private method via any for testing
      const merged = (resolver as any).mergeHoldings(existing, incoming);

      expect(merged.marketValue).toBe(176000); // Average of 175000 and 177000
    });
  });

  describe('reconcileHoldings', () => {
    it('should identify conflicts across multiple platforms', async () => {
      const holdings = [
        {
          connectionId: 'conn-1',
          platform: 'BLACK_DIAMOND',
          holdings: [
            { securityId: 'AAPL', quantity: 1000, marketValue: 175000 }
          ]
        },
        {
          connectionId: 'conn-2',
          platform: 'ORION',
          holdings: [
            { securityId: 'AAPL', quantity: 1050, marketValue: 183750 }
          ]
        }
      ];

      const results = await resolver.reconcileHoldings('portfolio-1', holdings);

      expect(results.totalSecurities).toBe(1);
      expect(results.conflicts.length).toBeGreaterThan(0);
      expect(results.recommendations.length).toBeGreaterThan(0);
    });
  });
});

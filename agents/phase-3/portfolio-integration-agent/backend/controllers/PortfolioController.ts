/**
 * Portfolio Controller
 * Handles API endpoints for portfolio management and data retrieval
 */

import { Request, Response } from 'express';
import { ConflictResolver } from '../services/sync/ConflictResolver';

export class PortfolioController {
  private conflictResolver: ConflictResolver;

  constructor() {
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * POST /api/v1/portfolios
   * Create new portfolio
   */
  async createPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { name, baseCurrency, connections, weightedAggregation } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const portfolio = await this.createPortfolioRecord({
        userId,
        name,
        baseCurrency: baseCurrency || 'USD',
        weightedAggregation,
        connections
      });

      res.status(201).json(portfolio);
    } catch (error: any) {
      console.error('Error creating portfolio:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/portfolios/:portfolioId
   * Get portfolio with consolidated data
   */
  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { portfolioId } = req.params;
      const { includeDetails, asOf } = req.query;
      const userId = req.user?.id;

      const portfolio = await this.getPortfolioById(portfolioId, userId);

      if (!portfolio) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }

      const connections = await this.getPortfolioConnections(portfolioId);
      const summary = includeDetails === 'true'
        ? await this.getPortfolioSummary(portfolioId)
        : undefined;

      res.status(200).json({
        id: portfolio.id,
        name: portfolio.name,
        totalValue: portfolio.totalValue,
        baseCurrency: portfolio.baseCurrency,
        syncStatus: portfolio.syncStatus,
        lastSyncAt: portfolio.updatedAt,
        connections: connections.map(c => ({
          connectionId: c.connectionId,
          platform: c.platform,
          accountValue: c.accountValue,
          weight: c.weight,
          lastSync: c.lastSync
        })),
        summary
      });
    } catch (error: any) {
      console.error('Error getting portfolio:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/portfolios/:portfolioId/holdings
   * Get consolidated holdings
   */
  async getHoldings(req: Request, res: Response): Promise<void> {
    try {
      const { portfolioId } = req.params;
      const { skip = 0, limit = 100, sort = 'value', security_type } = req.query;
      const userId = req.user?.id;

      const portfolio = await this.getPortfolioById(portfolioId, userId);

      if (!portfolio) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }

      const holdings = await this.getPortfolioHoldings(portfolioId, {
        skip: Number(skip),
        limit: Number(limit),
        sort: sort as string,
        securityType: security_type as string
      });

      const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

      res.status(200).json({
        holdings: holdings.map(h => ({
          id: h.id,
          securityId: h.securityId,
          ticker: h.ticker,
          quantity: h.quantity,
          marketValue: h.marketValue,
          percentOfPortfolio: h.percentOfPortfolio,
          sources: h.sources?.map(s => ({
            connection: s.connectionId,
            platform: s.platform,
            quantity: s.quantity,
            value: s.marketValue
          })),
          lastUpdated: h.lastUpdated
        })),
        total: holdings.length,
        totalValue
      });
    } catch (error: any) {
      console.error('Error getting holdings:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/portfolios/:portfolioId/transactions
   * Get consolidated transactions
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { portfolioId } = req.params;
      const { startDate, endDate, type, skip = 0, limit = 100 } = req.query;
      const userId = req.user?.id;

      const portfolio = await this.getPortfolioById(portfolioId, userId);

      if (!portfolio) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }

      const transactions = await this.getPortfolioTransactions(portfolioId, {
        startDate: startDate as string,
        endDate: endDate as string,
        type: type as string,
        skip: Number(skip),
        limit: Number(limit)
      });

      const stats = this.calculateTransactionStats(transactions);

      res.status(200).json({
        transactions,
        total: transactions.length,
        ...stats
      });
    } catch (error: any) {
      console.error('Error getting transactions:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/portfolios/:portfolioId/performance
   * Get performance metrics
   */
  async getPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { portfolioId } = req.params;
      const { period, benchmarkId } = req.query;
      const userId = req.user?.id;

      const portfolio = await this.getPortfolioById(portfolioId, userId);

      if (!portfolio) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }

      const performance = await this.getPerformanceMetrics(portfolioId, {
        period: period as string,
        benchmarkId: benchmarkId as string
      });

      res.status(200).json({ performance });
    } catch (error: any) {
      console.error('Error getting performance:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/portfolios/:portfolioId/conflicts
   * Get pending conflicts
   */
  async getConflicts(req: Request, res: Response): Promise<void> {
    try {
      const { portfolioId } = req.params;
      const { status = 'PENDING', type } = req.query;
      const userId = req.user?.id;

      const portfolio = await this.getPortfolioById(portfolioId, userId);

      if (!portfolio) {
        res.status(404).json({ error: 'Portfolio not found' });
        return;
      }

      const conflicts = await this.getPortfolioConflicts(portfolioId, {
        status: status as string,
        type: type as string
      });

      res.status(200).json({
        conflicts: conflicts.map(c => ({
          id: c.id,
          type: c.conflictType,
          dataType: c.dataType,
          security: c.clearwayData?.ticker || c.clearwayData?.securityId,
          sources: [
            { connection: c.primarySourceId, ...c.clearwayData },
            { connection: c.conflictingSourceId, ...c.platformData }
          ],
          createdAt: c.createdAt,
          reviewedBy: c.reviewedBy
        })),
        total: conflicts.length
      });
    } catch (error: any) {
      console.error('Error getting conflicts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /api/v1/portfolios/:portfolioId/conflicts/:conflictId/resolve
   * Resolve a conflict
   */
  async resolveConflict(req: Request, res: Response): Promise<void> {
    try {
      const { portfolioId, conflictId } = req.params;
      const { resolution, mergedValue } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.conflictResolver.resolveConflictManually(
        conflictId,
        userId,
        resolution,
        mergedValue
      );

      const conflict = await this.getConflictById(conflictId);

      res.status(200).json(conflict);
    } catch (error: any) {
      console.error('Error resolving conflict:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Helper methods (to be implemented with actual DB layer)
   */
  private async createPortfolioRecord(data: any): Promise<any> {
    return {
      id: `portfolio-${Date.now()}`,
      ...data,
      totalValue: 0,
      syncStatus: 'SYNCED',
      consolidationStatus: 'ACTIVE',
      createdAt: new Date()
    };
  }

  private async getPortfolioById(portfolioId: string, userId?: string): Promise<any> {
    return null;
  }

  private async getPortfolioConnections(portfolioId: string): Promise<any[]> {
    return [];
  }

  private async getPortfolioSummary(portfolioId: string): Promise<any> {
    return {
      totalHoldings: 0,
      totalTransactions: 0,
      topHoldings: [],
      assetAllocation: []
    };
  }

  private async getPortfolioHoldings(portfolioId: string, options: any): Promise<any[]> {
    return [];
  }

  private async getPortfolioTransactions(portfolioId: string, options: any): Promise<any[]> {
    return [];
  }

  private async getPerformanceMetrics(portfolioId: string, options: any): Promise<any[]> {
    return [];
  }

  private async getPortfolioConflicts(portfolioId: string, options: any): Promise<any[]> {
    return [];
  }

  private async getConflictById(conflictId: string): Promise<any> {
    return null;
  }

  private calculateTransactionStats(transactions: any[]): any {
    return {
      totalBuys: transactions.filter(t => t.type === 'BUY').length,
      totalSells: transactions.filter(t => t.type === 'SELL').length,
      totalDividends: transactions.filter(t => t.type === 'DIVIDEND').length,
      netCashFlow: 0
    };
  }
}

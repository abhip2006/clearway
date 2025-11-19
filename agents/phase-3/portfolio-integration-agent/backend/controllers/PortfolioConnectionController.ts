/**
 * Portfolio Connection Controller
 * Handles API endpoints for portfolio connections management
 */

import { Request, Response } from 'express';
import { BlackDiamondService } from '../services/integrations/BlackDiamondService';
import { OrionService } from '../services/integrations/OrionService';
import { AddeparService } from '../services/integrations/AddeparService';
import { SyncEngine } from '../services/sync/SyncEngine';
import { Platform } from '../models/PortfolioConnection';

export class PortfolioConnectionController {
  private blackDiamondService: BlackDiamondService;
  private orionService: OrionService;
  private addeparService: AddeparService;
  private syncEngine: SyncEngine;

  constructor(config: any) {
    this.blackDiamondService = new BlackDiamondService(config.blackDiamond);
    this.orionService = new OrionService(config.orion);
    this.addeparService = new AddeparService(config.addepar);
    this.syncEngine = new SyncEngine(config);
  }

  /**
   * POST /api/v1/portfolio-connections/initiate
   * Start OAuth flow for new platform connection
   */
  async initiateConnection(req: Request, res: Response): Promise<void> {
    try {
      const { platform, accountId, bidirectionalSync } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Generate session token
      const sessionToken = this.generateSessionToken();
      const state = `${userId}:${sessionToken}`;

      // Store session data temporarily
      await this.storeSessionData(sessionToken, {
        userId,
        platform,
        accountId,
        bidirectionalSync,
        createdAt: new Date()
      });

      // Generate authorization URL
      let authorizationUrl: string;

      switch (platform) {
        case Platform.BLACK_DIAMOND:
          authorizationUrl = this.blackDiamondService.generateAuthUrl(state);
          break;

        case Platform.ADDEPAR:
          authorizationUrl = this.addeparService.generateAuthUrl(state);
          break;

        case Platform.ORION:
          // Orion uses API keys, not OAuth
          res.status(200).json({
            requiresApiKey: true,
            sessionToken,
            expiresIn: 600
          });
          return;

        default:
          res.status(400).json({ error: 'Unsupported platform' });
          return;
      }

      res.status(200).json({
        authorizationUrl,
        sessionToken,
        expiresIn: 600
      });
    } catch (error: any) {
      console.error('Error initiating connection:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/portfolio-connections/callback
   * Handle OAuth callback and store credentials
   */
  async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken, code, state } = req.body;

      // Retrieve session data
      const sessionData = await this.getSessionData(sessionToken);

      if (!sessionData) {
        res.status(400).json({ error: 'Invalid session token' });
        return;
      }

      // Verify state parameter
      const [userId] = state.split(':');
      if (userId !== sessionData.userId) {
        res.status(400).json({ error: 'Invalid state parameter' });
        return;
      }

      // Exchange code for tokens
      let tokens;
      const platform = sessionData.platform;

      switch (platform) {
        case Platform.BLACK_DIAMOND:
          tokens = await this.blackDiamondService.exchangeCodeForToken(code);
          break;

        case Platform.ADDEPAR:
          tokens = await this.addeparService.exchangeCodeForToken(code);
          break;

        default:
          res.status(400).json({ error: 'Unsupported platform' });
          return;
      }

      // Create connection record
      const connection = await this.createConnection({
        userId: sessionData.userId,
        platform,
        accountId: sessionData.accountId || 'default',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        bidirectionalSync: sessionData.bidirectionalSync || false
      });

      // Start initial sync
      this.syncEngine.sync(connection).catch(error => {
        console.error('Initial sync failed:', error);
      });

      res.status(200).json({
        connectionId: connection.id,
        platform: connection.platform,
        accountId: connection.accountId,
        status: 'SYNCING',
        displayName: connection.displayName
      });
    } catch (error: any) {
      console.error('Error handling callback:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/portfolio-connections/api-key
   * Create connection using API key (for Orion)
   */
  async createApiKeyConnection(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken, apiKey, apiSecret, accountId } = req.body;
      const sessionData = await this.getSessionData(sessionToken);

      if (!sessionData) {
        res.status(400).json({ error: 'Invalid session token' });
        return;
      }

      // Verify credentials
      const isValid = await this.orionService.createConnection({
        apiKey,
        apiSecret,
        environment: 'production',
        accountId
      });

      if (!isValid) {
        res.status(401).json({ error: 'Invalid API credentials' });
        return;
      }

      // Create connection record
      const connection = await this.createConnection({
        userId: sessionData.userId,
        platform: Platform.ORION,
        accountId,
        accessToken: apiKey, // Store encrypted
        refreshToken: apiSecret, // Store encrypted
        bidirectionalSync: sessionData.bidirectionalSync || false
      });

      // Start initial sync
      this.syncEngine.sync(connection).catch(error => {
        console.error('Initial sync failed:', error);
      });

      res.status(200).json({
        connectionId: connection.id,
        platform: connection.platform,
        accountId: connection.accountId,
        status: 'SYNCING',
        displayName: connection.displayName
      });
    } catch (error: any) {
      console.error('Error creating API key connection:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/portfolio-connections
   * List all connections for user
   */
  async listConnections(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { portfolio_id, platform, status } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const connections = await this.getConnections(userId, {
        portfolioId: portfolio_id as string,
        platform: platform as string,
        status: status as string
      });

      res.status(200).json({
        connections: connections.map(c => ({
          id: c.id,
          platform: c.platform,
          displayName: c.displayName,
          status: c.status,
          lastSyncAt: c.lastSyncAt,
          nextSyncAt: c.nextScheduledSyncAt,
          syncSuccessRate: c.syncSuccessRate,
          holdingsCount: 0, // TODO: Get from database
          transactionsCount: 0 // TODO: Get from database
        })),
        total: connections.length
      });
    } catch (error: any) {
      console.error('Error listing connections:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/portfolio-connections/:connectionId
   * Get detailed connection info
   */
  async getConnection(req: Request, res: Response): Promise<void> {
    try {
      const { connectionId } = req.params;
      const userId = req.user?.id;

      const connection = await this.getConnectionById(connectionId, userId);

      if (!connection) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      // Get statistics
      const statistics = await this.getConnectionStatistics(connectionId);

      res.status(200).json({
        id: connection.id,
        platform: connection.platform,
        accountId: connection.accountId,
        displayName: connection.displayName,
        status: connection.status,
        autoSync: connection.autoSync,
        bidirectionalSync: connection.bidirectionalSync,
        conflictResolution: connection.conflictResolution,
        lastSyncAt: connection.lastSyncAt,
        lastErrorMessage: connection.lastErrorMessage,
        errorCount: connection.errorCount,
        syncSuccessRate: connection.syncSuccessRate,
        dataFilters: {
          includedAssetClasses: connection.includedAssetClasses,
          excludedSecurities: connection.excludedSecurities,
          minValue: connection.minHoldingValue
        },
        statistics
      });
    } catch (error: any) {
      console.error('Error getting connection:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /api/v1/portfolio-connections/:connectionId
   * Update connection settings
   */
  async updateConnection(req: Request, res: Response): Promise<void> {
    try {
      const { connectionId } = req.params;
      const userId = req.user?.id;
      const updates = req.body;

      const connection = await this.getConnectionById(connectionId, userId);

      if (!connection) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const updatedConnection = await this.updateConnectionSettings(connectionId, updates);

      res.status(200).json(updatedConnection);
    } catch (error: any) {
      console.error('Error updating connection:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/v1/portfolio-connections/:connectionId
   * Disconnect and remove connection
   */
  async deleteConnection(req: Request, res: Response): Promise<void> {
    try {
      const { connectionId } = req.params;
      const { includeHistory } = req.query;
      const userId = req.user?.id;

      const connection = await this.getConnectionById(connectionId, userId);

      if (!connection) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      // Revoke access on platform
      switch (connection.platform) {
        case Platform.BLACK_DIAMOND:
          await this.blackDiamondService.revokeAccess(connection);
          break;
        case Platform.ORION:
          await this.orionService.disconnect(connection);
          break;
        case Platform.ADDEPAR:
          await this.addeparService.revokeAccess(connection);
          break;
      }

      // Delete or mark as disconnected
      if (includeHistory === 'true') {
        await this.markConnectionDisconnected(connectionId);
      } else {
        await this.deleteConnectionRecord(connectionId);
      }

      res.status(200).json({
        connectionId,
        status: 'DISCONNECTED',
        dataRetained: includeHistory === 'true',
        lastSync: connection.lastSyncAt
      });
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/portfolio-connections/:connectionId/sync
   * Trigger manual sync
   */
  async triggerSync(req: Request, res: Response): Promise<void> {
    try {
      const { connectionId } = req.params;
      const { dataTypes, force } = req.body;
      const userId = req.user?.id;

      const connection = await this.getConnectionById(connectionId, userId);

      if (!connection) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      // Start sync operation
      const syncResult = await this.syncEngine.sync(connection, dataTypes, force);

      res.status(200).json({
        syncOperationId: syncResult.operation.id,
        status: syncResult.operation.status,
        startedAt: syncResult.operation.startedAt,
        estimatedCompletionTime: 30 // seconds
      });
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Helper methods (to be implemented with actual DB layer)
   */
  private generateSessionToken(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeSessionData(token: string, data: any): Promise<void> {
    // Store in Redis or database
    console.log('Storing session data:', token);
  }

  private async getSessionData(token: string): Promise<any> {
    // Retrieve from Redis or database
    return null;
  }

  private async createConnection(data: any): Promise<any> {
    // Create in database
    return {
      id: `conn-${Date.now()}`,
      ...data,
      status: 'CONNECTING',
      createdAt: new Date()
    };
  }

  private async getConnections(userId: string, filters: any): Promise<any[]> {
    // Query database
    return [];
  }

  private async getConnectionById(connectionId: string, userId?: string): Promise<any> {
    // Query database
    return null;
  }

  private async getConnectionStatistics(connectionId: string): Promise<any> {
    // Query database
    return {
      totalHoldings: 0,
      totalTransactions: 0,
      totalValue: 0,
      lastDataPoint: new Date()
    };
  }

  private async updateConnectionSettings(connectionId: string, updates: any): Promise<any> {
    // Update in database
    return {};
  }

  private async markConnectionDisconnected(connectionId: string): Promise<void> {
    // Update status in database
    console.log('Marking connection as disconnected:', connectionId);
  }

  private async deleteConnectionRecord(connectionId: string): Promise<void> {
    // Delete from database
    console.log('Deleting connection:', connectionId);
  }
}

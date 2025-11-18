/**
 * SS&C Geneva API Authentication Client
 * Task FA-001: OAuth 2.0 authentication with token caching and multi-account support
 */

import axios, { AxiosError } from 'axios';
import { SSCAuthResponseSchema, type SSCAuthResponse } from '../types';

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
  refreshToken?: string;
}

export class SSCAuthClient {
  private tokenCache: Map<string, TokenCacheEntry> = new Map();
  private readonly TOKEN_BUFFER_MS = 60000; // 1 minute buffer before expiry

  constructor(
    private clientId: string,
    private clientSecret: string,
    private apiUrl: string
  ) {
    if (!clientId || !clientSecret || !apiUrl) {
      throw new Error(
        'SSCAuthClient requires clientId, clientSecret, and apiUrl'
      );
    }
  }

  /**
   * Get access token for a specific account
   * Automatically handles caching and token refresh
   */
  async getAccessToken(accountId: string): Promise<string> {
    // Check cache
    const cached = this.tokenCache.get(accountId);
    if (cached && cached.expiresAt > Date.now() + this.TOKEN_BUFFER_MS) {
      return cached.token;
    }

    // If we have a refresh token and it's expired, refresh it
    if (cached?.refreshToken) {
      try {
        return await this.refreshToken(accountId, cached.refreshToken);
      } catch (error) {
        console.warn(
          `Failed to refresh token for account ${accountId}, requesting new token`,
          error
        );
        // Fall through to request new token
      }
    }

    // Request new token
    return await this.requestNewToken(accountId);
  }

  /**
   * Request a new access token using client credentials flow
   */
  private async requestNewToken(accountId: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: `fund:${accountId}:read capital_calls:write`,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000, // 10 second timeout
        }
      );

      const auth = SSCAuthResponseSchema.parse(response.data);

      // Cache token
      this.tokenCache.set(accountId, {
        token: auth.access_token,
        expiresAt: Date.now() + auth.expires_in * 1000,
        refreshToken: auth.refresh_token,
      });

      return auth.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(
          `Failed to authenticate with SS&C Geneva: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`
        );
      }
      throw new Error(`Failed to authenticate with SS&C Geneva: ${error}`);
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshToken(accountId: string, refreshToken: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/oauth2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );

      const auth = SSCAuthResponseSchema.parse(response.data);

      // Update cache
      this.tokenCache.set(accountId, {
        token: auth.access_token,
        expiresAt: Date.now() + auth.expires_in * 1000,
        refreshToken: auth.refresh_token,
      });

      return auth.access_token;
    } catch (error) {
      // Remove from cache if refresh fails
      this.tokenCache.delete(accountId);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(
          `Failed to refresh SS&C Geneva token: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`
        );
      }
      throw new Error(`Failed to refresh SS&C Geneva token: ${error}`);
    }
  }

  /**
   * Revoke access token for an account
   * Useful for logout or cleanup
   */
  async revokeToken(accountId: string): Promise<void> {
    const cached = this.tokenCache.get(accountId);
    if (!cached) {
      return;
    }

    try {
      await axios.post(
        `${this.apiUrl}/oauth2/revoke`,
        new URLSearchParams({
          token: cached.token,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );
    } catch (error) {
      console.warn(`Failed to revoke token for account ${accountId}`, error);
    } finally {
      // Always remove from cache
      this.tokenCache.delete(accountId);
    }
  }

  /**
   * Clear all cached tokens
   * Useful for testing or cleanup
   */
  clearCache(): void {
    this.tokenCache.clear();
  }

  /**
   * Get token expiry time for an account
   * Returns null if no token is cached
   */
  getTokenExpiry(accountId: string): Date | null {
    const cached = this.tokenCache.get(accountId);
    return cached ? new Date(cached.expiresAt) : null;
  }

  /**
   * Check if token is cached and valid
   */
  hasValidToken(accountId: string): boolean {
    const cached = this.tokenCache.get(accountId);
    return !!(cached && cached.expiresAt > Date.now() + this.TOKEN_BUFFER_MS);
  }
}

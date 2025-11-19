// White-Label Agent - Task WL-006: Custom SSO Configuration
// Handles SAML, OIDC, and OAuth authentication for white-label tenants

import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

export type SSOProvider = 'SAML' | 'OIDC' | 'OAUTH';

export interface SSOConfigParams {
  provider: SSOProvider;
  name: string;
  config: Record<string, any>;
  metadataUrl?: string;
  metadataXml?: string;
  clientId?: string;
  clientSecret?: string;
  discoveryUrl?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export class WhiteLabelAuthService {
  /**
   * Configure SSO connection for tenant
   */
  async configureSSOConnection(
    tenantId: string,
    params: SSOConfigParams
  ) {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Validate based on provider
    this.validateSSOConfig(params);

    const ssoConfig = await db.ssoConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        provider: params.provider,
        name: params.name,
        config: params.config,
        metadataUrl: params.metadataUrl,
        metadataXml: params.metadataXml,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        discoveryUrl: params.discoveryUrl,
        enabled: true,
      },
      update: {
        provider: params.provider,
        name: params.name,
        config: params.config,
        metadataUrl: params.metadataUrl,
        metadataXml: params.metadataXml,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        discoveryUrl: params.discoveryUrl,
      },
    });

    return ssoConfig;
  }

  /**
   * Validate SSO configuration
   */
  private validateSSOConfig(params: SSOConfigParams): void {
    if (params.provider === 'SAML') {
      if (!params.metadataUrl && !params.metadataXml) {
        throw new Error('SAML requires either metadataUrl or metadataXml');
      }
    }

    if (params.provider === 'OIDC') {
      if (!params.clientId || !params.clientSecret || !params.discoveryUrl) {
        throw new Error('OIDC requires clientId, clientSecret, and discoveryUrl');
      }
    }

    if (params.provider === 'OAUTH') {
      if (!params.clientId || !params.clientSecret) {
        throw new Error('OAuth requires clientId and clientSecret');
      }
    }
  }

  /**
   * Get SSO login URL for tenant
   */
  async getSSOLoginUrl(tenantId: string): Promise<string> {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
      include: { ssoConfig: true },
    });

    if (!tenant?.ssoConfig || !tenant.ssoConfig.enabled) {
      throw new Error('SSO not configured for tenant');
    }

    const config = tenant.ssoConfig;

    switch (config.provider) {
      case 'SAML':
        return this.getSAMLLoginUrl(tenantId, config);
      case 'OIDC':
        return this.getOIDCLoginUrl(tenantId, config);
      case 'OAUTH':
        return this.getOAuthLoginUrl(tenantId, config);
      default:
        throw new Error('Unsupported SSO provider');
    }
  }

  /**
   * Get SAML login URL
   */
  private async getSAMLLoginUrl(tenantId: string, config: any): Promise<string> {
    // In production, integrate with @boxyhq/saml-jackson or similar
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/auth/saml/callback?tenant=${tenantId}`;

    // Return SSO provider's login URL with callback
    return `${config.metadataUrl}/sso?callback=${encodeURIComponent(callbackUrl)}`;
  }

  /**
   * Get OIDC login URL
   */
  private async getOIDCLoginUrl(tenantId: string, config: any): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/oidc/callback`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: redirectUri,
      state: tenantId,
    });

    return `${config.discoveryUrl}/authorize?${params.toString()}`;
  }

  /**
   * Get OAuth login URL
   */
  private async getOAuthLoginUrl(tenantId: string, config: any): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/oauth/callback`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      state: tenantId,
    });

    const authUrl = config.config?.authorizationUrl || config.discoveryUrl;
    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Handle SSO callback and create/update user
   * Just-in-time (JIT) user provisioning
   */
  async handleSSOCallback(
    tenantId: string,
    profile: UserProfile
  ): Promise<{ user: any; token: string; redirectUrl: string }> {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
      include: { ssoConfig: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get or create user in tenant
    let user = await db.tenantUser.findFirst({
      where: {
        tenantId,
        email: profile.email,
      },
    });

    if (!user) {
      // Just-in-time provisioning
      const name = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();

      user = await db.tenantUser.create({
        data: {
          tenantId,
          email: profile.email,
          name: name || profile.email,
          externalId: profile.id,
          role: 'INVESTOR', // Default role
        },
      });
    } else {
      // Update last login
      user = await db.tenantUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Create session token
    const token = await this.createSessionToken(user);

    // Redirect to portal
    const redirectUrl = `/${tenant.subdomain}/portal`;

    return {
      user,
      token,
      redirectUrl,
    };
  }

  /**
   * Create session token for tenant user
   */
  async createSessionToken(user: any): Promise<string> {
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        type: 'tenant_user',
      },
      secret,
      { expiresIn: '7d' }
    );

    return token;
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string): any {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user from session token
   */
  async getUserFromToken(token: string) {
    const payload = this.verifySessionToken(token);

    if (payload.type !== 'tenant_user') {
      throw new Error('Invalid token type');
    }

    const user = await db.tenantUser.findUnique({
      where: { id: payload.userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Disable SSO for tenant
   */
  async disableSSO(tenantId: string) {
    return db.ssoConfig.update({
      where: { tenantId },
      data: { enabled: false },
    });
  }

  /**
   * Enable SSO for tenant
   */
  async enableSSO(tenantId: string) {
    return db.ssoConfig.update({
      where: { tenantId },
      data: { enabled: true },
    });
  }

  /**
   * Delete SSO configuration
   */
  async deleteSSOConfig(tenantId: string) {
    return db.ssoConfig.delete({
      where: { tenantId },
    });
  }

  /**
   * Test SSO connection
   */
  async testSSOConnection(tenantId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const url = await this.getSSOLoginUrl(tenantId);

      if (!url) {
        return {
          success: false,
          error: 'Failed to generate SSO URL',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get SSO metadata for tenant (for SP-initiated flows)
   */
  async getSSOMetadata(tenantId: string) {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
      include: { ssoConfig: true },
    });

    if (!tenant?.ssoConfig) {
      throw new Error('SSO not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return {
      entityId: `${baseUrl}/tenant/${tenantId}`,
      assertionConsumerServiceUrl: `${baseUrl}/api/auth/saml/acs`,
      singleLogoutServiceUrl: `${baseUrl}/api/auth/saml/slo`,
    };
  }
}

/**
 * Singleton instance
 */
export const whiteLabelAuthService = new WhiteLabelAuthService();

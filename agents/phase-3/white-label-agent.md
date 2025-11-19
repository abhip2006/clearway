# White-Label Agent

## Role

Specialized agent responsible for delivering a white-label platform enabling fund administrators to offer branded capital call management portals to their investors. Provides complete multi-tenant architecture with custom branding, domains, authentication, API access, and admin controls. Transforms Clearway into a platform-as-a-service (PaaS) solution for RIA firms, family offices, and alternative fund managers.

## Primary Responsibilities

1. **White-Label Platform**
   - Fund administrator branding (logo, colors, fonts)
   - Custom subdomain provisioning
   - Custom domain support (CNAME)
   - Branded investor portal
   - White-labeled mobile experience

2. **Multi-Tenant Architecture**
   - Tenant-per-fund-admin isolation
   - Data separation and security
   - Shared infrastructure efficiency
   - Tenant configuration management
   - Tenant resource limits

3. **Custom Authentication**
   - Fund admin SSO integration
   - Support for Okta, Azure AD, Auth0
   - Investor authentication customization
   - SAML/OIDC configuration
   - Just-in-time user provisioning

4. **Branding & Customization**
   - Dynamic CSS theming
   - Logo and image management
   - Email template customization
   - Custom domain routing
   - Mobile app white-labeling

5. **API & Integration**
   - White-label API keys per tenant
   - Rate limiting per tenant
   - API usage analytics
   - Webhook management
   - Third-party integration layer

6. **Admin Portal**
   - Tenant configuration dashboard
   - Branding management interface
   - User and permission management
   - API key generation
   - Usage analytics and billing
   - Support ticket system

## Tech Stack

### Multi-Tenancy & Isolation
- **PostgreSQL Row-Level Security (RLS)**
- **Tenant context middleware**
- **Dynamic schema routing**
- **Subdomain-based routing**

### Branding & Theming
- **Tailwind CSS CSS variables**
- **Next.js dynamic theming**
- **S3 for asset storage**
- **CDN for image delivery**

### Authentication
- **Clerk with enterprise SSO**
- **BoxyHQ SAML Jackson**
- **OAuth 2.0 with PKCE**
- **JWT with tenant claims**

### API Management
- **Express.js with tenant context**
- **Rate limiting per tenant**
- **API key management**
- **OpenAPI/Swagger documentation**

### Admin Portal
- **React with TypeScript**
- **Admin-only routes**
- **Dashboard analytics**
- **Configuration forms**

## Phase 3 Features

### Week 37: White-Label Architecture & Tenant Isolation

**Task WL-001: Tenant Context & Middleware**

```typescript
// lib/white-label/tenant-context.ts

import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { cache } from 'react';

/**
 * Get tenant context from subdomain, custom domain, or header
 */
export const getTenantContext = cache(async () => {
  const headersList = headers();
  const host = headersList.get('host') || '';

  let tenant: Tenant | null = null;

  // Try custom domain first
  tenant = await db.whiteLabelTenant.findUnique({
    where: { customDomain: host },
    include: {
      fundAdmin: true,
      brandingConfig: true,
      ssoConfig: true,
    },
  });

  // Try subdomain
  if (!tenant) {
    const subdomain = host.split('.')[0];
    if (subdomain && !['app', 'www', 'api'].includes(subdomain)) {
      tenant = await db.whiteLabelTenant.findUnique({
        where: { subdomain },
        include: {
          fundAdmin: true,
          brandingConfig: true,
          ssoConfig: true,
        },
      });
    }
  }

  // Try x-tenant-id header (for API requests)
  if (!tenant) {
    const tenantId = headersList.get('x-tenant-id');
    if (tenantId) {
      tenant = await db.whiteLabelTenant.findUnique({
        where: { id: tenantId },
        include: {
          fundAdmin: true,
          brandingConfig: true,
          ssoConfig: true,
        },
      });
    }
  }

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return {
    tenantId: tenant.id,
    fundAdminId: tenant.fundAdminId,
    brandingConfig: tenant.brandingConfig,
    ssoConfig: tenant.ssoConfig,
    customDomain: tenant.customDomain,
    subdomain: tenant.subdomain,
    status: tenant.status,
  };
});

/**
 * Type for tenant context
 */
export type TenantContext = Awaited<ReturnType<typeof getTenantContext>>;
```

**Task WL-002: Tenant Isolation Middleware**

```typescript
// lib/white-label/isolation.ts

import { db } from '@/lib/db';
import { TenantContext, getTenantContext } from './tenant-context';

/**
 * Database query wrapper with tenant filtering
 */
export function withTenantIsolation(tenantId: string) {
  return db.$extends({
    query: {
      capitalCall: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          };
          return query(args);
        },
        async create({ args, query }) {
          args.data = {
            ...args.data,
            tenantId,
          };
          return query(args);
        },
        async update({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          };
          return query(args);
        },
      },
      investor: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          };
          return query(args);
        },
      },
      document: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          };
          return query(args);
        },
      },
      fund: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          };
          return query(args);
        },
      },
      // Apply to all relevant models
    },
  });
}

/**
 * Middleware for routes requiring tenant context
 */
export async function requireTenant(
  req: Request
): Promise<TenantContext> {
  try {
    const context = await getTenantContext();

    if (context.status !== 'ACTIVE') {
      throw new Error('Tenant is not active');
    }

    return context;
  } catch (error) {
    throw new Error(`Failed to get tenant context: ${error}`);
  }
}

/**
 * Verify tenant ownership
 */
export async function verifyTenantOwnership(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const member = await db.tenantMember.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });

  return member?.role === 'OWNER' || member?.role === 'ADMIN';
}
```

**Task WL-003: Subdomain & Custom Domain Routing**

```typescript
// lib/white-label/domain-routing.ts

import { db } from '@/lib/db';

/**
 * Parse host and determine tenant
 */
export async function resolveTenantFromHost(host: string) {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];

  // Check custom domain
  const customDomainTenant = await db.whiteLabelTenant.findUnique({
    where: { customDomain: hostWithoutPort },
    select: { id: true, status: true },
  });

  if (customDomainTenant?.status === 'ACTIVE') {
    return { tenantId: customDomainTenant.id, type: 'CUSTOM_DOMAIN' };
  }

  // Check subdomain
  const subdomain = hostWithoutPort.split('.')[0];
  const subdomainTenant = await db.whiteLabelTenant.findUnique({
    where: { subdomain },
    select: { id: true, status: true },
  });

  if (subdomainTenant?.status === 'ACTIVE') {
    return { tenantId: subdomainTenant.id, type: 'SUBDOMAIN' };
  }

  return null;
}

/**
 * Validate custom domain with DNS check
 */
export async function validateCustomDomain(domain: string): Promise<boolean> {
  try {
    // Check if domain exists and resolves
    const dnsPromises = require('dns').promises;

    const addresses = await dnsPromises.resolve4(domain);
    return addresses.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Generate subdomain for tenant
 */
export function generateSubdomain(fundAdminName: string): string {
  return fundAdminName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Check subdomain availability
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  const existing = await db.whiteLabelTenant.findUnique({
    where: { subdomain },
  });
  return !existing;
}
```

### Week 38: Branding & Customization Engine

**Task WL-004: Dynamic Branding System**

```typescript
// lib/white-label/branding.ts

import { db } from '@/lib/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export class BrandingService {
  /**
   * Get branding config for tenant
   */
  async getBrandingConfig(tenantId: string) {
    const config = await db.brandingConfig.findUnique({
      where: { tenantId },
    });

    return {
      primaryColor: config?.primaryColor || '#0066FF',
      secondaryColor: config?.secondaryColor || '#00D9FF',
      accentColor: config?.accentColor || '#FF6B35',
      logoUrl: config?.logoUrl,
      faviconUrl: config?.faviconUrl,
      fontFamily: config?.fontFamily || 'Inter',
      customCss: config?.customCss,
      emailHeaderColor: config?.emailHeaderColor || '#0066FF',
      emailLogoUrl: config?.emailLogoUrl,
      footerText: config?.footerText,
      supportEmail: config?.supportEmail,
      supportPhone: config?.supportPhone,
    };
  }

  /**
   * Update branding config
   */
  async updateBrandingConfig(
    tenantId: string,
    config: Partial<BrandingConfig>
  ) {
    const existing = await db.brandingConfig.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      return db.brandingConfig.create({
        data: {
          tenantId,
          ...config,
        },
      });
    }

    return db.brandingConfig.update({
      where: { tenantId },
      data: config,
    });
  }

  /**
   * Upload logo image
   */
  async uploadLogo(tenantId: string, imageBuffer: Buffer): Promise<string> {
    const optimized = await sharp(imageBuffer)
      .resize(1200, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const key = `white-label/${tenantId}/logo.webp`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: optimized,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    }));

    return `${process.env.AWS_CDN_URL}/${key}`;
  }

  /**
   * Upload favicon
   */
  async uploadFavicon(tenantId: string, imageBuffer: Buffer): Promise<string> {
    const sizes = [16, 32, 64, 128, 256];
    const faviconUrl = `${process.env.AWS_CDN_URL}/white-label/${tenantId}/favicon.ico`;

    const key = `white-label/${tenantId}/favicon.ico`;

    // Convert to ICO format
    const ico = await sharp(imageBuffer)
      .resize(256, 256)
      .toBuffer();

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: ico,
      ContentType: 'image/x-icon',
      CacheControl: 'public, max-age=31536000',
    }));

    return faviconUrl;
  }

  /**
   * Generate theme CSS for tenant
   */
  async generateThemeCSS(tenantId: string): Promise<string> {
    const config = await this.getBrandingConfig(tenantId);

    const css = `
      :root {
        --color-primary: ${config.primaryColor};
        --color-secondary: ${config.secondaryColor};
        --color-accent: ${config.accentColor};
        --font-family: '${config.fontFamily}', sans-serif;
      }

      body {
        font-family: var(--font-family);
      }

      .btn-primary {
        background-color: var(--color-primary);
      }

      .btn-secondary {
        background-color: var(--color-secondary);
      }

      a {
        color: var(--color-primary);
      }

      ${config.customCss || ''}
    `;

    const key = `white-label/${tenantId}/theme.css`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: css,
      ContentType: 'text/css',
      CacheControl: 'public, max-age=3600',
    }));

    return `${process.env.AWS_CDN_URL}/${key}`;
  }
}
```

**Task WL-005: Email Template Customization**

```typescript
// lib/white-label/email-templates.ts

import { db } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailTemplateService {
  /**
   * Get email template for tenant
   */
  async getTemplate(tenantId: string, templateType: string) {
    let template = await db.emailTemplate.findUnique({
      where: {
        tenantId_type: {
          tenantId,
          type: templateType,
        },
      },
    });

    // Fall back to default template
    if (!template) {
      template = await db.emailTemplate.findFirst({
        where: {
          type: templateType,
          isDefault: true,
        },
      });
    }

    return template;
  }

  /**
   * Update email template for tenant
   */
  async updateTemplate(
    tenantId: string,
    templateType: string,
    content: {
      subject: string;
      htmlBody: string;
      textBody?: string;
    }
  ) {
    return db.emailTemplate.upsert({
      where: {
        tenantId_type: {
          tenantId,
          type: templateType,
        },
      },
      create: {
        tenantId,
        type: templateType,
        subject: content.subject,
        htmlBody: content.htmlBody,
        textBody: content.textBody,
        isDefault: false,
      },
      update: {
        subject: content.subject,
        htmlBody: content.htmlBody,
        textBody: content.textBody,
      },
    });
  }

  /**
   * Send branded email
   */
  async sendBrandedEmail(params: {
    tenantId: string;
    templateType: string;
    to: string;
    variables: Record<string, string>;
  }) {
    const template = await this.getTemplate(params.tenantId, params.templateType);
    const branding = await db.brandingConfig.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!template) {
      throw new Error(`Template ${params.templateType} not found`);
    }

    // Replace variables in subject and body
    const subject = this.replaceVariables(template.subject, params.variables);
    const htmlBody = this.replaceVariables(
      template.htmlBody,
      params.variables,
      branding
    );

    return resend.emails.send({
      from: branding?.fromEmail || 'noreply@clearway.com',
      to: params.to,
      subject,
      html: htmlBody,
    });
  }

  private replaceVariables(
    content: string,
    variables: Record<string, string>,
    branding?: any
  ): string {
    let result = content;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Replace branding
    if (branding) {
      result = result.replace(/{{brandName}}/g, branding.companyName || 'Clearway');
      result = result.replace(/{{logoUrl}}/g, branding.logoUrl || '');
      result = result.replace(/{{supportEmail}}/g, branding.supportEmail || '');
    }

    return result;
  }
}

/**
 * Email template defaults
 */
export const DEFAULT_EMAIL_TEMPLATES = {
  CAPITAL_CALL_CREATED: {
    subject: '{{brandName}} - New Capital Call for {{fundName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2>New Capital Call</h2>

        <p>Dear {{investorName}},</p>

        <p>A new capital call has been issued for <strong>{{fundName}}</strong>:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> {{amountDue}}</p>
          <p><strong>Due Date:</strong> {{dueDate}}</p>
          <p><strong>Description:</strong> {{description}}</p>
        </div>

        <p>
          <a href="{{capitalCallLink}}" style="background-color: #0066FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Capital Call</a>
        </p>

        <p>Questions? Contact us at {{supportEmail}}</p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          {{footerText}}<br>
          <a href="{{unsubscribeLink}}" style="color: #0066FF; text-decoration: none;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  CAPITAL_CALL_APPROVED: {
    subject: '{{brandName}} - Capital Call Approved for {{fundName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="{{logoUrl}}" alt="{{brandName}}" style="max-width: 200px; margin-bottom: 20px;">

        <h2>Capital Call Approved</h2>

        <p>Your payment for the capital call in <strong>{{fundName}}</strong> has been approved.</p>

        <p><strong>Amount Paid:</strong> {{amountPaid}}</p>
        <p><strong>Date:</strong> {{paymentDate}}</p>
        <p><strong>Reference:</strong> {{paymentReference}}</p>

        <p>
          <a href="{{capitalCallLink}}" style="background-color: #0066FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Details</a>
        </p>

        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          {{footerText}}<br>
          <a href="{{unsubscribeLink}}" style="color: #0066FF; text-decoration: none;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
};
```

### Week 39: Custom Authentication & API Management

**Task WL-006: Custom SSO Configuration**

```typescript
// lib/white-label/auth.ts

import { db } from '@/lib/db';
import { SAML } from '@boxyhq/saml-jackson';
import { jwtDecode } from 'jwt-decode';

export class WhiteLabelAuthService {
  /**
   * Configure SSO for tenant
   */
  async configureSSOConnection(
    tenantId: string,
    params: {
      provider: 'SAML' | 'OIDC' | 'OAUTH';
      name: string;
      config: Record<string, any>;
      metadataUrl?: string;
      metadataXml?: string;
    }
  ) {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Validate SAML metadata if provided
    if (params.provider === 'SAML') {
      if (!params.metadataUrl && !params.metadataXml) {
        throw new Error('SAML requires either metadataUrl or metadataXml');
      }
    }

    const ssoConfig = await db.ssoConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        provider: params.provider,
        name: params.name,
        config: params.config,
        metadataUrl: params.metadataUrl,
        metadataXml: params.metadataXml,
        enabled: true,
      },
      update: {
        provider: params.provider,
        name: params.name,
        config: params.config,
        metadataUrl: params.metadataUrl,
        metadataXml: params.metadataXml,
      },
    });

    return ssoConfig;
  }

  /**
   * Get SAML login URL
   */
  async getSAMLLoginUrl(tenantId: string): Promise<string> {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
      include: { ssoConfig: true },
    });

    if (!tenant?.ssoConfig || tenant.ssoConfig.provider !== 'SAML') {
      throw new Error('SAML SSO not configured for tenant');
    }

    const saml = await SAML({
      externalUrl: process.env.NEXT_PUBLIC_APP_URL!,
      samlPath: '/api/auth/saml/acs',
      db: {
        engine: 'sql',
        type: 'postgres',
        url: process.env.DATABASE_URL!,
      },
    });

    const { apiController } = saml;

    const response = await apiController.authorize({
      tenant: tenant.subdomain || tenant.id,
      product: 'clearway',
    });

    return response.redirect_url;
  }

  /**
   * Handle SAML assertion
   */
  async handleSAMLAssertion(
    tenantId: string,
    samlResponse: string
  ): Promise<{ user: any; redirect: string }> {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const saml = await SAML({
      externalUrl: process.env.NEXT_PUBLIC_APP_URL!,
      samlPath: '/api/auth/saml/acs',
      db: {
        engine: 'sql',
        type: 'postgres',
        url: process.env.DATABASE_URL!,
      },
    });

    const { oauthController } = saml;
    const { profile } = await oauthController.samlResponse({
      SAMLResponse: samlResponse,
    });

    // Get or create user in tenant
    let user = await db.tenantUser.findFirst({
      where: {
        tenantId,
        email: profile.email,
      },
    });

    if (!user) {
      // Just-in-time provisioning
      user = await db.tenantUser.create({
        data: {
          tenantId,
          email: profile.email,
          name: profile.firstName + ' ' + profile.lastName,
          externalId: profile.id,
          role: 'INVESTOR',
        },
      });
    }

    // Create session token
    const token = await this.createSessionToken(user);

    return {
      user,
      redirect: `/${tenant.subdomain || tenant.id}/portal?token=${token}`,
    };
  }

  /**
   * Create session token for tenant user
   */
  async createSessionToken(user: any): Promise<string> {
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return token;
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
```

**Task WL-007: White-Label API Keys**

```typescript
// lib/white-label/api-keys.ts

import { db } from '@/lib/db';
import crypto from 'crypto';

export class APIKeyService {
  /**
   * Generate API key for tenant
   */
  async generateAPIKey(
    tenantId: string,
    params: {
      name: string;
      expiresIn?: number; // days
      scopes: string[];
    }
  ) {
    const tenant = await db.whiteLabelTenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const keyPrefix = `cwk_${tenant.slug}_`;
    const randomPart = crypto.randomBytes(32).toString('hex');
    const apiKey = keyPrefix + randomPart;

    // Hash the API key for storage
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const expiresAt = params.expiresIn
      ? new Date(Date.now() + params.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    const key = await db.apiKey.create({
      data: {
        tenantId,
        name: params.name,
        hashedKey,
        scopes: params.scopes,
        expiresAt,
        lastUsedAt: null,
      },
    });

    return {
      id: key.id,
      apiKey, // Only returned once
      name: key.name,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    };
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey: string): Promise<{
    tenantId: string;
    scopes: string[];
  } | null> {
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const key = await db.apiKey.findUnique({
      where: { hashedKey },
      include: { tenant: true },
    });

    if (!key) {
      return null;
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      return null;
    }

    // Check if revoked
    if (key.revokedAt) {
      return null;
    }

    // Update last used
    await db.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      tenantId: key.tenantId,
      scopes: key.scopes,
    };
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(tenantId: string, keyId: string) {
    const key = await db.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key || key.tenantId !== tenantId) {
      throw new Error('API key not found');
    }

    return db.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * List API keys for tenant
   */
  async listAPIKeys(tenantId: string) {
    return db.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        scopes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

/**
 * API key validation middleware
 */
export async function validateAPIKeyMiddleware(
  req: Request
): Promise<{ tenantId: string; scopes: string[] } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  const keyService = new APIKeyService();

  return keyService.validateAPIKey(apiKey);
}
```

### Week 40: Admin Portal & Analytics

**Task WL-008: Fund Admin Portal**

```typescript
// app/admin/dashboard/page.tsx

import { getTenantContext } from '@/lib/white-label/tenant-context';
import { db } from '@/lib/db';
import TenantDashboard from '@/components/admin/tenant-dashboard';

export default async function AdminDashboard() {
  const tenant = await getTenantContext();

  // Get tenant statistics
  const stats = await db.whiteLabelTenant.findUnique({
    where: { id: tenant.tenantId },
    include: {
      _count: {
        select: {
          capitalCalls: true,
          investors: true,
          documents: true,
          users: true,
        },
      },
    },
  });

  // Get recent activity
  const recentActivity = await db.auditLog.findMany({
    where: { tenantId: tenant.tenantId },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  // Get API usage
  const apiUsage = await db.apiUsageLog.findMany({
    where: { tenantId: tenant.tenantId },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  const monthlyAPIUsage = apiUsage.reduce((acc, log) => {
    const month = log.createdAt.toISOString().substring(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <TenantDashboard
      tenantId={tenant.tenantId}
      stats={stats}
      recentActivity={recentActivity}
      monthlyAPIUsage={monthlyAPIUsage}
    />
  );
}
```

```typescript
// app/admin/branding/page.tsx

import { getTenantContext } from '@/lib/white-label/tenant-context';
import BrandingManager from '@/components/admin/branding-manager';
import { BrandingService } from '@/lib/white-label/branding';

export default async function BrandingPage() {
  const tenant = await getTenantContext();
  const brandingService = new BrandingService();
  const config = await brandingService.getBrandingConfig(tenant.tenantId);

  return <BrandingManager tenantId={tenant.tenantId} initialConfig={config} />;
}
```

```typescript
// app/admin/users/page.tsx

import { getTenantContext } from '@/lib/white-label/tenant-context';
import { db } from '@/lib/db';
import UserManagement from '@/components/admin/user-management';

export default async function UsersPage() {
  const tenant = await getTenantContext();

  const users = await db.tenantUser.findMany({
    where: { tenantId: tenant.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return <UserManagement tenantId={tenant.tenantId} users={users} />;
}
```

```typescript
// app/admin/api-keys/page.tsx

import { getTenantContext } from '@/lib/white-label/tenant-context';
import { APIKeyService } from '@/lib/white-label/api-keys';
import APIKeyManager from '@/components/admin/api-key-manager';

export default async function APIKeysPage() {
  const tenant = await getTenantContext();
  const keyService = new APIKeyService();
  const keys = await keyService.listAPIKeys(tenant.tenantId);

  return <APIKeyManager tenantId={tenant.tenantId} keys={keys} />;
}
```

## Database Schema Additions

```prisma
// White-label tenant management
model WhiteLabelTenant {
  id              String   @id @default(cuid())
  fundAdminId     String
  fundAdmin       User     @relation(fields: [fundAdminId], references: [id])

  slug            String   @unique
  subdomain       String   @unique
  customDomain    String?  @unique
  status          String   @default("ACTIVE") // ACTIVE, PAUSED, SUSPENDED

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  pausedAt        DateTime?

  // Relations
  brandingConfig  BrandingConfig?
  ssoConfig       SSOConfig?
  emailTemplates  EmailTemplate[]
  users           TenantUser[]
  apiKeys         APIKey[]
  capitalCalls    CapitalCall[]
  investors       Investor[]
  documents       Document[]
  auditLogs       AuditLog[]

  // Billing
  plan            String   @default("STARTER") // STARTER, PROFESSIONAL, ENTERPRISE
  monthlyAPIQuota Int      @default(10000)

  @@index([fundAdminId])
  @@index([status])
}

// Branding configuration
model BrandingConfig {
  id                String   @id @default(cuid())
  tenantId          String   @unique
  tenant            WhiteLabelTenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Colors
  primaryColor      String   @default("#0066FF")
  secondaryColor    String   @default("#00D9FF")
  accentColor       String   @default("#FF6B35")

  // Images
  logoUrl           String?
  faviconUrl        String?
  emailHeaderColor  String   @default("#0066FF")
  emailLogoUrl      String?

  // Typography
  fontFamily        String   @default("Inter")

  // Custom CSS
  customCss         String?

  // Contact Info
  companyName       String?
  supportEmail      String?
  supportPhone      String?
  footerText        String?
  fromEmail         String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([tenantId])
}

// SSO Configuration
model SSOConfig {
  id                String   @id @default(cuid())
  tenantId          String   @unique
  tenant            WhiteLabelTenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  provider          String   // SAML, OIDC, OAUTH
  name              String
  enabled           Boolean  @default(true)

  // SAML specific
  metadataUrl       String?
  metadataXml       String?

  // OIDC specific
  clientId          String?
  clientSecret      String?
  discoveryUrl      String?

  // Config
  config            Json

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([tenantId])
}

// Email Templates
model EmailTemplate {
  id                String   @id @default(cuid())
  tenantId          String?
  tenant            WhiteLabelTenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  type              String   // CAPITAL_CALL_CREATED, CAPITAL_CALL_APPROVED, etc.
  subject           String
  htmlBody          String   @db.Text
  textBody          String?  @db.Text

  isDefault         Boolean  @default(false)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tenantId, type])
  @@index([tenantId])
  @@index([type])
}

// Tenant Users
model TenantUser {
  id                String   @id @default(cuid())
  tenantId          String
  tenant            WhiteLabelTenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  email             String
  name              String?
  externalId        String?  // From SSO provider
  role              String   @default("INVESTOR") // ADMIN, MANAGER, INVESTOR

  lastLoginAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tenantId, email])
  @@index([tenantId])
}

// API Keys
model APIKey {
  id                String   @id @default(cuid())
  tenantId          String
  tenant            WhiteLabelTenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  name              String
  hashedKey         String   @unique
  scopes            String[]

  expiresAt         DateTime?
  revokedAt         DateTime?
  lastUsedAt        DateTime?

  createdAt         DateTime @default(now())

  @@index([tenantId])
  @@index([hashedKey])
}

// Audit Logs
model AuditLog {
  id                String   @id @default(cuid())
  tenantId          String
  tenant            WhiteLabelTenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId            String?

  action            String   // CREATED, UPDATED, DELETED
  resource          String   // CapitalCall, Investor, etc.
  resourceId        String
  changes           Json?    // What was changed

  createdAt         DateTime @default(now())

  @@index([tenantId])
  @@index([createdAt])
}

// API Usage Logs
model APIUsageLog {
  id                String   @id @default(cuid())
  tenantId          String
  tenant            WhiteLabelTenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  endpoint          String
  method            String
  statusCode        Int
  responseTime      Int      // milliseconds

  createdAt         DateTime @default(now())

  @@index([tenantId])
  @@index([createdAt])
}

// Relation to existing CapitalCall model
// Add: tenantId String (required) and tenant relation
// Add: @@index([tenantId])

// Relation to existing Investor model
// Add: tenantId String (required) and tenant relation
// Add: @@index([tenantId])

// Relation to existing Document model
// Add: tenantId String (required) and tenant relation
// Add: @@index([tenantId])
```

## Implementation Timeline

### Week 37: Multi-Tenant Architecture (Days 1-7)
- **Day 1-2**: Tenant context and isolation middleware
- **Day 3-4**: Subdomain and custom domain routing
- **Day 5-6**: Database migrations for white-label tables
- **Day 7**: Testing and integration verification

**Deliverables:**
- Tenant context extraction from host
- Tenant isolation middleware
- Custom domain validation and routing
- Database schema deployment

### Week 38: Branding & Customization (Days 8-14)
- **Day 8-9**: Dynamic CSS theming system
- **Day 10-11**: Logo and image upload management
- **Day 12-13**: Email template customization engine
- **Day 14**: Testing and refinement

**Deliverables:**
- Branding service with theme generation
- Image upload and CDN integration
- Email template management system
- Template preview functionality

### Week 39: Authentication & API (Days 15-21)
- **Day 15-16**: SSO configuration (SAML/OIDC)
- **Day 17-18**: API key generation and validation
- **Day 19-20**: API rate limiting per tenant
- **Day 21**: Authentication testing and security audit

**Deliverables:**
- SSO configuration UI
- API key management system
- Rate limiting implementation
- Documentation for SSO setup

### Week 40: Admin Portal & Launch (Days 22-28)
- **Day 22-23**: Admin dashboard and analytics
- **Day 24-25**: Branding management interface
- **Day 26-27**: User and permission management
- **Day 28**: Launch preparation and QA

**Deliverables:**
- Fully functional admin portal
- Analytics dashboard
- User onboarding flows
- Production deployment

## Pricing Model

### White-Label Plans

**STARTER - $2,999/month**
- Single custom subdomain
- Basic branding (colors, logo)
- Up to 5 fund administrators
- Up to 50 investors
- 10,000 API calls/month
- 5 email template customizations
- Email support
- Standard SLA (99% uptime)

**PROFESSIONAL - $7,999/month**
- Custom domain + subdomain
- Advanced branding (fonts, CSS)
- Up to 20 fund administrators
- Up to 500 investors
- 100,000 API calls/month
- Unlimited email customizations
- SAML SSO integration
- Priority support
- SLA: 99.5% uptime
- Custom API scopes

**ENTERPRISE - Custom pricing**
- Multiple custom domains
- Full white-label with API branding
- Unlimited administrators and investors
- Custom API quota (negotiated)
- Custom SSO options (OIDC, Auth0, etc.)
- Dedicated account manager
- Custom SLA negotiation
- Custom integration support
- Private tenant infrastructure (optional)

### Additional Features (Add-ons)

- **Custom Domain Setup**: $500 one-time
- **SSO Configuration**: $1,000 (SAML) / $1,500 (OIDC)
- **Advanced Analytics**: $500/month
- **Dedicated Support Engineer**: $3,000/month
- **API Rate Limit Increase**: $0.01 per 1,000 calls over quota
- **Custom Integration**: Starting at $5,000

### Tenant Limits by Plan

| Feature | STARTER | PROFESSIONAL | ENTERPRISE |
|---------|---------|--------------|-----------|
| Subdomains | 1 | Unlimited | Unlimited |
| Custom Domains | 0 | 1 | Unlimited |
| Administrators | 5 | 20 | Unlimited |
| Investors | 50 | 500 | Unlimited |
| Capital Calls | 100 | Unlimited | Unlimited |
| API Calls/Month | 10,000 | 100,000 | Custom |
| Email Templates | 5 | Unlimited | Unlimited |
| SSO Providers | 0 | 1 | Unlimited |
| Email Customization | Basic | Advanced | Full |
| Analytics | Basic | Advanced | Advanced+ |

## Success Metrics

### Technical KPIs
- Tenant provisioning time: < 5 minutes
- API response time: < 200ms (p95)
- Platform uptime: 99.9% or higher
- DNS resolution time for custom domains: < 1 second

### Business KPIs
- Onboarding conversion rate: > 70%
- Monthly active white-label instances: > 50
- Average revenue per white-label tenant: > $4,000
- Customer satisfaction score: > 4.5/5.0
- Support ticket resolution time: < 4 hours

### User Experience KPIs
- Admin portal load time: < 2 seconds
- Branding update deployment: < 30 seconds
- Custom domain propagation: < 24 hours
- SSO setup completion: < 15 minutes

## Security Considerations

1. **Data Isolation**
   - Row-level security in PostgreSQL
   - Tenant context validation on every request
   - Encrypted tenant identifiers in URLs

2. **API Security**
   - API key rotation recommended every 90 days
   - Rate limiting per tenant and endpoint
   - CORS restrictions per subdomain
   - Request signing for sensitive operations

3. **SSO Security**
   - SAML assertions validation
   - OIDC token verification
   - JIT provisioning with role defaults
   - Session timeout enforcement

4. **Branding Security**
   - Image upload validation (MIME type, size)
   - XSS protection on custom CSS
   - Logo and asset CDN isolation
   - Content Security Policy headers per tenant

## Monitoring & Analytics

### Admin Portal Analytics
- Capital calls created/approved/rejected
- Investor engagement metrics
- Document upload/download activity
- API usage trends
- SSO login success rates
- Email delivery and open rates

### Technical Monitoring
- API latency per endpoint
- Database query performance
- Storage usage per tenant
- Active session counts
- Error rates and types

---

**White-Label Agent ready to transform Clearway into a comprehensive PaaS platform for fund administrators.**

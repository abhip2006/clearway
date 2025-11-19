// White-Label Agent - Task WL-004: Dynamic Branding System
// Manages branding configuration, logo uploads, and theme generation

import { db } from '@/lib/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface BrandingConfigInput {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
  customCss?: string;
  emailHeaderColor?: string;
  emailLogoUrl?: string;
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
  footerText?: string;
  fromEmail?: string;
}

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
      logoUrl: config?.logoUrl || null,
      faviconUrl: config?.faviconUrl || null,
      fontFamily: config?.fontFamily || 'Inter',
      customCss: config?.customCss || '',
      emailHeaderColor: config?.emailHeaderColor || '#0066FF',
      emailLogoUrl: config?.emailLogoUrl || null,
      companyName: config?.companyName || null,
      supportEmail: config?.supportEmail || null,
      supportPhone: config?.supportPhone || null,
      footerText: config?.footerText || null,
      fromEmail: config?.fromEmail || null,
    };
  }

  /**
   * Update branding config
   */
  async updateBrandingConfig(
    tenantId: string,
    config: BrandingConfigInput
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
   * Upload logo image to S3/R2 with optimization
   */
  async uploadLogo(tenantId: string, imageBuffer: Buffer): Promise<string> {
    // Validate image
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
      throw new Error('Invalid image format. Supported: JPEG, PNG, WebP, GIF');
    }

    // Optimize and convert to WebP
    const optimized = await sharp(imageBuffer)
      .resize(1200, 400, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const key = `white-label/${tenantId}/logo-${Date.now()}.webp`;
    const bucket = process.env.AWS_S3_BUCKET || 'clearway-assets';

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimized,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = process.env.AWS_CDN_URL || `https://${bucket}.s3.amazonaws.com`;
    const logoUrl = `${cdnUrl}/${key}`;

    // Update branding config with new logo URL
    await this.updateBrandingConfig(tenantId, { logoUrl });

    return logoUrl;
  }

  /**
   * Upload favicon with multiple sizes
   */
  async uploadFavicon(tenantId: string, imageBuffer: Buffer): Promise<string> {
    // Validate image
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw new Error('Invalid image format for favicon');
    }

    // Create 32x32 favicon
    const favicon = await sharp(imageBuffer)
      .resize(32, 32, { fit: 'cover' })
      .png()
      .toBuffer();

    const key = `white-label/${tenantId}/favicon-${Date.now()}.png`;
    const bucket = process.env.AWS_S3_BUCKET || 'clearway-assets';

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: favicon,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000',
    }));

    const cdnUrl = process.env.AWS_CDN_URL || `https://${bucket}.s3.amazonaws.com`;
    const faviconUrl = `${cdnUrl}/${key}`;

    // Update branding config with new favicon URL
    await this.updateBrandingConfig(tenantId, { faviconUrl });

    return faviconUrl;
  }

  /**
   * Generate theme CSS for tenant
   */
  async generateThemeCSS(tenantId: string): Promise<string> {
    const config = await this.getBrandingConfig(tenantId);

    const css = `
/* Generated theme for tenant ${tenantId} */
:root {
  --color-primary: ${config.primaryColor};
  --color-secondary: ${config.secondaryColor};
  --color-accent: ${config.accentColor};
  --font-family: '${config.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body {
  font-family: var(--font-family);
}

/* Primary button styles */
.btn-primary,
button[data-variant="primary"] {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:hover,
button[data-variant="primary"]:hover {
  background-color: color-mix(in srgb, var(--color-primary) 85%, black);
}

/* Secondary button styles */
.btn-secondary,
button[data-variant="secondary"] {
  background-color: var(--color-secondary);
  color: white;
  border: none;
}

.btn-secondary:hover,
button[data-variant="secondary"]:hover {
  background-color: color-mix(in srgb, var(--color-secondary) 85%, black);
}

/* Link styles */
a {
  color: var(--color-primary);
}

a:hover {
  color: color-mix(in srgb, var(--color-primary) 80%, black);
}

/* Accent colors */
.text-accent {
  color: var(--color-accent);
}

.bg-accent {
  background-color: var(--color-accent);
}

/* Custom CSS from tenant */
${config.customCss || ''}
    `.trim();

    // Upload to S3/R2
    const key = `white-label/${tenantId}/theme.css`;
    const bucket = process.env.AWS_S3_BUCKET || 'clearway-assets';

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: css,
      ContentType: 'text/css',
      CacheControl: 'public, max-age=3600',
    }));

    const cdnUrl = process.env.AWS_CDN_URL || `https://${bucket}.s3.amazonaws.com`;
    return `${cdnUrl}/${key}`;
  }

  /**
   * Get theme CSS variables as object
   */
  async getThemeVariables(tenantId: string): Promise<Record<string, string>> {
    const config = await this.getBrandingConfig(tenantId);

    return {
      '--color-primary': config.primaryColor,
      '--color-secondary': config.secondaryColor,
      '--color-accent': config.accentColor,
      '--font-family': config.fontFamily,
    };
  }

  /**
   * Validate color format
   */
  validateColor(color: string): boolean {
    // Hex color regex
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    // RGB/RGBA regex
    const rgbRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
    // HSL/HSLA regex
    const hslRegex = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/;

    return hexRegex.test(color) || rgbRegex.test(color) || hslRegex.test(color);
  }

  /**
   * Delete logo/favicon from storage
   */
  async deleteLogo(tenantId: string): Promise<void> {
    await this.updateBrandingConfig(tenantId, { logoUrl: null });
  }

  async deleteFavicon(tenantId: string): Promise<void> {
    await this.updateBrandingConfig(tenantId, { faviconUrl: null });
  }

  /**
   * Reset branding to defaults
   */
  async resetBranding(tenantId: string): Promise<void> {
    await db.brandingConfig.update({
      where: { tenantId },
      data: {
        primaryColor: '#0066FF',
        secondaryColor: '#00D9FF',
        accentColor: '#FF6B35',
        logoUrl: null,
        faviconUrl: null,
        fontFamily: 'Inter',
        customCss: null,
        emailHeaderColor: '#0066FF',
        emailLogoUrl: null,
      },
    });
  }
}

/**
 * Singleton instance
 */
export const brandingService = new BrandingService();

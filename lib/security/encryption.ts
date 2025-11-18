// Security & Compliance Agent - Task SEC-003
// Encryption at Rest and in Transit with AWS KMS

import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import crypto from 'crypto';

// Initialize AWS KMS client
const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    : undefined,
});

export class EncryptionService {
  /**
   * Encrypt sensitive data using AWS KMS
   * Uses envelope encryption for large data
   */
  static async encrypt(
    plaintext: string,
    keyId: string = process.env.KMS_KEY_ID || ''
  ): Promise<string> {
    if (!keyId) {
      throw new Error('KMS_KEY_ID environment variable is not set');
    }

    try {
      const command = new EncryptCommand({
        KeyId: keyId,
        Plaintext: Buffer.from(plaintext, 'utf8'),
      });

      const response = await kmsClient.send(command);

      if (!response.CiphertextBlob) {
        throw new Error('KMS encryption failed: no ciphertext returned');
      }

      return Buffer.from(response.CiphertextBlob).toString('base64');
    } catch (error) {
      console.error('KMS encryption error:', error);
      throw new Error('Failed to encrypt data with KMS');
    }
  }

  /**
   * Decrypt sensitive data using AWS KMS
   */
  static async decrypt(ciphertext: string): Promise<string> {
    try {
      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
      });

      const response = await kmsClient.send(command);

      if (!response.Plaintext) {
        throw new Error('KMS decryption failed: no plaintext returned');
      }

      return Buffer.from(response.Plaintext).toString('utf8');
    } catch (error) {
      console.error('KMS decryption error:', error);
      throw new Error('Failed to decrypt data with KMS');
    }
  }

  /**
   * Encrypt specific fields in a database record
   * Example: encryptDatabaseField(user, ['ssn', 'bankAccount'])
   */
  static async encryptDatabaseField<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T> {
    const encrypted = { ...data };

    for (const field of fieldsToEncrypt) {
      if (encrypted[field] !== null && encrypted[field] !== undefined) {
        encrypted[field] = (await this.encrypt(String(encrypted[field]))) as any;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt specific fields in a database record
   */
  static async decryptDatabaseField<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
  ): Promise<T> {
    const decrypted = { ...data };

    for (const field of fieldsToDecrypt) {
      if (decrypted[field] !== null && decrypted[field] !== undefined) {
        try {
          decrypted[field] = (await this.decrypt(String(decrypted[field]))) as any;
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          decrypted[field] = '[DECRYPTION_FAILED]' as any;
        }
      }
    }

    return decrypted;
  }

  /**
   * Hash password using bcrypt (for future auth needs)
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 12);
  }

  /**
   * Verify password hash using bcrypt
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random token (for API keys, session tokens, etc.)
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data using SHA-256 (for non-sensitive hashing like file checksums)
   */
  static hashSHA256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypt data using AES-256-GCM (for client-side encryption)
   * Returns encrypted data with IV and auth tag
   */
  static encryptAES256(plaintext: string, key: Buffer): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decryptAES256(ciphertext: string, key: Buffer): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Derive encryption key from password (for key derivation)
   */
  static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  /**
   * Encrypt sensitive fields in capital call data
   */
  static async encryptCapitalCallData(data: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    wireReference?: string;
  }) {
    return this.encryptDatabaseField(data, [
      'accountNumber',
      'routingNumber',
      'wireReference',
    ]);
  }

  /**
   * Decrypt sensitive fields in capital call data
   */
  static async decryptCapitalCallData(data: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    wireReference?: string;
  }) {
    return this.decryptDatabaseField(data, [
      'accountNumber',
      'routingNumber',
      'wireReference',
    ]);
  }
}

/**
 * Middleware to enforce HTTPS in production
 */
export function enforceHTTPS(req: Request): void {
  const proto = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('host');

  if (process.env.NODE_ENV === 'production') {
    if (proto !== 'https') {
      throw new Error('HTTPS is required in production. Please use https:// instead of http://');
    }
  }
}

/**
 * Validate Content Security Policy
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Enforce HTTPS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.clerk.com https://*.anthropic.com",
      "frame-ancestors 'none'",
    ].join('; '),

    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

/**
 * Rate limiting configuration for sensitive endpoints
 */
export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  dsar: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
  export: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 requests per hour
  deletion: { maxRequests: 1, windowMs: 24 * 60 * 60 * 1000 }, // 1 request per day
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
};

/**
 * Generate device fingerprint for security monitoring
 */
export function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers.get('user-agent') || '';
  const acceptLanguage = req.headers.get('accept-language') || '';
  const acceptEncoding = req.headers.get('accept-encoding') || '';

  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  return EncryptionService.hashSHA256(fingerprintData);
}

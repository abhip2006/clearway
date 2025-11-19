/**
 * Encryption Service
 * Handles encryption and decryption of sensitive data (OAuth tokens, API keys)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export class EncryptionService {
  private encryptionKey: Buffer;

  constructor(keyPath?: string) {
    // In production, load from secure key management system
    const key = process.env.ENCRYPTION_KEY || 'default-32-character-key-change';
    this.encryptionKey = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Return: iv + tag + encrypted data (all hex encoded)
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertext: string): string {
    const ivHex = ciphertext.slice(0, IV_LENGTH * 2);
    const tagHex = ciphertext.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2);
    const encryptedHex = ciphertext.slice((IV_LENGTH + TAG_LENGTH) * 2);

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt OAuth credentials
   */
  encryptOAuthCredentials(credentials: {
    accessToken: string;
    refreshToken: string;
  }): {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
  } {
    return {
      encryptedAccessToken: this.encrypt(credentials.accessToken),
      encryptedRefreshToken: this.encrypt(credentials.refreshToken)
    };
  }

  /**
   * Decrypt OAuth credentials
   */
  decryptOAuthCredentials(encrypted: {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
  }): {
    accessToken: string;
    refreshToken: string;
  } {
    return {
      accessToken: this.decrypt(encrypted.encryptedAccessToken),
      refreshToken: this.decrypt(encrypted.encryptedRefreshToken)
    };
  }

  /**
   * Hash API key for storage
   */
  hashApiKey(apiKey: string): string {
    return crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
  }

  /**
   * Verify hashed API key
   */
  verifyApiKey(apiKey: string, hash: string): boolean {
    return this.hashApiKey(apiKey) === hash;
  }
}

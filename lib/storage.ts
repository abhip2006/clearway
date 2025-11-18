// Cloudflare R2 Storage Client
// S3-compatible object storage configuration

import { S3Client } from '@aws-sdk/client-s3';

// Initialize R2 client with S3-compatible configuration
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Export bucket configuration
export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * CORS Configuration (set in Cloudflare R2 dashboard):
 *
 * [
 *   {
 *     "AllowedOrigins": ["https://clearway.com", "http://localhost:3000"],
 *     "AllowedMethods": ["GET", "PUT", "POST"],
 *     "AllowedHeaders": ["*"],
 *     "MaxAgeSeconds": 3000
 *   }
 * ]
 */

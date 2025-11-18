// Integration Tests for Third-Party Services
// Tests connectivity and functionality of all external integrations

import { describe, it, expect } from 'vitest';
import { r2Client, R2_BUCKET } from '@/lib/storage';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { resend } from '@/lib/email';
import { inngest } from '@/lib/inngest';

describe('Service Integrations', () => {
  describe('Cloudflare R2 Storage', () => {
    it('can upload file to R2', async () => {
      const key = `test/${Date.now()}.txt`;
      const content = 'Test file content';

      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: content,
          ContentType: 'text/plain',
        })
      );

      // File uploaded successfully if no error thrown
      expect(true).toBe(true);
    });

    it('can download file from R2', async () => {
      const key = `test/${Date.now()}.txt`;
      const content = 'Test file content';

      // Upload first
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: content,
          ContentType: 'text/plain',
        })
      );

      // Then download
      const response = await r2Client.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
        })
      );

      expect(response.Body).toBeDefined();
    });
  });

  describe('Resend Email', () => {
    it('can send test email with Resend', async () => {
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>This is a test email from Clearway integration tests</p>',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
    });

    it('handles invalid email addresses', async () => {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: 'invalid-email',
        subject: 'Test Email',
        html: '<p>This should fail</p>',
      });

      expect(error).toBeDefined();
    });
  });

  describe('Inngest Background Jobs', () => {
    it('can send event to Inngest', async () => {
      const result = await inngest.send({
        name: 'test.event',
        data: { message: 'test', timestamp: Date.now() },
      });

      expect(result).toBeDefined();
      expect(result.ids).toBeDefined();
      expect(result.ids.length).toBeGreaterThan(0);
    });

    it('can send multiple events in batch', async () => {
      const result = await inngest.send([
        {
          name: 'test.event',
          data: { message: 'test 1' },
        },
        {
          name: 'test.event',
          data: { message: 'test 2' },
        },
      ]);

      expect(result).toBeDefined();
      expect(result.ids.length).toBe(2);
    });
  });
});

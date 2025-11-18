// app/api/upload/route.ts
// Task BE-001: Upload Presigned URL Endpoint

import { auth } from '@clerk/nextjs/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@/lib/db';
import { z } from 'zod';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
  mimeType: z.literal('application/pdf'),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileSize, mimeType } = UploadRequestSchema.parse(body);

    // Generate unique file key
    const fileKey = `${userId}/${Date.now()}-${fileName}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Create document record
    const document = await db.document.create({
      data: {
        fileName,
        fileSize,
        mimeType,
        fileUrl: `${process.env.R2_PUBLIC_URL}/${fileKey}`,
        userId,
        status: 'PENDING',
      },
    });

    return Response.json({
      uploadUrl,
      documentId: document.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error('Upload error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

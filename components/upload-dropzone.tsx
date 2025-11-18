'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadDropzoneProps {
  onUploadComplete?: (documentId: string) => void;
  onUploadError?: (error: Error) => void;
}

export function UploadDropzone({ onUploadComplete, onUploadError }: UploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      for (const file of acceptedFiles) {
        // Step 1: Get presigned URL from API
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { uploadUrl, documentId } = await uploadResponse.json();

        // Step 2: Upload directly to S3/R2
        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!s3Response.ok) {
          throw new Error('Failed to upload file');
        }

        // Step 3: Trigger processing
        const processResponse = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId }),
        });

        if (!processResponse.ok) {
          throw new Error('Failed to trigger processing');
        }

        setUploadStatus('success');
        onUploadComplete?.(documentId);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
        'hover:border-primary hover:bg-primary/5',
        isDragActive && 'border-primary bg-primary/10',
        isDragReject && 'border-destructive bg-destructive/10',
        uploading && 'opacity-50 cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      aria-label="Upload PDF documents"
      role="button"
      tabIndex={0}
    >
      <input {...getInputProps()} aria-label="File input" />

      <div className="flex flex-col items-center gap-4">
        {uploading ? (
          <Loader2 className="h-12 w-12 text-primary animate-spin" aria-hidden="true" />
        ) : uploadStatus === 'success' ? (
          <CheckCircle className="h-12 w-12 text-green-500" aria-hidden="true" />
        ) : uploadStatus === 'error' ? (
          <XCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        ) : (
          <Upload className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        )}

        <div>
          <p className="text-lg font-medium">
            {uploading
              ? 'Uploading...'
              : uploadStatus === 'success'
              ? 'Upload successful!'
              : uploadStatus === 'error'
              ? 'Upload failed'
              : isDragActive
              ? 'Drop files here'
              : 'Drag & drop PDFs here'}
          </p>
          {uploadStatus === 'idle' && !uploading && (
            <p className="text-sm text-muted-foreground mt-2">
              or click to browse (max 10MB per file)
            </p>
          )}
          {uploadStatus === 'error' && errorMessage && (
            <p className="text-sm text-destructive mt-2" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

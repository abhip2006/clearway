'use client';

import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadQueue, validateFiles } from '@/lib/upload-queue';
import { toast } from '@/lib/toast';

interface UploadDropzoneProps {
  onUploadComplete?: (documentId: string) => void;
  onUploadError?: (error: Error) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onUploadComplete, onUploadError, disabled = false }: UploadDropzoneProps) {
  const { files, addFiles } = useUploadQueue();

  // Notify parent component when uploads complete
  useEffect(() => {
    const completedFiles = files.filter((f) => f.status === 'complete' && f.documentId);
    completedFiles.forEach((file) => {
      if (file.documentId) {
        onUploadComplete?.(file.documentId);
      }
    });
  }, [files, onUploadComplete]);

  // Notify parent component of errors
  useEffect(() => {
    const errorFiles = files.filter((f) => f.status === 'error');
    errorFiles.forEach((file) => {
      if (file.error) {
        onUploadError?.(new Error(file.error));
      }
    });
  }, [files, onUploadError]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejected) => {
          const errors = rejected.errors.map((e: any) => e.message).join(', ');
          toast.error('File rejected', `${rejected.file.name}: ${errors}`);
        });
      }

      if (acceptedFiles.length === 0) return;

      // Validate files
      const validation = validateFiles(acceptedFiles);
      if (!validation.valid) {
        validation.errors.forEach((error) => {
          toast.error('Invalid file', error);
        });
        return;
      }

      try {
        // Add files to queue
        addFiles(acceptedFiles);

        toast.success(
          'Files added to queue',
          `${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''} will be uploaded`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add files';
        toast.error('Upload error', message);
      }
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    multiple: true,
    disabled: disabled,
  });

  const hasActiveUploads = files.some(
    (f) => f.status === 'uploading' || f.status === 'processing'
  );

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
        'hover:border-primary hover:bg-primary/5',
        isDragActive && 'border-primary bg-primary/10 scale-[1.02]',
        isDragReject && 'border-destructive bg-destructive/10',
        disabled && 'opacity-50 cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      aria-label="Upload PDF documents"
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <input {...getInputProps()} aria-label="File input" />

      <div className="flex flex-col items-center gap-4">
        {isDragActive ? (
          <FileUp className="h-12 w-12 text-primary animate-bounce" aria-hidden="true" />
        ) : (
          <Upload className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        )}

        <div>
          <p className="text-lg font-medium">
            {isDragActive
              ? 'Drop files here'
              : hasActiveUploads
              ? 'Drop more files or click to browse'
              : 'Drag & drop PDFs here'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            or click to browse (max 10 files, 10MB each)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports parallel uploads with progress tracking
          </p>
        </div>
      </div>
    </div>
  );
}

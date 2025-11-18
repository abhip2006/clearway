'use client';

import { FileText, X, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { UploadFile, UploadStatus } from '@/lib/upload-queue';

interface UploadProgressProps {
  file: UploadFile;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}

export function UploadProgress({ file, onCancel, onRetry }: UploadProgressProps) {
  const { id, fileName, fileSize, progress, status, error } = file;

  const statusConfig: Record<
    UploadStatus,
    { icon: any; label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'error'; color: string }
  > = {
    queued: {
      icon: Loader2,
      label: 'Queued',
      variant: 'secondary',
      color: 'text-gray-500',
    },
    uploading: {
      icon: Loader2,
      label: 'Uploading',
      variant: 'default',
      color: 'text-blue-500',
    },
    processing: {
      icon: Loader2,
      label: 'Processing',
      variant: 'warning',
      color: 'text-yellow-500',
    },
    complete: {
      icon: CheckCircle,
      label: 'Complete',
      variant: 'success',
      color: 'text-green-500',
    },
    error: {
      icon: AlertCircle,
      label: 'Failed',
      variant: 'error',
      color: 'text-red-500',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isAnimating = status === 'uploading' || status === 'processing' || status === 'queued';

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4 shadow-sm transition-all',
        status === 'error' && 'border-red-200 bg-red-50',
        status === 'complete' && 'border-green-200 bg-green-50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* File Icon */}
        <div
          className={cn(
            'flex-shrink-0 rounded-lg p-2',
            status === 'error' ? 'bg-red-100' : 'bg-gray-100'
          )}
        >
          <FileText
            className={cn('h-6 w-6', status === 'error' ? 'text-red-600' : 'text-gray-600')}
          />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                title={fileName}
              >
                {fileName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatFileSize(fileSize)}
              </p>
            </div>

            {/* Status Badge */}
            <Badge variant={config.variant} className="flex items-center gap-1 flex-shrink-0">
              <StatusIcon
                className={cn('h-3 w-3', isAnimating && 'animate-spin')}
              />
              {config.label}
            </Badge>
          </div>

          {/* Progress Bar */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="mb-2">
              <Progress
                value={progress}
                variant={status === 'processing' ? 'warning' : 'default'}
                className="h-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(progress)}% {status === 'processing' ? '(Processing document)' : ''}
              </p>
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <div className="mb-2">
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {status === 'error' && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(id)}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}

            {(status === 'uploading' || status === 'queued') && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel(id)}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Format file size to human-readable format
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Component to show overall upload progress
interface UploadSummaryProps {
  totalFiles: number;
  completedFiles: number;
  errorFiles: number;
  uploadingFiles: number;
}

export function UploadSummary({
  totalFiles,
  completedFiles,
  errorFiles,
  uploadingFiles,
}: UploadSummaryProps) {
  if (totalFiles === 0) return null;

  const progressPercentage = (completedFiles / totalFiles) * 100;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Upload Progress</h3>
        <p className="text-sm text-gray-600">
          {completedFiles} of {totalFiles} complete
        </p>
      </div>

      <Progress value={progressPercentage} className="h-2 mb-2" />

      <div className="flex items-center gap-4 text-xs text-gray-600">
        {uploadingFiles > 0 && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
            {uploadingFiles} uploading
          </span>
        )}
        {completedFiles > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {completedFiles} completed
          </span>
        )}
        {errorFiles > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            {errorFiles} failed
          </span>
        )}
      </div>
    </div>
  );
}

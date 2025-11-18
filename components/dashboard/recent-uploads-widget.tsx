'use client';

import { useUploadQueue } from '@/lib/upload-queue';
import { useUploadStats, formatDuration, formatBytes } from '@/lib/analytics/upload-tracking';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Upload as UploadIcon,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export function RecentUploadsWidget() {
  const { files } = useUploadQueue();
  const stats = useUploadStats();

  // Get last 5 uploads (including current queue)
  const recentUploads = files.slice(-5).reverse();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
            <CardDescription>Latest document uploads and processing status</CardDescription>
          </div>
          <Link href="/upload">
            <Button size="sm" variant="outline">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {/* Upload Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold">
                {stats.successRate.toFixed(0)}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-2xl font-bold">
                {formatDuration(stats.averageUploadTime)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Avg Time</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileText className="h-4 w-4 text-purple-600" />
              <p className="text-2xl font-bold">{stats.totalUploads}</p>
            </div>
            <p className="text-xs text-muted-foreground">Total Uploads</p>
          </div>
        </div>

        {/* Recent uploads list */}
        {recentUploads.length > 0 ? (
          <div className="space-y-3">
            {recentUploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 rounded p-2 bg-gray-100">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={upload.fileName}>
                    {upload.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(upload.fileSize)}
                    {upload.uploadedAt && (
                      <> • {new Date(upload.uploadedAt).toLocaleTimeString()}</>
                    )}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {upload.status === 'complete' ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  ) : upload.status === 'error' ? (
                    <Badge variant="error" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  ) : upload.status === 'uploading' || upload.status === 'processing' ? (
                    <Badge variant="default" className="text-xs">
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                      {upload.status === 'uploading' ? 'Uploading' : 'Processing'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Queued
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="rounded-full bg-gray-100 p-3 inline-flex mb-3">
              <UploadIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">No recent uploads</p>
            <Link href="/upload">
              <Button size="sm">
                Upload Documents
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for smaller dashboard widgets
export function RecentUploadsCompact() {
  const { files } = useUploadQueue();
  const recentUploads = files.slice(-3).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UploadIcon className="h-4 w-4" />
          Recent Uploads
        </CardTitle>
      </CardHeader>

      <CardContent>
        {recentUploads.length > 0 ? (
          <div className="space-y-2">
            {recentUploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-2 text-sm"
              >
                <div className="flex-shrink-0">
                  {upload.status === 'complete' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : upload.status === 'error' ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                  )}
                </div>
                <p className="flex-1 truncate text-xs" title={upload.fileName}>
                  {upload.fileName}
                </p>
              </div>
            ))}
            <Link href="/upload">
              <Button size="sm" variant="ghost" className="w-full mt-2 text-xs">
                View All
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-2">No uploads yet</p>
            <Link href="/upload">
              <Button size="sm" className="text-xs">
                Upload Files
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { FileText, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  fileName: string;
  uploadedAt: Date;
  status: 'PENDING' | 'PROCESSING' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'FAILED';
}

interface DocumentListProps {
  documents: Document[];
  onDocumentClick?: (documentId: string) => void;
}

export function DocumentList({ documents, onDocumentClick }: DocumentListProps) {
  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'PROCESSING':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'REVIEW':
        return <FileText className="h-4 w-4" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: Document['status']) => {
    const variants: Record<Document['status'], 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
      PENDING: 'secondary',
      PROCESSING: 'warning',
      REVIEW: 'outline',
      APPROVED: 'success',
      REJECTED: 'destructive',
      FAILED: 'destructive',
    };

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span>{status}</span>
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={cn(
            'flex items-center justify-between p-4 border rounded-lg transition-colors',
            'hover:bg-accent cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          onClick={() => onDocumentClick?.(doc.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDocumentClick?.(doc.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Document: ${doc.fileName}, Status: ${doc.status}`}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="p-2 bg-primary/10 rounded">
              <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(doc.uploadedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(doc.status)}
            {doc.status === 'REVIEW' && (
              <Button variant="outline" size="sm" onClick={() => onDocumentClick?.(doc.id)}>
                Review
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

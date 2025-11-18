import { FileX, Upload, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'file' | 'calendar' | 'upload' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = 'file',
  action,
  className,
}: EmptyStateProps) {
  const Icon = {
    file: FileX,
    calendar: Calendar,
    upload: Upload,
    error: AlertCircle,
  }[icon];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>

      {action && (
        <Button onClick={action.onClick}>
          {icon === 'upload' && <Upload className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Specific empty states for common scenarios
export function NoDocumentsState({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <EmptyState
      icon="file"
      title="No documents yet"
      description="Upload your first capital call document to get started with AI-powered extraction."
      action={
        onUploadClick
          ? {
              label: 'Upload Document',
              onClick: onUploadClick,
            }
          : undefined
      }
    />
  );
}

export function NoCalendarEventsState({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <EmptyState
      icon="calendar"
      title="No capital calls scheduled"
      description="Your calendar is empty. Upload and approve documents to see capital calls here."
      action={
        onUploadClick
          ? {
              label: 'Upload Document',
              onClick: onUploadClick,
            }
          : undefined
      }
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this page. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="error"
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

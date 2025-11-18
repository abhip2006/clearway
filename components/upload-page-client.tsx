'use client';

import { useEffect } from 'react';
import { UploadDropzone } from '@/components/upload-dropzone';
import { UploadProgress, UploadSummary } from '@/components/upload-progress';
import { ToastContainer } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { useUploadQueue } from '@/lib/upload-queue';
import { toast } from '@/lib/toast';
import { Trash2, CheckCircle } from 'lucide-react';

export function UploadPageClient() {
  const { files, cancelUpload, retryUpload, clearCompleted } = useUploadQueue();

  // Calculate statistics
  const totalFiles = files.length;
  const completedFiles = files.filter((f) => f.status === 'complete').length;
  const errorFiles = files.filter((f) => f.status === 'error').length;
  const uploadingFiles = files.filter(
    (f) => f.status === 'uploading' || f.status === 'processing'
  ).length;
  const queuedFiles = files.filter((f) => f.status === 'queued').length;

  // Show success notification when all files complete
  useEffect(() => {
    if (totalFiles > 0 && completedFiles === totalFiles && errorFiles === 0) {
      toast.success(
        'All uploads complete!',
        `Successfully uploaded ${totalFiles} file${totalFiles > 1 ? 's' : ''}`
      );
    }
  }, [totalFiles, completedFiles, errorFiles]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + U: Focus upload area
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        const dropzone = document.querySelector('[aria-label="Upload PDF documents"]');
        if (dropzone instanceof HTMLElement) {
          dropzone.focus();
          dropzone.click();
        }
      }

      // Escape: Clear completed uploads
      if (e.key === 'Escape' && completedFiles > 0) {
        clearCompleted();
        toast.info('Cleared completed uploads');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [clearCompleted, completedFiles]);

  return (
    <>
      {/* Toast notifications */}
      <ToastContainer />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Upload section */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Upload Documents</h2>
              <div className="text-xs text-muted-foreground hidden sm:block">
                <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+U</kbd> to upload
              </div>
            </div>
            <UploadDropzone />
          </div>

          {/* Upload Summary */}
          {totalFiles > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Upload Queue</h3>
                {completedFiles > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearCompleted}
                    className="text-xs h-8"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear Completed
                  </Button>
                )}
              </div>

              <UploadSummary
                totalFiles={totalFiles}
                completedFiles={completedFiles}
                errorFiles={errorFiles}
                uploadingFiles={uploadingFiles}
              />
            </div>
          )}
        </div>

        {/* Upload Progress List */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            {totalFiles > 0 ? `Files (${totalFiles})` : 'Upload Status'}
          </h2>

          {totalFiles > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {files.map((file) => (
                <UploadProgress
                  key={file.id}
                  file={file}
                  onCancel={cancelUpload}
                  onRetry={retryUpload}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center border-2 border-dashed rounded-lg">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <CheckCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-muted-foreground font-medium">No uploads yet</p>
              <p className="text-sm text-muted-foreground mt-2 px-4">
                Upload your first capital call to get started
              </p>
              <p className="text-xs text-muted-foreground mt-4 max-w-sm px-4">
                You can upload up to 10 PDF files at once. Files will be processed in parallel with real-time progress updates.
              </p>
            </div>
          )}

          {/* Queue Status */}
          {queuedFiles > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                {queuedFiles} file{queuedFiles > 1 ? 's' : ''} queued for upload
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-gray-50 rounded-lg border">
        <h3 className="text-base sm:text-lg font-semibold mb-3">Batch Upload Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Batch upload up to 10 files</li>
              <li>Parallel processing (3 concurrent uploads)</li>
              <li>Real-time progress tracking</li>
              <li>Automatic retry with exponential backoff</li>
              <li>Cancel individual uploads</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Requirements:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>PDF files only</li>
              <li>Maximum 10MB per file</li>
              <li>Maximum 10 files per batch</li>
              <li>Drag & drop or click to browse</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

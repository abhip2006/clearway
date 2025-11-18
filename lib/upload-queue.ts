import { create } from 'zustand';

export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'complete' | 'error';

export interface UploadFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  documentId?: string;
  abortController?: AbortController;
  retryCount: number;
  uploadedAt?: Date;
}

interface UploadQueueState {
  files: UploadFile[];
  maxConcurrent: number;
  activeUploads: number;

  // Actions
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  updateFileProgress: (id: string, progress: number) => void;
  updateFileStatus: (id: string, status: UploadStatus, error?: string) => void;
  setDocumentId: (id: string, documentId: string) => void;
  retryUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
  reset: () => void;

  // Queue management
  processQueue: () => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay
const MAX_FILES = 10;

// Generate unique ID for each upload
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Exponential backoff calculation
function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount);
}

export const useUploadQueue = create<UploadQueueState>((set, get) => ({
  files: [],
  maxConcurrent: 3,
  activeUploads: 0,

  addFiles: (newFiles: File[]) => {
    const currentFiles = get().files;
    const totalFiles = currentFiles.length + newFiles.length;

    if (totalFiles > MAX_FILES) {
      throw new Error(`Maximum ${MAX_FILES} files allowed`);
    }

    const uploadFiles: UploadFile[] = newFiles.map((file) => ({
      id: generateId(),
      file,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'queued' as UploadStatus,
      retryCount: 0,
      abortController: new AbortController(),
    }));

    set({ files: [...currentFiles, ...uploadFiles] });

    // Start processing queue
    setTimeout(() => get().processQueue(), 0);
  },

  removeFile: (id: string) => {
    const file = get().files.find((f) => f.id === id);
    if (file?.abortController) {
      file.abortController.abort();
    }
    set({ files: get().files.filter((f) => f.id !== id) });
  },

  updateFileProgress: (id: string, progress: number) => {
    set({
      files: get().files.map((f) =>
        f.id === id ? { ...f, progress: Math.min(100, Math.max(0, progress)) } : f
      ),
    });
  },

  updateFileStatus: (id: string, status: UploadStatus, error?: string) => {
    set({
      files: get().files.map((f) =>
        f.id === id
          ? {
              ...f,
              status,
              error,
              uploadedAt: status === 'complete' ? new Date() : f.uploadedAt,
            }
          : f
      ),
    });
  },

  setDocumentId: (id: string, documentId: string) => {
    set({
      files: get().files.map((f) => (f.id === id ? { ...f, documentId } : f)),
    });
  },

  retryUpload: (id: string) => {
    const file = get().files.find((f) => f.id === id);
    if (!file) return;

    if (file.retryCount >= MAX_RETRIES) {
      get().updateFileStatus(id, 'error', 'Maximum retry attempts reached');
      return;
    }

    set({
      files: get().files.map((f) =>
        f.id === id
          ? {
              ...f,
              status: 'queued' as UploadStatus,
              progress: 0,
              error: undefined,
              retryCount: f.retryCount + 1,
              abortController: new AbortController(),
            }
          : f
      ),
    });

    // Retry with exponential backoff
    const delay = getRetryDelay(file.retryCount);
    setTimeout(() => get().processQueue(), delay);
  },

  cancelUpload: (id: string) => {
    const file = get().files.find((f) => f.id === id);
    if (file?.abortController) {
      file.abortController.abort();
    }
    get().removeFile(id);
  },

  clearCompleted: () => {
    set({
      files: get().files.filter((f) => f.status !== 'complete'),
    });
  },

  reset: () => {
    // Abort all active uploads
    get().files.forEach((f) => {
      if (f.abortController) {
        f.abortController.abort();
      }
    });
    set({ files: [], activeUploads: 0 });
  },

  processQueue: async () => {
    const { files, maxConcurrent, activeUploads } = get();

    // Find queued files
    const queuedFiles = files.filter((f) => f.status === 'queued');

    // Calculate how many more uploads we can start
    const availableSlots = maxConcurrent - activeUploads;

    if (availableSlots <= 0 || queuedFiles.length === 0) {
      return;
    }

    // Start uploads for available slots
    const filesToUpload = queuedFiles.slice(0, availableSlots);

    for (const uploadFile of filesToUpload) {
      uploadSingleFile(uploadFile, get);
    }
  },
}));

// Upload a single file with progress tracking
async function uploadSingleFile(
  uploadFile: UploadFile,
  get: () => UploadQueueState
) {
  const { id, file, abortController } = uploadFile;

  // Increment active uploads
  const state = get();
  state.updateFileStatus(id, 'uploading');
  (state as any).activeUploads = state.activeUploads + 1;

  try {
    // Step 1: Get presigned URL from API
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }),
      signal: abortController?.signal,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, documentId } = await uploadResponse.json();
    get().setDocumentId(id, documentId);

    // Step 2: Upload to S3/R2 with progress tracking
    await uploadWithProgress(uploadUrl, file, abortController?.signal, (progress) => {
      get().updateFileProgress(id, progress);
    });

    // Step 3: Trigger processing
    get().updateFileStatus(id, 'processing');

    const processResponse = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
      signal: abortController?.signal,
    });

    if (!processResponse.ok) {
      throw new Error('Failed to trigger processing');
    }

    // Mark as complete
    get().updateFileProgress(id, 100);
    get().updateFileStatus(id, 'complete');

    // Track analytics
    trackUploadSuccess(uploadFile);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Upload was cancelled, don't update status
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    get().updateFileStatus(id, 'error', errorMessage);

    // Track analytics
    trackUploadError(uploadFile, errorMessage);
  } finally {
    // Decrement active uploads and process queue
    const state = get();
    (state as any).activeUploads = Math.max(0, state.activeUploads - 1);

    // Process next items in queue
    setTimeout(() => state.processQueue(), 100);
  }
}

// Upload with progress tracking using XMLHttpRequest
function uploadWithProgress(
  url: string,
  file: File,
  signal: AbortSignal | undefined,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('AbortError'));
      });
    }

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

// Analytics tracking functions
function trackUploadSuccess(uploadFile: UploadFile) {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('upload_success', {
      fileSize: uploadFile.fileSize,
      fileName: uploadFile.fileName,
      retryCount: uploadFile.retryCount,
      documentId: uploadFile.documentId,
    });
  }
}

function trackUploadError(uploadFile: UploadFile, error: string) {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('upload_error', {
      fileSize: uploadFile.fileSize,
      fileName: uploadFile.fileName,
      error,
      retryCount: uploadFile.retryCount,
    });
  }
}

// Validation helpers
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are allowed' };
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check file name
  if (!file.name || file.name.length > 255) {
    return { valid: false, error: 'Invalid file name' };
  }

  return { valid: true };
}

export function validateFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push('No files selected');
    return { valid: false, errors };
  }

  if (files.length > MAX_FILES) {
    errors.push(`Maximum ${MAX_FILES} files allowed`);
    return { valid: false, errors };
  }

  files.forEach((file, index) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      errors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

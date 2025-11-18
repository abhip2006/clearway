import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UploadAnalytics {
  uploadId: string;
  fileName: string;
  fileSize: number;
  status: 'success' | 'failure';
  error?: string;
  startTime: number;
  endTime: number;
  duration: number;
  retryCount: number;
  timestamp: Date;
}

interface UploadAnalyticsState {
  analytics: UploadAnalytics[];
  addAnalytics: (analytics: Omit<UploadAnalytics, 'timestamp'>) => void;
  getSuccessRate: () => number;
  getAverageUploadTime: () => number;
  getAverageFileSize: () => number;
  getTotalUploads: () => number;
  getRecentUploads: (count?: number) => UploadAnalytics[];
  clearAnalytics: () => void;
}

export const useUploadAnalytics = create<UploadAnalyticsState>()(
  persist(
    (set, get) => ({
      analytics: [],

      addAnalytics: (analytics) => {
        set((state) => ({
          analytics: [
            ...state.analytics,
            { ...analytics, timestamp: new Date() },
          ],
        }));

        // Track with external analytics if available
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.track('upload_complete', {
            uploadId: analytics.uploadId,
            fileName: analytics.fileName,
            fileSize: analytics.fileSize,
            status: analytics.status,
            duration: analytics.duration,
            retryCount: analytics.retryCount,
            error: analytics.error,
          });
        }
      },

      getSuccessRate: () => {
        const { analytics } = get();
        if (analytics.length === 0) return 100;

        const successCount = analytics.filter((a) => a.status === 'success').length;
        return (successCount / analytics.length) * 100;
      },

      getAverageUploadTime: () => {
        const { analytics } = get();
        if (analytics.length === 0) return 0;

        const totalDuration = analytics.reduce((sum, a) => sum + a.duration, 0);
        return totalDuration / analytics.length;
      },

      getAverageFileSize: () => {
        const { analytics } = get();
        if (analytics.length === 0) return 0;

        const totalSize = analytics.reduce((sum, a) => sum + a.fileSize, 0);
        return totalSize / analytics.length;
      },

      getTotalUploads: () => {
        return get().analytics.length;
      },

      getRecentUploads: (count = 10) => {
        return get().analytics.slice(-count).reverse();
      },

      clearAnalytics: () => {
        set({ analytics: [] });
      },
    }),
    {
      name: 'upload-analytics-storage',
    }
  )
);

// Helper function to track upload start
export function trackUploadStart(uploadId: string, fileName: string, fileSize: number) {
  return {
    uploadId,
    fileName,
    fileSize,
    startTime: Date.now(),
  };
}

// Helper function to track upload success
export function trackUploadSuccess(
  uploadId: string,
  fileName: string,
  fileSize: number,
  startTime: number,
  retryCount: number = 0
) {
  const endTime = Date.now();
  const duration = endTime - startTime;

  useUploadAnalytics.getState().addAnalytics({
    uploadId,
    fileName,
    fileSize,
    status: 'success',
    startTime,
    endTime,
    duration,
    retryCount,
  });
}

// Helper function to track upload failure
export function trackUploadFailure(
  uploadId: string,
  fileName: string,
  fileSize: number,
  startTime: number,
  error: string,
  retryCount: number = 0
) {
  const endTime = Date.now();
  const duration = endTime - startTime;

  useUploadAnalytics.getState().addAnalytics({
    uploadId,
    fileName,
    fileSize,
    status: 'failure',
    error,
    startTime,
    endTime,
    duration,
    retryCount,
  });
}

// Analytics dashboard component hook
export function useUploadStats() {
  const {
    getSuccessRate,
    getAverageUploadTime,
    getAverageFileSize,
    getTotalUploads,
    getRecentUploads,
  } = useUploadAnalytics();

  return {
    successRate: getSuccessRate(),
    averageUploadTime: getAverageUploadTime(),
    averageFileSize: getAverageFileSize(),
    totalUploads: getTotalUploads(),
    recentUploads: getRecentUploads(5),
  };
}

// Format duration for display
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// Format file size for display
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

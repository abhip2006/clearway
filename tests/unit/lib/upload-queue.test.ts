import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUploadQueue, validateFile, validateFiles } from '@/lib/upload-queue';

describe('Upload Queue', () => {
  beforeEach(() => {
    // Reset the store before each test
    useUploadQueue.getState().reset();
  });

  describe('File Validation', () => {
    it('should accept valid PDF files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-PDF files', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only PDF files are allowed');
    });

    it('should reject files larger than 10MB', () => {
      const file = new File(['content'], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size must be less than 10MB');
    });

    it('should reject files with invalid names', () => {
      const file = new File(['content'], '', { type: 'application/pdf' });

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file name');
    });

    it('should validate multiple files', () => {
      const files = [
        new File(['content'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content'], 'test2.pdf', { type: 'application/pdf' }),
      ];
      files.forEach((file) => {
        Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      });

      const result = validateFiles(files);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject more than 10 files', () => {
      const files = Array.from({ length: 11 }, (_, i) =>
        new File(['content'], `test${i}.pdf`, { type: 'application/pdf' })
      );

      const result = validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum 10 files allowed');
    });
  });

  describe('Queue Management', () => {
    it('should add files to queue', () => {
      const files = [
        new File(['content'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content'], 'test2.pdf', { type: 'application/pdf' }),
      ];
      files.forEach((file) => {
        Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      });

      useUploadQueue.getState().addFiles(files);

      const queuedFiles = useUploadQueue.getState().files;
      expect(queuedFiles).toHaveLength(2);
      expect(queuedFiles[0]?.status).toBe('queued');
      expect(queuedFiles[1]?.status).toBe('queued');
    });

    it('should remove file from queue', () => {
      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      Object.defineProperty(files[0], 'size', { value: 1024 * 1024 });

      useUploadQueue.getState().addFiles(files);

      const fileId = useUploadQueue.getState().files[0]?.id;
      if (fileId) {
        useUploadQueue.getState().removeFile(fileId);
      }

      expect(useUploadQueue.getState().files).toHaveLength(0);
    });

    it('should update file progress', () => {
      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      Object.defineProperty(files[0], 'size', { value: 1024 * 1024 });

      useUploadQueue.getState().addFiles(files);

      const fileId = useUploadQueue.getState().files[0]?.id;
      if (fileId) {
        useUploadQueue.getState().updateFileProgress(fileId, 50);
      }

      expect(useUploadQueue.getState().files[0]?.progress).toBe(50);
    });

    it('should update file status', () => {
      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      Object.defineProperty(files[0], 'size', { value: 1024 * 1024 });

      useUploadQueue.getState().addFiles(files);

      const fileId = useUploadQueue.getState().files[0]?.id;
      if (fileId) {
        useUploadQueue.getState().updateFileStatus(fileId, 'uploading');
      }

      expect(useUploadQueue.getState().files[0]?.status).toBe('uploading');
    });

    it('should clear completed files', () => {
      const files = [
        new File(['content'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content'], 'test2.pdf', { type: 'application/pdf' }),
      ];
      files.forEach((file) => {
        Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      });

      useUploadQueue.getState().addFiles(files);

      const fileId1 = useUploadQueue.getState().files[0]?.id;
      const fileId2 = useUploadQueue.getState().files[1]?.id;

      if (fileId1) useUploadQueue.getState().updateFileStatus(fileId1, 'complete');
      if (fileId2) useUploadQueue.getState().updateFileStatus(fileId2, 'uploading');

      useUploadQueue.getState().clearCompleted();

      const remainingFiles = useUploadQueue.getState().files;
      expect(remainingFiles).toHaveLength(1);
      expect(remainingFiles[0]?.status).toBe('uploading');
    });

    it('should reset queue', () => {
      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      Object.defineProperty(files[0], 'size', { value: 1024 * 1024 });

      useUploadQueue.getState().addFiles(files);

      useUploadQueue.getState().reset();

      expect(useUploadQueue.getState().files).toHaveLength(0);
      expect(useUploadQueue.getState().activeUploads).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    it('should increment retry count on retry', () => {
      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      Object.defineProperty(files[0], 'size', { value: 1024 * 1024 });

      useUploadQueue.getState().addFiles(files);

      const fileId = useUploadQueue.getState().files[0]?.id;
      if (fileId) {
        useUploadQueue.getState().updateFileStatus(fileId, 'error', 'Test error');
        useUploadQueue.getState().retryUpload(fileId);
      }

      const retryFile = useUploadQueue.getState().files[0];
      expect(retryFile?.retryCount).toBe(1);
      expect(retryFile?.status).toBe('queued');
    });

    it('should not retry after max attempts', () => {
      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];
      Object.defineProperty(files[0], 'size', { value: 1024 * 1024 });

      useUploadQueue.getState().addFiles(files);

      const fileId = useUploadQueue.getState().files[0]?.id;
      if (fileId) {
        // Simulate 3 failed attempts
        for (let i = 0; i < 3; i++) {
          useUploadQueue.getState().updateFileStatus(fileId, 'error', 'Test error');
          useUploadQueue.getState().retryUpload(fileId);
        }

        // Fourth retry should fail
        useUploadQueue.getState().updateFileStatus(fileId, 'error', 'Test error');
        useUploadQueue.getState().retryUpload(fileId);
      }

      const file = useUploadQueue.getState().files[0];
      expect(file?.status).toBe('error');
      expect(file?.error).toBe('Maximum retry attempts reached');
    });
  });
});

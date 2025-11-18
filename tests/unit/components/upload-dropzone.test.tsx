import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockFile, mockApiSuccess, mockApiError } from '@/tests/utils/test-helpers';

/**
 * Unit tests for UploadDropzone component
 *
 * Tests cover:
 * - Rendering and UI elements
 * - File validation (size, type)
 * - Upload flow (presigned URL, S3 upload, processing trigger)
 * - Error handling
 * - Loading states
 *
 * Note: This is a template test. Update imports and component path when implementing.
 */

// Mock fetch globally
global.fetch = vi.fn();

// Mock component (replace with actual component import when available)
const MockUploadDropzone = ({ onUploadComplete }: { onUploadComplete?: (id: string) => void }) => {
  const [uploading, setUploading] = vi.useState(false);
  const [error, setError] = vi.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Get presigned URL
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { uploadUrl, documentId } = await uploadRes.json();

      // 2. Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // 3. Trigger processing
      await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      onUploadComplete?.(documentId);
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div role="button" tabIndex={0}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          aria-label="upload file"
          disabled={uploading}
        />
        <p>{uploading ? 'Uploading...' : 'Drag & drop PDFs here'}</p>
        <p>or click to browse</p>
      </div>
      {error && <div role="alert">{error}</div>}
      {uploading && <div>Upload in progress...</div>}
    </div>
  );
};

describe('UploadDropzone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload prompt', () => {
    render(<MockUploadDropzone />);
    expect(screen.getByText(/drag & drop pdfs here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('accepts PDF files only', () => {
    render(<MockUploadDropzone />);
    const input = screen.getByLabelText(/upload file/i) as HTMLInputElement;

    expect(input).toHaveAttribute('accept', 'application/pdf');
  });

  it('shows error for files > 10MB', async () => {
    render(<MockUploadDropzone />);

    const input = screen.getByLabelText(/upload file/i) as HTMLInputElement;
    const largeFile = createMockFile('large.pdf', 11 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file must be under 10MB/i)).toBeInTheDocument();
    });
  });

  it('shows error for non-PDF files', async () => {
    render(<MockUploadDropzone />);

    const input = screen.getByLabelText(/upload file/i) as HTMLInputElement;
    const wrongFile = new File(['content'], 'document.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    fireEvent.change(input, { target: { files: [wrongFile] } });

    await waitFor(() => {
      expect(screen.getByText(/only pdf files are supported/i)).toBeInTheDocument();
    });
  });

  it('uploads file successfully', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadUrl: 'https://example.com/upload',
          documentId: 'doc_123',
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });

    global.fetch = mockFetch;

    const onUploadComplete = vi.fn();
    render(<MockUploadDropzone onUploadComplete={onUploadComplete} />);

    const input = screen.getByLabelText(/upload file/i) as HTMLInputElement;
    const file = createMockFile('test.pdf', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(onUploadComplete).toHaveBeenCalledWith('doc_123');
    });
  });

  it('shows loading state during upload', async () => {
    const mockFetch = vi.fn()
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    global.fetch = mockFetch;

    render(<MockUploadDropzone />);

    const input = screen.getByLabelText(/upload file/i) as HTMLInputElement;
    const file = createMockFile('test.pdf', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/upload in progress/i)).toBeInTheDocument();
  });

  it('handles upload errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    global.fetch = mockFetch;

    render(<MockUploadDropzone />);

    const input = screen.getByLabelText(/upload file/i) as HTMLInputElement;
    const file = createMockFile('test.pdf', 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });
});

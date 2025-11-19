// app/dashboard/tax/k1/upload/page.tsx
// K-1 Upload & Batch Processing

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'extracting' | 'complete' | 'error';
  progress: number;
  taxDocumentId?: string;
}

export default function K1UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fundId, setFundId] = useState('');
  const [taxYear, setTaxYear] = useState(2024);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36),
      file,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const uploadFiles = async () => {
    if (!fundId) {
      alert('Please enter a Fund ID');
      return;
    }

    for (const fileItem of files) {
      if (fileItem.status !== 'pending') continue;

      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading' } : f))
        );

        // Upload file (simplified - would use actual upload logic)
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('fundId', fundId);
        formData.append('taxYear', taxYear.toString());

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        // Trigger K-1 extraction
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'extracting' } : f))
        );

        const extractRes = await fetch('/api/tax/k1/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: uploadData.documentId,
            fundId,
            investorId: 'current-user-id',
            taxYear,
          }),
        });

        const extractData = await extractRes.json();

        // Mark as complete
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: 'complete',
                  progress: 100,
                  taxDocumentId: extractData.taxDocumentId,
                }
              : f
          )
        );
      } catch (error) {
        console.error('Upload error:', error);
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error' } : f))
        );
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload K-1 Documents</h1>
        <p className="text-gray-600">
          Upload one or more K-1 forms for AI extraction and validation
        </p>
      </div>

      {/* Upload Configuration */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fund ID
            </label>
            <input
              type="text"
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter fund identifier"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Year
            </label>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
            >
              {[2024, 2023, 2022, 2021].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer mb-6 ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-gray-600">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isDragActive ? (
            <p>Drop the K-1 files here...</p>
          ) : (
            <p>
              Drag and drop K-1 PDF files here, or click to select files
              <br />
              <span className="text-sm text-gray-500">
                Supports batch upload (up to 100 files)
              </span>
            </p>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Uploaded Files ({files.length})</h2>
            <button
              onClick={uploadFiles}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={files.every((f) => f.status !== 'pending')}
            >
              Process All
            </button>
          </div>
          <div className="space-y-3">
            {files.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FileRow({ file }: { file: UploadedFile }) {
  const statusColors = {
    pending: 'text-gray-600',
    uploading: 'text-blue-600',
    extracting: 'text-purple-600',
    complete: 'text-green-600',
    error: 'text-red-600',
  };

  const statusLabels = {
    pending: 'Pending',
    uploading: 'Uploading...',
    extracting: 'Extracting data...',
    complete: 'Complete',
    error: 'Error',
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{file.file.name}</div>
        <div className="text-sm text-gray-500">
          {(file.file.size / 1024 / 1024).toFixed(2)} MB
        </div>
      </div>
      <div className={`font-medium ${statusColors[file.status]}`}>
        {statusLabels[file.status]}
      </div>
      {file.status === 'complete' && file.taxDocumentId && (
        <a
          href={`/dashboard/tax/k1/${file.taxDocumentId}/review`}
          className="ml-4 px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Review
        </a>
      )}
    </div>
  );
}

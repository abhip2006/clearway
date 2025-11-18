# Batch Upload System Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                                                                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  Upload Page   │  │  Upload Dropzone │  │  Progress List  │ │
│  │  (Server)      │  │  (Client)        │  │  (Client)       │ │
│  └────────┬───────┘  └────────┬─────────┘  └────────┬────────┘ │
│           │                   │                      │          │
│           └───────────────────┴──────────────────────┘          │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Upload Queue (Zustand)                                   │  │
│  │  - files: UploadFile[]                                    │  │
│  │  - activeUploads: number                                  │  │
│  │  - maxConcurrent: 3                                       │  │
│  │  - addFiles(), removeFile(), updateFileProgress(), etc.  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Toast State (Zustand)                                    │  │
│  │  - toasts: Toast[]                                        │  │
│  │  - addToast(), removeToast()                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Analytics State (Zustand + Persist)                      │  │
│  │  - analytics: UploadAnalytics[]                           │  │
│  │  - addAnalytics(), getSuccessRate(), etc.                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      UPLOAD PROCESSING                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Queue Processor                                          │  │
│  │  - processQueue()                                         │  │
│  │  - uploadSingleFile()                                     │  │
│  │  - uploadWithProgress()                                   │  │
│  │                                                           │  │
│  │  Flow:                                                    │  │
│  │  1. Check available slots (max 3 concurrent)              │  │
│  │  2. Pick next queued file                                │  │
│  │  3. Upload with progress tracking                        │  │
│  │  4. Update status (uploading → processing → complete)    │  │
│  │  5. Process next in queue                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API                                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ POST /api/   │  │ PUT S3/R2    │  │ POST /api/process    │  │
│  │ upload       │→ │ presigned    │→ │                      │  │
│  │              │  │ URL          │  │ - Trigger Inngest    │  │
│  │ Returns:     │  │              │  │ - OCR & Extract      │  │
│  │ - uploadUrl  │  │ Upload file  │  │ - Update DB          │  │
│  │ - documentId │  │ with XHR     │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE & DATABASE                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Cloudflare   │  │ PostgreSQL   │  │ LocalStorage         │  │
│  │ R2           │  │ (Prisma)     │  │                      │  │
│  │              │  │              │  │ - Analytics data     │  │
│  │ - PDF files  │  │ - Documents  │  │ - Upload stats       │  │
│  │ - Presigned  │  │ - Users      │  │ - Toast state        │  │
│  │   URLs       │  │ - Metadata   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
UploadPage (Server Component)
│
└── UploadPageClient (Client Component)
    │
    ├── ToastContainer
    │   └── ToastItem (multiple)
    │       ├── Icon (CheckCircle, XCircle, etc.)
    │       └── Close Button
    │
    ├── UploadDropzone
    │   ├── Drag & Drop Zone
    │   └── File Input
    │
    ├── UploadSummary
    │   ├── Progress Bar (overall)
    │   └── Statistics
    │       ├── Total Files
    │       ├── Completed Files
    │       ├── Error Files
    │       └── Uploading Files
    │
    └── UploadProgress (multiple, one per file)
        ├── File Icon
        ├── File Info
        │   ├── File Name
        │   └── File Size
        ├── Progress Bar
        ├── Status Badge
        └── Action Buttons
            ├── Cancel Button (if uploading/queued)
            └── Retry Button (if error)
```

## Data Flow

### Upload Initiation
```
User Drops Files
      ↓
Dropzone onDrop Event
      ↓
validateFiles()
      ↓
[Valid] → addFiles() → Upload Queue
      ↓
Toast: "Files added to queue"
      ↓
processQueue() triggered
```

### Queue Processing
```
processQueue()
      ↓
Check: activeUploads < maxConcurrent (3)?
      ↓
[Yes] → Get next queued file
      ↓
uploadSingleFile()
      ↓
┌─────────────────────────┐
│ Step 1: Get Upload URL  │
│ POST /api/upload        │
│ - fileName              │
│ - fileSize              │
│ - mimeType              │
│ Returns: uploadUrl,     │
│          documentId     │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Step 2: Upload to S3    │
│ PUT uploadUrl           │
│ - Track progress (XHR)  │
│ - Update UI (0-100%)    │
│ - Support cancellation  │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│ Step 3: Process Doc     │
│ POST /api/process       │
│ - documentId            │
│ Triggers: OCR, Extract  │
└────────┬────────────────┘
         ↓
Status: complete
      ↓
Analytics: trackUploadSuccess()
      ↓
Toast: "Upload complete"
      ↓
Process next in queue
```

### Error Handling Flow
```
Upload Error
      ↓
Status: error
      ↓
Check: retryCount < MAX_RETRIES (3)?
      ↓
[Yes] → Exponential backoff delay
      ↓
      Retry after: 1s, 2s, 4s
      ↓
      retryUpload()
      ↓
      Status: queued
      ↓
      processQueue()
      ↓
[No] → Status: error
      ↓
      Error: "Maximum retry attempts reached"
      ↓
      Analytics: trackUploadFailure()
      ↓
      Toast: "Upload failed"
      ↓
      Show Retry Button
```

## State Machine

### Upload File States
```
        ┌─────────┐
        │ queued  │ ← Initial state
        └────┬────┘
             ↓
        ┌────────────┐
        │ uploading  │ ← Uploading to S3
        └────┬───┬───┘
             │   │
    ┌────────┘   └──────────┐
    ↓                       ↓
┌──────────┐           ┌────────┐
│processing│           │ error  │ ← Upload failed
└────┬─────┘           └───┬────┘
     │                     │
     ↓                     ↓ retry
┌─────────┐           ┌────────┐
│complete │           │ queued │
└─────────┘           └────────┘
     ↓                     ↓
  [Done]              [Retry with backoff]
```

## Parallel Upload Management

```
Queue: [File1, File2, File3, File4, File5, File6]
                        ↓
Concurrent Limit: 3
                        ↓
┌────────────────────────────────────────────────┐
│ Slot 1: File1 (uploading) ████████░░░░ 70%   │
│ Slot 2: File2 (uploading) ██████████░░ 90%   │
│ Slot 3: File3 (uploading) ████░░░░░░░░ 40%   │
├────────────────────────────────────────────────┤
│ Queued: File4, File5, File6                   │
└────────────────────────────────────────────────┘
                        ↓
        File2 completes (Slot 2 freed)
                        ↓
┌────────────────────────────────────────────────┐
│ Slot 1: File1 (uploading) ██████████░░ 90%   │
│ Slot 2: File4 (uploading) █░░░░░░░░░░ 10%   │
│ Slot 3: File3 (uploading) ████████░░░░ 75%   │
├────────────────────────────────────────────────┤
│ Queued: File5, File6                          │
└────────────────────────────────────────────────┘
```

## Analytics Tracking

```
Upload Start
      ↓
trackUploadStart()
├── uploadId
├── fileName
├── fileSize
└── startTime
      ↓
Upload Complete/Fail
      ↓
trackUploadSuccess() / trackUploadFailure()
├── duration = endTime - startTime
├── status = 'success' | 'failure'
├── error (if failed)
└── retryCount
      ↓
Store in Analytics State (Zustand + LocalStorage)
      ↓
Dashboard Widget Displays:
├── Success Rate: XX%
├── Avg Upload Time: Xs
├── Avg File Size: X MB
└── Total Uploads: X
```

## Security Considerations

```
┌─────────────────────────────────────────────────┐
│ Client-Side Validation                          │
│ - File type (PDF only)                          │
│ - File size (max 10MB)                          │
│ - File count (max 10)                           │
│ - File name length                              │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ Server-Side Validation (API)                    │
│ - Authentication (Clerk)                        │
│ - File metadata validation                      │
│ - Rate limiting                                 │
│ - Presigned URL expiration (1 hour)             │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ Storage Security (Cloudflare R2)                │
│ - Private bucket                                │
│ - Presigned URLs only                           │
│ - User-specific paths                           │
│ - Signed requests                               │
└─────────────────────────────────────────────────┘
```

## Performance Optimizations

### 1. Concurrent Upload Limiting
```
Instead of: Upload all 10 files at once (network congestion)
We use: Max 3 concurrent uploads (balanced throughput)
```

### 2. Progress Update Batching
```
XMLHttpRequest Progress Events (many per second)
      ↓
Debounce/Throttle (every 100ms)
      ↓
React State Update (minimal re-renders)
```

### 3. Efficient State Updates
```
Zustand Store
├── Partial updates only
├── Shallow comparison
└── No unnecessary re-renders
```

### 4. Resource Cleanup
```
File Upload Complete/Cancel
      ↓
AbortController cleanup
      ↓
Event listener removal
      ↓
Memory freed
```

## Mobile Optimizations

```
Desktop:
├── Drag & drop
├── Large dropzone
├── Full keyboard support
└── Detailed progress view

Mobile:
├── Touch-friendly buttons
├── Responsive grid layout
├── Simplified progress view
├── Reduced padding
└── (Future: Camera capture)
```

## Accessibility Features

```
Keyboard Navigation:
├── Tab through all controls
├── Enter to activate
├── Escape to cancel/clear
└── Ctrl+U for quick upload

Screen Reader Support:
├── ARIA labels on all inputs
├── Role attributes (progressbar, button, alert)
├── Live regions for status updates
└── Descriptive error messages

Visual Indicators:
├── Focus outlines
├── Color-coded status
├── Icon + text labels
└── Progress percentages
```

## Error Recovery Strategies

### Network Error
```
Upload fails with network error
      ↓
Status: error
      ↓
Show: Retry button
      ↓
User clicks Retry
      ↓
retryUpload()
      ↓
Exponential backoff: 1s → 2s → 4s
      ↓
Retry upload (max 3 attempts)
```

### Server Error (500)
```
API returns 500
      ↓
Status: error
Error: "Server error"
      ↓
Show: Error message + Retry button
      ↓
No automatic retry (server issue)
      ↓
User can manually retry
```

### Validation Error
```
Invalid file selected
      ↓
validateFiles() fails
      ↓
Toast: Error message
      ↓
File not added to queue
      ↓
User can select valid file
```

## Future Architecture Enhancements

### Chunked Upload (for large files)
```
Large File (>100MB)
      ↓
Split into chunks (5MB each)
      ↓
Upload chunks in parallel
      ↓
Track chunk progress
      ↓
Assemble on server
```

### WebSocket for Real-time Updates
```
Client ←──WebSocket──→ Server
      ↓
Real-time status updates
      ↓
Processing progress
      ↓
Extraction complete
```

### Service Worker for Background Upload
```
Upload initiated
      ↓
Service Worker takes over
      ↓
User can close tab
      ↓
Upload continues in background
      ↓
Notification on complete
```

This architecture provides a scalable, maintainable, and user-friendly batch upload system with comprehensive error handling and analytics.

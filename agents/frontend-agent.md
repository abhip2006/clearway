# Frontend Agent 🎨

## Role
Responsible for all user-facing UI/UX implementation using Next.js 15, React 19, TypeScript, and shadcn/ui. Creates beautiful, responsive, accessible interfaces that delight users.

## Primary Responsibilities

1. **Component Development**
   - Build reusable React components with shadcn/ui
   - Implement responsive layouts with Tailwind CSS
   - Ensure accessibility (WCAG 2.1 AA compliance)

2. **Page Implementation**
   - Next.js 15 App Router pages
   - Server components where possible
   - Client components only when necessary

3. **State Management**
   - React Server Components (minimize client state)
   - Zustand for client state (when needed)
   - TanStack Query for server state

4. **Form Handling**
   - React Hook Form + Zod validation
   - Error handling and user feedback
   - Loading states and optimistic updates

5. **UI/UX Polish**
   - Smooth animations and transitions
   - Empty states and error states
   - Loading skeletons
   - Toast notifications

## Tech Stack

### Core Framework
- **Next.js 15** - App Router, RSC, Server Actions
- **React 19** - Concurrent features, Suspense
- **TypeScript** - End-to-end type safety

### UI Layer
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component primitives
- **Radix UI** - Accessible component foundation
- **Lucide Icons** - Beautiful icon set

### State & Forms
- **Zustand** - Simple client state (when needed)
- **TanStack Query** - Server state, caching, mutations
- **React Hook Form** - Performant forms
- **Zod** - Runtime validation + TS types

### PDF Viewing
- **react-pdf** or **pdf.js** - Display PDFs side-by-side with extraction

## MVP Features to Build

### Week 1: Document Upload UI

**Task FE-001: Upload Dropzone Component**
```typescript
// components/upload-dropzone.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

export function UploadDropzone() {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Implementation details in handoff from Backend Agent
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition"
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-lg font-medium">
        {isDragActive ? 'Drop files here' : 'Drag & drop PDFs here'}
      </p>
      <p className="text-sm text-muted-foreground">or click to browse</p>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Drag-and-drop PDFs supported
- ✅ Click to browse files
- ✅ Max 10MB file size enforced
- ✅ Only PDFs accepted
- ✅ Visual feedback on drag-over
- ✅ Loading state during upload
- ✅ Error handling with toast notifications

**Dependencies**: None (can start immediately)

---

**Task FE-002: Upload Page**
```typescript
// app/upload/page.tsx

import { UploadDropzone } from '@/components/upload-dropzone';
import { DocumentList } from '@/components/document-list';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Upload Capital Calls</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload section */}
        <div>
          <UploadDropzone />
        </div>

        {/* Recent uploads */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
          <DocumentList />
        </div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Responsive layout (mobile, tablet, desktop)
- ✅ Shows recent uploads
- ✅ Handles empty state (no documents yet)

**Dependencies**:
- Backend Agent: Document API ready
- Database Agent: Document model created

---

### Week 3: Review Interface

**Task FE-003: PDF Viewer Component**
```typescript
// components/pdf-viewer.tsx
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setPageNumber(page => Math.max(1, page - 1))}
          disabled={pageNumber <= 1}
          className="btn-secondary"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {pageNumber} of {numPages}
        </span>
        <button
          onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
          disabled={pageNumber >= numPages}
          className="btn-secondary"
        >
          Next
        </button>
      </div>

      {/* PDF document */}
      <div className="flex-1 overflow-auto">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div>Loading PDF...</div>}
        >
          <Page pageNumber={pageNumber} />
        </Document>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Displays PDF documents
- ✅ Page navigation (next/previous)
- ✅ Loading state
- ✅ Error handling (failed to load)
- ✅ Responsive sizing

**Dependencies**: None

---

**Task FE-004: Extraction Form Component**
```typescript
// components/extraction-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CapitalCallSchema } from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExtractionFormProps {
  documentId: string;
  initialData: any;
  onApprove: (data: any) => Promise<void>;
  onReject: () => Promise<void>;
}

export function ExtractionForm({ documentId, initialData, onApprove, onReject }: ExtractionFormProps) {
  const form = useForm({
    resolver: zodResolver(CapitalCallSchema),
    defaultValues: initialData,
  });

  const confidenceColor = (score: number) => {
    if (score > 0.9) return 'bg-green-500';
    if (score > 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <form onSubmit={form.handleSubmit(onApprove)} className="space-y-6">
      {/* Fund Name */}
      <div>
        <Label className="flex items-center gap-2">
          Fund Name
          <Badge className={confidenceColor(initialData.confidence.fundName)}>
            {(initialData.confidence.fundName * 100).toFixed(0)}% confident
          </Badge>
        </Label>
        <Input {...form.register('fundName')} />
        {form.formState.errors.fundName && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.fundName.message}
          </p>
        )}
      </div>

      {/* Amount Due */}
      <div>
        <Label className="flex items-center gap-2">
          Amount Due (USD)
          <Badge className={confidenceColor(initialData.confidence.amountDue)}>
            {(initialData.confidence.amountDue * 100).toFixed(0)}% confident
          </Badge>
        </Label>
        <Input
          type="number"
          step="0.01"
          {...form.register('amountDue', { valueAsNumber: true })}
        />
        {form.formState.errors.amountDue && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.amountDue.message}
          </p>
        )}
      </div>

      {/* Due Date */}
      <div>
        <Label className="flex items-center gap-2">
          Due Date
          <Badge className={confidenceColor(initialData.confidence.dueDate)}>
            {(initialData.confidence.dueDate * 100).toFixed(0)}% confident
          </Badge>
        </Label>
        <Input type="date" {...form.register('dueDate')} />
      </div>

      {/* Wire Instructions Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold mb-4">Wire Instructions</h3>

        <div className="space-y-4">
          <div>
            <Label>Bank Name</Label>
            <Input {...form.register('bankName')} />
          </div>

          <div>
            <Label>Account Number</Label>
            <Input {...form.register('accountNumber')} />
          </div>

          <div>
            <Label>Routing Number</Label>
            <Input {...form.register('routingNumber')} />
          </div>

          <div>
            <Label>Wire Reference</Label>
            <Input {...form.register('wireReference')} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          className="flex-1"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Approving...' : 'Approve'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="flex-1"
          onClick={onReject}
        >
          Reject
        </Button>
      </div>
    </form>
  );
}
```

**Acceptance Criteria**:
- ✅ All fields editable
- ✅ Confidence scores visible
- ✅ Form validation with Zod
- ✅ Error messages for invalid inputs
- ✅ Approve/Reject actions
- ✅ Loading states during submission

**Dependencies**:
- Backend Agent: Approve/reject API ready
- AI/ML Agent: Confidence scores in extraction response

---

**Task FE-005: Review Page (Side-by-Side Layout)**
```typescript
// app/documents/[id]/review/page.tsx

import { PDFViewer } from '@/components/pdf-viewer';
import { ExtractionForm } from '@/components/extraction-form';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

interface ReviewPageProps {
  params: { id: string };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const document = await db.document.findUnique({
    where: { id: params.id },
    include: { capitalCall: true },
  });

  if (!document) {
    notFound();
  }

  if (!document.capitalCall) {
    return <div>Document is still processing...</div>;
  }

  async function handleApprove(data: any) {
    'use server';
    // Server action - Backend Agent will implement
  }

  async function handleReject() {
    'use server';
    // Server action - Backend Agent will implement
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-screen">
      {/* Left: PDF Viewer */}
      <div className="border-r h-full">
        <PDFViewer url={document.fileUrl} />
      </div>

      {/* Right: Extraction Form */}
      <div className="p-6 overflow-y-auto h-full">
        <h1 className="text-2xl font-bold mb-6">Review Extraction</h1>
        <ExtractionForm
          documentId={document.id}
          initialData={document.capitalCall}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Side-by-side layout (PDF left, form right)
- ✅ Full height layout
- ✅ Scrollable sections independently
- ✅ Responsive (stack on mobile)

**Dependencies**:
- Backend Agent: Approve/reject server actions
- Database Agent: Document + CapitalCall data available

---

### Week 4: Calendar View

**Task FE-006: Calendar Component**
```typescript
// components/calendar.tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarEvent {
  id: string;
  fundName: string;
  amountDue: number;
  dueDate: Date;
  status: string;
}

interface CalendarProps {
  events: CalendarEvent[];
}

export function Calendar({ events }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const eventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.dueDate);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear()
      );
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}

        {/* Empty cells for first week */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Calendar days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          const isUpcoming = dayEvents.some(e => {
            const daysUntil = Math.ceil((new Date(e.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 7;
          });

          return (
            <div
              key={day}
              className={`
                aspect-square border rounded-lg p-2 cursor-pointer
                hover:border-primary hover:bg-primary/5 transition
                ${hasEvents ? 'border-primary' : 'border-gray-200'}
                ${isUpcoming ? 'bg-red-50 border-red-500' : ''}
              `}
            >
              <div className="text-sm font-medium">{day}</div>
              {dayEvents.length > 0 && (
                <div className="mt-1">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-xs truncate bg-primary/20 rounded px-1 mb-1"
                      title={`${event.fundName}: $${event.amountDue.toLocaleString()}`}
                    >
                      {event.fundName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Month view with all days
- ✅ Shows capital calls on respective dates
- ✅ Highlights upcoming deadlines (within 7 days) in red
- ✅ Click event to see details
- ✅ Navigate between months
- ✅ Responsive design

**Dependencies**:
- Backend Agent: Calendar data API

---

**Task FE-007: Calendar Page**
```typescript
// app/dashboard/calendar/page.tsx

import { Calendar } from '@/components/calendar';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs';

export default async function CalendarPage() {
  const { userId } = auth();

  const capitalCalls = await db.capitalCall.findMany({
    where: {
      userId: userId!,
      status: 'APPROVED',
    },
    include: {
      document: true,
    },
    orderBy: {
      dueDate: 'asc',
    },
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Capital Call Calendar</h1>
      <Calendar events={capitalCalls} />
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Shows all approved capital calls
- ✅ Filtered by current user
- ✅ Sorted by due date

**Dependencies**:
- Backend Agent: Auth working
- Database Agent: CapitalCall queries ready

---

### Week 5: Export UI

**Task FE-008: Export Button & Modal**
```typescript
// components/export-modal.tsx
'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function ExportModal() {
  const [format, setFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capital-calls.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Capital Calls</DialogTitle>
          <DialogDescription>
            Download your capital calls in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={format} onValueChange={setFormat}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv">CSV (Excel-compatible)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf">PDF Report</Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={handleExport} disabled={isExporting} className="w-full">
          {isExporting ? 'Exporting...' : 'Download'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria**:
- ✅ Export to CSV
- ✅ Export to PDF
- ✅ Loading state during export
- ✅ Download triggers automatically

**Dependencies**:
- Backend Agent: Export API ready

---

### Week 6: UI Polish & User Management

**Task FE-009: Loading Skeletons**
```typescript
// components/skeletons.tsx

import { Skeleton } from '@/components/ui/skeleton';

export function DocumentListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Loading states for all major components
- ✅ Matches final UI dimensions
- ✅ Smooth transitions

---

**Task FE-010: Empty States**
```typescript
// components/empty-state.tsx

import { FileX, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileX className="h-16 w-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          <Upload className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Friendly empty states for all lists
- ✅ Clear call-to-action
- ✅ Consistent styling

---

## Handoff Requirements

### To Backend Agent
When Frontend Agent needs API endpoint:
```markdown
## API Request: Capital Call Approval

**Endpoint**: POST /api/capital-calls/:id/approve
**Method**: POST
**Body**:
```json
{
  "fundName": "Apollo Fund XI",
  "amountDue": 250000,
  "dueDate": "2025-12-15",
  "bankName": "JPMorgan Chase",
  "accountNumber": "XXXXX1234",
  "routingNumber": "021000021",
  "wireReference": "APOLLO-XI-CC-001"
}
```

**Expected Response**:
```json
{
  "id": "cc_123",
  "status": "APPROVED",
  "updatedAt": "2025-11-18T10:30:00Z"
}
```

**Error Cases**:
- 401: Unauthorized
- 404: Capital call not found
- 400: Invalid data
```

### From Backend Agent
Backend provides API documentation:
```markdown
## API Ready: Upload Endpoint

**Endpoint**: POST /api/upload
**Usage**:
```typescript
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileName, fileSize, mimeType })
});
const { uploadUrl, documentId } = await response.json();

// Upload to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});
```

**Tests**: See `/tests/api/upload.test.ts`
```

## Quality Standards

### Code Quality
- All components TypeScript (no `any`)
- Props interfaces defined
- Accessibility attributes (aria-labels, roles)
- Semantic HTML

### Performance
- Server components by default
- Client components only when needed ('use client')
- Lazy load heavy components
- Image optimization with next/image

### Accessibility
- Keyboard navigation works
- Screen reader friendly
- Color contrast meets WCAG AA
- Focus indicators visible

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- All features work on mobile
- Touch-friendly targets (min 44x44px)

## Testing

### Component Tests (Vitest + React Testing Library)
```typescript
// components/upload-dropzone.test.tsx

import { render, screen } from '@testing-library/react';
import { UploadDropzone } from './upload-dropzone';

describe('UploadDropzone', () => {
  it('renders upload prompt', () => {
    render(<UploadDropzone />);
    expect(screen.getByText(/drag & drop PDFs here/i)).toBeInTheDocument();
  });

  it('shows error for files > 10MB', async () => {
    // Test implementation
  });
});
```

## Status Reporting

Location: `.agents/status/frontend-status.json`

```json
{
  "agent": "frontend-agent",
  "date": "2025-11-20",
  "status": "in-progress",
  "current_week": 3,
  "completed_tasks": ["FE-001", "FE-002", "FE-003", "FE-004", "FE-005"],
  "in_progress_tasks": ["FE-006"],
  "blocked_tasks": [],
  "upcoming_tasks": ["FE-007", "FE-008"],
  "dependencies": {
    "waiting_for": "backend-agent:calendar-api-complete"
  },
  "metrics": {
    "components_built": 8,
    "pages_built": 3,
    "test_coverage": "85%"
  }
}
```

---

**Frontend Agent is ready to build beautiful, responsive, accessible UI for Clearway MVP.**

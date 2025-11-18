import { PDFViewer } from '@/components/pdf-viewer';
import { ExtractionForm } from '@/components/extraction-form';
import { notFound, redirect } from 'next/navigation';

// This would fetch from your database in production
async function getDocument(id: string) {
  // TODO: Replace with actual database query
  // const document = await db.document.findUnique({
  //   where: { id },
  //   include: { capitalCall: true },
  // });
  // if (!document) {
  //   notFound();
  // }
  // return document;

  // Mock data for now
  return {
    id,
    fileName: 'Sample Capital Call.pdf',
    fileUrl: '/sample.pdf', // Replace with actual S3/R2 URL
    capitalCall: {
      fundName: 'Apollo Fund XI',
      amountDue: 250000,
      dueDate: '2025-12-15',
      currency: 'USD',
      bankName: 'JPMorgan Chase',
      accountNumber: 'XXXXX1234',
      routingNumber: '021000021',
      wireReference: 'APOLLO-XI-CC-001',
      confidence: {
        fundName: 0.95,
        amountDue: 0.92,
        dueDate: 0.88,
      },
    },
  };
}

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document.capitalCall) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Document Processing</h2>
          <p className="text-muted-foreground">
            This document is still being processed. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  async function handleApprove(data: any) {
    'use server';
    // TODO: Implement approval logic
    // await db.capitalCall.update({
    //   where: { documentId: id },
    //   data: { ...data, status: 'APPROVED', approvedAt: new Date() },
    // });
    // await db.document.update({
    //   where: { id },
    //   data: { status: 'APPROVED' },
    // });
    console.log('Approved:', data);
    redirect('/dashboard/calendar');
  }

  async function handleReject() {
    'use server';
    // TODO: Implement rejection logic
    // await db.document.update({
    //   where: { id },
    //   data: { status: 'REJECTED' },
    // });
    console.log('Rejected');
    redirect('/upload');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-screen">
      {/* Left: PDF Viewer */}
      <div className="border-r h-full overflow-hidden">
        <PDFViewer url={document.fileUrl} />
      </div>

      {/* Right: Extraction Form */}
      <div className="p-6 overflow-y-auto h-full bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Review Extraction</h1>
            <p className="text-muted-foreground">
              Review the extracted data and make any necessary corrections
            </p>
          </div>

          <ExtractionForm
            documentId={document.id}
            initialData={document.capitalCall}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
}

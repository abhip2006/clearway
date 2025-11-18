import { PDFViewer } from '@/components/pdf-viewer';
import { ExtractionForm } from '@/components/extraction-form';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

async function getDocument(id: string, clerkUserId: string) {
  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (!user) {
    return null;
  }

  const document = await db.document.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      capitalCall: true,
    },
  });

  if (!document) {
    return null;
  }

  return document;
}

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { id } = await params;
  const document = await getDocument(id, userId);

  if (!document) {
    notFound();
  }

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
    if (!document.capitalCall) {
      throw new Error('No capital call to approve');
    }

    await db.capitalCall.update({
      where: { id: document.capitalCall.id },
      data: {
        ...data,
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    await db.document.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    redirect('/dashboard/calendar');
  }

  async function handleReject() {
    'use server';
    if (!document.capitalCall) {
      await db.document.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
    } else {
      await db.capitalCall.update({
        where: { id: document.capitalCall.id },
        data: { status: 'REJECTED', reviewedAt: new Date() },
      });

      await db.document.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
    }

    redirect('/upload');
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 min-h-screen lg:h-screen">
      {/* Left: PDF Viewer - Stack vertically on mobile */}
      <div className="border-b lg:border-b-0 lg:border-r h-[50vh] lg:h-full overflow-hidden">
        <PDFViewer url={document.fileUrl} />
      </div>

      {/* Right: Extraction Form */}
      <div className="p-4 sm:p-6 overflow-y-auto lg:h-full bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Review Extraction</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
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

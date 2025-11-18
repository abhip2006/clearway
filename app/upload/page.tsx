import { UploadPageClient } from '@/components/upload-page-client';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function UploadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-7xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Batch Upload Capital Calls
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Upload multiple PDF documents with real-time progress tracking and parallel processing
        </p>
      </div>

      <UploadPageClient />
    </div>
  );
}

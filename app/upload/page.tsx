import { UploadDropzone } from '@/components/upload-dropzone';
import { DocumentList } from '@/components/document-list';

// This would be fetched from your database in a real app
// For now, we'll use a placeholder
async function getRecentDocuments() {
  // TODO: Replace with actual database query
  // const documents = await db.document.findMany({
  //   where: { userId: session.userId },
  //   orderBy: { uploadedAt: 'desc' },
  //   take: 10,
  // });
  return [];
}

export default async function UploadPage() {
  const documents = await getRecentDocuments();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Upload Capital Calls
        </h1>
        <p className="text-muted-foreground">
          Upload PDF documents for AI-powered extraction
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
          <UploadDropzone
            onUploadComplete={(documentId) => {
              console.log('Upload complete:', documentId);
              // TODO: Refresh document list or navigate
            }}
            onUploadError={(error) => {
              console.error('Upload error:', error);
              // TODO: Show error toast
            }}
          />
        </div>

        {/* Recent uploads */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
          {documents.length > 0 ? (
            <DocumentList
              documents={documents}
              onDocumentClick={(documentId) => {
                console.log('Document clicked:', documentId);
                // TODO: Navigate to document review page
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No documents yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload your first capital call to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

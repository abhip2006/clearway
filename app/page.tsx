import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Upload, Calendar, FileText, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Clearway
          </h1>
          <p className="text-2xl text-muted-foreground mb-2">
            Data Infrastructure for Alternative Investments
          </p>
          <p className="text-lg text-muted-foreground mb-8">
            The Plaid for Alternatives
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/upload">
              <Button size="lg">
                <Upload className="mr-2 h-5 w-5" />
                Upload Capital Call
              </Button>
            </Link>
            <Link href="/dashboard/calendar">
              <Button size="lg" variant="outline">
                <Calendar className="mr-2 h-5 w-5" />
                View Calendar
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Easy Upload</h3>
            <p className="text-sm text-muted-foreground">
              Drag & drop PDF capital calls for instant processing
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">AI Extraction</h3>
            <p className="text-sm text-muted-foreground">
              95%+ accuracy with confidence scores for every field
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Review & Approve</h3>
            <p className="text-sm text-muted-foreground">
              Side-by-side PDF viewer with editable extraction form
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Calendar View</h3>
            <p className="text-sm text-muted-foreground">
              Never miss a deadline with calendar and email alerts
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">95%+</div>
              <div className="text-sm text-muted-foreground">AI Accuracy</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">&lt;3min</div>
              <div className="text-sm text-muted-foreground">Processing Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">$50B</div>
              <div className="text-sm text-muted-foreground">Annual Flow</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

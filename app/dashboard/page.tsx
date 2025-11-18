import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { OnboardingChecklist } from '@/components/onboarding/checklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getDashboardData(userId: string) {
  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return null;
  }

  // Get document counts
  const totalDocuments = await db.document.count({
    where: { userId: user.id },
  });

  const approvedDocuments = await db.document.count({
    where: {
      userId: user.id,
      status: 'APPROVED',
    },
  });

  const pendingDocuments = await db.document.count({
    where: {
      userId: user.id,
      status: { in: ['PENDING', 'PROCESSING', 'REVIEW'] },
    },
  });

  // Get capital calls stats
  const upcomingCapitalCalls = await db.capitalCall.count({
    where: {
      userId: user.id,
      status: 'APPROVED',
      dueDate: {
        gte: new Date(),
      },
    },
  });

  const totalAmountDue = await db.capitalCall.aggregate({
    where: {
      userId: user.id,
      status: 'APPROVED',
      dueDate: {
        gte: new Date(),
      },
    },
    _sum: {
      amountDue: true,
    },
  });

  // Check if user has team members
  const hasTeamMembers = user.organizationId
    ? (await db.organizationMember.count({
        where: { organizationId: user.organizationId },
      })) > 1
    : false;

  // Get recent documents
  const recentDocuments = await db.document.findMany({
    where: { userId: user.id },
    orderBy: { uploadedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      fileName: true,
      status: true,
      uploadedAt: true,
    },
  });

  return {
    userId: user.id,
    totalDocuments,
    approvedDocuments,
    pendingDocuments,
    upcomingCapitalCalls,
    totalAmountDue: totalAmountDue._sum.amountDue || 0,
    hasTeamMembers,
    recentDocuments,
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const data = await getDashboardData(userId);

  if (!data) {
    redirect('/sign-in');
  }

  const isNewUser = data.totalDocuments === 0;

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome back! Here's an overview of your capital calls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Onboarding Checklist - Show for new users or users with incomplete onboarding */}
          {(isNewUser || !data.hasTeamMembers || data.approvedDocuments === 0) && (
            <OnboardingChecklist
              userId={data.userId}
              hasDocuments={data.totalDocuments > 0}
              hasApprovedDocuments={data.approvedDocuments > 0}
              hasTeamMembers={data.hasTeamMembers}
            />
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalDocuments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.approvedDocuments} approved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.pendingDocuments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.pendingDocuments > 0 ? 'Needs your attention' : 'All caught up'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Calls</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.upcomingCapitalCalls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Capital calls due
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount Due</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Number(data.totalAmountDue).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  USD
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Documents */}
          {data.recentDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Documents</CardTitle>
                  <Link href="/upload">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentDocuments.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}/review`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          doc.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            : doc.status === 'REVIEW'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/upload">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </Link>
              <Link href="/dashboard/calendar">
                <Button className="w-full justify-start" variant="outline">
                  <Clock className="mr-2 h-4 w-4" />
                  View Calendar
                </Button>
              </Link>
              <Link href="/dashboard/team">
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Manage Team
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Get started with our comprehensive guides and documentation.
              </p>
              <div className="space-y-2">
                <a href="#" className="block text-primary hover:underline">
                  📚 Documentation
                </a>
                <a href="#" className="block text-primary hover:underline">
                  💬 Contact Support
                </a>
                <a href="#" className="block text-primary hover:underline">
                  🎥 Video Tutorials
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

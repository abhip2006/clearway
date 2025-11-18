import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { Header } from '@/components/navigation';
import { redirect } from 'next/navigation';

async function getUserRole(userId: string) {
  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || !user.organizationId) {
    return null;
  }

  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: user.organizationId,
        userId: user.id,
      },
    },
  });

  return membership?.role || null;
}

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const userRole = await getUserRole(userId);

  return (
    <div className="min-h-screen flex flex-col">
      <Header userRole={userRole || undefined} />
      <main className="flex-1">{children}</main>
    </div>
  );
}

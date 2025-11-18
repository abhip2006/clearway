import { Calendar } from '@/components/calendar';

// This would fetch from your database in production
async function getCapitalCalls() {
  // TODO: Replace with actual database query
  // const { userId } = await auth();
  // const capitalCalls = await db.capitalCall.findMany({
  //   where: {
  //     userId: userId!,
  //     status: 'APPROVED',
  //   },
  //   include: {
  //     document: true,
  //   },
  //   orderBy: {
  //     dueDate: 'asc',
  //   },
  // });
  // return capitalCalls;

  // Mock data for now
  return [
    {
      id: '1',
      fundName: 'Apollo Fund XI',
      amountDue: 250000,
      dueDate: new Date('2025-12-15'),
      status: 'APPROVED',
    },
    {
      id: '2',
      fundName: 'Blackstone Fund VIII',
      amountDue: 180000,
      dueDate: new Date('2025-12-20'),
      status: 'APPROVED',
    },
    {
      id: '3',
      fundName: 'KKR Global Impact',
      amountDue: 320000,
      dueDate: new Date('2025-11-25'),
      status: 'APPROVED',
    },
  ];
}

export default async function CalendarPage() {
  const capitalCalls = await getCapitalCalls();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Capital Call Calendar
        </h1>
        <p className="text-muted-foreground">
          View and manage all your upcoming capital calls
        </p>
      </div>

      {capitalCalls.length > 0 ? (
        <div className="space-y-8">
          <Calendar
            events={capitalCalls}
            onEventClick={(event) => {
              console.log('Event clicked:', event);
              // TODO: Show event details modal or navigate to detail page
            }}
          />

          {/* Upcoming Capital Calls List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming Capital Calls</h2>
            <div className="space-y-4">
              {capitalCalls
                .filter((call) => new Date(call.dueDate) >= new Date())
                .slice(0, 5)
                .map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium">{call.fundName}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(call.dueDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${call.amountDue.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.ceil(
                          (new Date(call.dueDate).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{' '}
                        days left
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No approved capital calls yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload and approve documents to see them in your calendar
          </p>
        </div>
      )}
    </div>
  );
}

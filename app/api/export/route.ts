// app/api/export/route.ts
// Task BE-008: CSV Export Endpoint

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stringify } from 'csv-stringify/sync';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const capitalCalls = await db.capitalCall.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const csvData = capitalCalls.map(call => ({
      'Fund Name': call.fundName,
      'Amount Due': call.amountDue,
      'Currency': call.currency,
      'Due Date': call.dueDate.toISOString().split('T')[0],
      'Bank Name': call.bankName || '',
      'Account Number': call.accountNumber || '',
      'Routing Number': call.routingNumber || '',
      'Wire Reference': call.wireReference || '',
      'Investor Email': call.investorEmail || '',
      'Investor Account': call.investorAccount || '',
    }));

    const csv = stringify(csvData, {
      header: true,
      columns: [
        'Fund Name',
        'Amount Due',
        'Currency',
        'Due Date',
        'Bank Name',
        'Account Number',
        'Routing Number',
        'Wire Reference',
        'Investor Email',
        'Investor Account',
      ],
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="capital-calls.csv"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

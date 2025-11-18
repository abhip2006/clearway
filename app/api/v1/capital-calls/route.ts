// app/api/v1/capital-calls/route.ts
// Task BE-009: Fund Admin Capital Call Ingestion (Phase 2 Prep)

import { db } from '@/lib/db';
import { z } from 'zod';

const FundAdminCapitalCallSchema = z.object({
  fund_id: z.string(),
  investor_identifiers: z.object({
    email: z.string().email().optional(),
    investor_id: z.string().optional(),
  }),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  due_date: z.coerce.date(),
  wire_instructions: z.object({
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    routing_number: z.string().optional(),
    reference: z.string().optional(),
  }),
  document_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    // Verify API key from fund administrator
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Validate API key and get fund admin
    const fundAdmin = await db.fundAdministrator.findUnique({
      where: { apiKey },
    });

    if (!fundAdmin) {
      return new Response('Invalid API key', { status: 401 });
    }

    const body = await req.json();
    const data = FundAdminCapitalCallSchema.parse(body);

    // Find user by investor identifiers
    let user = null;
    if (data.investor_identifiers.email) {
      user = await db.user.findUnique({
        where: { email: data.investor_identifiers.email },
      });
    }

    if (!user) {
      // Queue for manual matching or notify admin
      console.log('User not found for investor:', data.investor_identifiers);
      return Response.json(
        { error: 'Investor not found in system' },
        { status: 404 }
      );
    }

    // Create capital call directly (no document processing needed)
    const capitalCall = await db.capitalCall.create({
      data: {
        userId: user.id,
        fundName: data.fund_id,
        investorEmail: data.investor_identifiers.email,
        investorAccount: data.investor_identifiers.investor_id,
        amountDue: data.amount,
        currency: data.currency,
        dueDate: data.due_date,
        bankName: data.wire_instructions.bank_name,
        accountNumber: data.wire_instructions.account_number,
        routingNumber: data.wire_instructions.routing_number,
        wireReference: data.wire_instructions.reference,
        status: 'APPROVED', // From fund admin = auto-approved
        rawExtraction: data.metadata,
        confidenceScores: { fundName: 1.0, amountDue: 1.0, dueDate: 1.0 },
      },
    });

    return Response.json(
      {
        id: capitalCall.id,
        status: 'processed',
        delivered_to: [user.email],
        processed_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error('Fund admin API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

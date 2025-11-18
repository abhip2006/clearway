// Payment Prediction API
// Task AN-003: Predictive Analytics Engine

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { PaymentPredictionEngine } from '@/lib/analytics/predictive';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const body = await request.json();
    const { capitalCallId } = body;

    if (!capitalCallId) {
      return new Response('capitalCallId is required', { status: 400 });
    }

    // Get the capital call
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: capitalCallId, userId: user.id },
    });

    if (!capitalCall) {
      return new Response('Capital call not found', { status: 404 });
    }

    // Get historical data for training
    const historicalData = await db.capitalCall.findMany({
      where: {
        userId: user.id,
        status: 'PAID',
        paidAt: { not: null },
      },
      select: {
        dueDate: true,
        amountDue: true,
        fundName: true,
        paidAt: true,
        status: true,
      },
    });

    if (historicalData.length < 10) {
      return Response.json({
        error: 'Insufficient historical data',
        message: 'Need at least 10 paid capital calls to make predictions',
      }, { status: 400 });
    }

    // Train and predict
    const engine = new PaymentPredictionEngine();
    await engine.train(historicalData.map(d => ({
      dueDate: d.dueDate,
      amountDue: d.amountDue.toNumber(),
      fundName: d.fundName,
      paidAt: d.paidAt,
      status: d.status,
    })));

    const prediction = await engine.predictPaymentDate({
      dueDate: capitalCall.dueDate,
      amountDue: capitalCall.amountDue.toNumber(),
      fundName: capitalCall.fundName,
    });

    return Response.json(prediction);
  } catch (error) {
    console.error('Prediction API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

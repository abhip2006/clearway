import { NextRequest, NextResponse } from 'next/server';
import { authenticateInvestor, unauthorizedResponse, errorResponse } from '@/lib/investor/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['TECHNICAL', 'ACCOUNT', 'DOCUMENT', 'PAYMENT', 'GENERAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      investorId: auth.investor!.id,
    };

    if (status) {
      where.status = status;
    }

    const tickets = await prisma.investorSupportTicket.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        resolvedDate: t.resolvedDate,
        resolutionSummary: t.resolutionSummary,
        satisfactionRating: t.satisfactionRating,
      })),
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return errorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    const data = createTicketSchema.parse(body);

    // Generate ticket number
    const ticketNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const ticket = await prisma.investorSupportTicket.create({
      data: {
        investorId: auth.investor!.id,
        ticketNumber,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: 'OPEN',
      },
    });

    // Log the action
    await prisma.investorAuditLog.create({
      data: {
        investorId: auth.investor!.id,
        action: 'SUPPORT_TICKET_CREATED',
        newValues: { ticketId: ticket.id, ticketNumber },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Error creating support ticket:', error);
    return errorResponse();
  }
}

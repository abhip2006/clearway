import { NextRequest, NextResponse } from 'next/server';
import { authenticateInvestor, unauthorizedResponse, errorResponse } from '@/lib/investor/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  phoneNumber: z.string().optional(),
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z.string().email().optional().or(z.literal('')),
  secondaryContactPhone: z.string().optional(),
  mailingAddress: z.string().optional(),
  preferredLanguage: z.string().optional(),
  preferredTimezone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const investor = await prisma.investor.findUnique({
      where: { id: auth.investor!.id },
      include: {
        fundParticipations: true,
        communicationPreferences: true,
      },
    });

    if (!investor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    // Mask sensitive data
    return NextResponse.json({
      id: investor.id,
      email: investor.email,
      legalName: investor.legalName,
      entityType: investor.entityType,
      accreditedStatus: investor.accreditedStatus,
      phoneNumber: investor.phoneNumber,
      secondaryContactName: investor.secondaryContactName,
      secondaryContactEmail: investor.secondaryContactEmail,
      secondaryContactPhone: investor.secondaryContactPhone,
      preferredLanguage: investor.preferredLanguage,
      preferredTimezone: investor.preferredTimezone,
      communicationFrequency: investor.communicationFrequency,
      mailingAddress: investor.mailingAddress,
      status: investor.status,
      fundParticipations: investor.fundParticipations,
      communicationPreferences: investor.communicationPreferences,
    });
  } catch (error) {
    console.error('Error fetching investor profile:', error);
    return errorResponse();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const updatedInvestor = await prisma.investor.update({
      where: { id: auth.investor!.id },
      data,
    });

    // Log the update
    await prisma.investorAuditLog.create({
      data: {
        investorId: auth.investor!.id,
        action: 'PROFILE_UPDATED',
        newValues: data,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      investor: updatedInvestor,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Error updating investor profile:', error);
    return errorResponse();
  }
}

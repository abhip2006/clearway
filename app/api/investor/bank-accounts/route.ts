import { NextRequest, NextResponse } from 'next/server';
import { authenticateInvestor, unauthorizedResponse, errorResponse } from '@/lib/investor/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addBankAccountSchema = z.object({
  accountNickname: z.string().optional(),
  accountType: z.enum(['CHECKING', 'SAVINGS', 'WIRE', 'INTERNATIONAL']),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  bankName: z.string().optional(),
  routingNumber: z.string().optional(),
  accountNumber: z.string().min(1, 'Account number is required'),
  accountCountry: z.string().default('US'),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateInvestor();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    const bankAccounts = await prisma.investorBankAccount.findMany({
      where: {
        investorId: auth.investor!.id,
        isActive: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      bankAccounts: bankAccounts.map(ba => ({
        id: ba.id,
        accountNickname: ba.accountNickname,
        accountType: ba.accountType,
        accountHolderName: ba.accountHolderName,
        bankName: ba.bankName,
        accountNumberMasked: ba.accountNumberMasked,
        accountCountry: ba.accountCountry,
        isVerified: ba.isVerified,
        isPrimary: ba.isPrimary,
        createdAt: ba.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
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
    const data = addBankAccountSchema.parse(body);

    // Mask account number (show last 4 digits)
    const accountNumberMasked = `****${data.accountNumber.slice(-4)}`;

    // In production, encrypt the account number
    // const encryptedAccountNumber = await encryptData(data.accountNumber);

    const bankAccount = await prisma.investorBankAccount.create({
      data: {
        investorId: auth.investor!.id,
        accountNickname: data.accountNickname,
        accountType: data.accountType,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        routingNumber: data.routingNumber, // Should be encrypted
        accountNumber: data.accountNumber, // Should be encrypted
        accountNumberMasked,
        accountCountry: data.accountCountry,
        swiftCode: data.swiftCode,
        iban: data.iban,
        isVerified: false,
        isPrimary: false,
      },
    });

    // Create verification record
    await prisma.bankAccountVerification.create({
      data: {
        bankAccountId: bankAccount.id,
      },
    });

    // Log the action
    await prisma.investorAuditLog.create({
      data: {
        investorId: auth.investor!.id,
        action: 'BANK_ACCOUNT_ADDED',
        newValues: { bankAccountId: bankAccount.id },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      message: 'Bank account added successfully',
      bankAccount: {
        id: bankAccount.id,
        accountNickname: bankAccount.accountNickname,
        accountNumberMasked: bankAccount.accountNumberMasked,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Error adding bank account:', error);
    return errorResponse();
  }
}

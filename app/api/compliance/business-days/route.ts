// GET /api/compliance/business-days
// Get business days for a region and year
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const regionCode = searchParams.get('region');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    if (!regionCode) {
      return NextResponse.json(
        { error: 'Missing region parameter' },
        { status: 400 }
      );
    }

    // Get region
    const region = await prisma.complianceRegion.findUnique({
      where: { regionCode },
    });

    if (!region) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    // Get business day calendar
    const calendar = await prisma.businessDayCalendar.findMany({
      where: {
        regionId: region.id,
        year,
      },
      orderBy: { day: 'asc' },
    });

    // Group by type
    const businessDays = calendar.filter(c => c.dayType === 'business_day');
    const holidays = calendar.filter(c => c.dayType === 'holiday');
    const settlementDays = calendar.filter(c => c.isSettlementDay);

    return NextResponse.json({
      region: {
        code: regionCode,
        name: region.regionName,
      },
      year,
      calendar: calendar.map(c => ({
        date: c.day.toISOString().split('T')[0],
        type: c.dayType,
        name: c.dayName,
        localName: c.localName,
        isSettlement: c.isSettlementDay,
        settlementTPlus: c.settlementTPlus,
      })),
      summary: {
        totalBusinessDays: businessDays.length,
        totalHolidays: holidays.length,
        totalSettlementDays: settlementDays.length,
      },
    });
  } catch (error) {
    console.error('Error fetching business days:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business days calendar' },
      { status: 500 }
    );
  }
}

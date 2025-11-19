// GET /api/compliance/regional-config
// Get regional compliance configuration
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const regionCode = searchParams.get('region');

    if (!regionCode) {
      // Return all regions if no specific region requested
      const allRegions = await prisma.complianceRegion.findMany({
        select: {
          id: true,
          regionCode: true,
          regionName: true,
          regulationFramework: true,
          dataResidencyRequired: true,
          taxReportingRequired: true,
          withholdingTaxApplicable: true,
        },
        orderBy: { regionName: 'asc' },
      });

      return NextResponse.json({
        regions: allRegions,
        total: allRegions.length,
      });
    }

    // Get specific region
    const config = await prisma.complianceRegion.findUnique({
      where: { regionCode },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      region: config.regionName,
      code: config.regionCode,
      framework: config.regulationFramework,
      dataResidency: {
        required: config.dataResidencyRequired,
        countries: config.dataResidencyCountries,
      },
      audit: {
        requiresLocal: config.requiresLocalAudit,
        language: config.auditLanguage,
      },
      tax: {
        reportingRequired: config.taxReportingRequired,
        withholdingApplicable: config.withholdingTaxApplicable,
        standardRate: config.standardWithholdingRate?.toString(),
      },
      businessDays: config.businessDays,
      holidays: config.holidays,
      kycRequirements: config.kycRequirements,
      amlThresholds: config.amlThresholds?.toString(),
    });
  } catch (error) {
    console.error('Error fetching regional config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional configuration' },
      { status: 500 }
    );
  }
}

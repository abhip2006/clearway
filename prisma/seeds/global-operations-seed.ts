// Global Operations Seed Script
// Seeds 20+ currencies, 5 languages, regional compliance, and sample translations

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedGlobalOperations() {
  console.log('Seeding global operations data...');

  // ============================================
  // 1. SEED CURRENCIES (20+)
  // ============================================
  console.log('Seeding currencies...');

  const currencies = await Promise.all([
    // Major currencies
    prisma.currency.upsert({
      where: { code: 'USD' },
      update: {},
      create: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Americas',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'EUR' },
      update: {},
      create: {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Europe',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'GBP' },
      update: {},
      create: {
        code: 'GBP',
        name: 'British Pound Sterling',
        symbol: '£',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Europe',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'JPY' },
      update: {},
      create: {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        decimalPlaces: 0,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'AUD' },
      update: {},
      create: {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'CAD' },
      update: {},
      create: {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Americas',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'CHF' },
      update: {},
      create: {
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'CHF',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Europe',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'CNY' },
      update: {},
      create: {
        code: 'CNY',
        name: 'Chinese Yuan',
        symbol: '¥',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'SGD' },
      update: {},
      create: {
        code: 'SGD',
        name: 'Singapore Dollar',
        symbol: 'S$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'HKD' },
      update: {},
      create: {
        code: 'HKD',
        name: 'Hong Kong Dollar',
        symbol: 'HK$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'NZD' },
      update: {},
      create: {
        code: 'NZD',
        name: 'New Zealand Dollar',
        symbol: 'NZ$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'INR' },
      update: {},
      create: {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'MXN' },
      update: {},
      create: {
        code: 'MXN',
        name: 'Mexican Peso',
        symbol: 'Mex$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Americas',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'BRL' },
      update: {},
      create: {
        code: 'BRL',
        name: 'Brazilian Real',
        symbol: 'R$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Americas',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'ZAR' },
      update: {},
      create: {
        code: 'ZAR',
        name: 'South African Rand',
        symbol: 'R',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Africa',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'KRW' },
      update: {},
      create: {
        code: 'KRW',
        name: 'South Korean Won',
        symbol: '₩',
        decimalPlaces: 0,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'TWD' },
      update: {},
      create: {
        code: 'TWD',
        name: 'Taiwan Dollar',
        symbol: 'NT$',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'APAC',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'SEK' },
      update: {},
      create: {
        code: 'SEK',
        name: 'Swedish Krona',
        symbol: 'kr',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Europe',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'NOK' },
      update: {},
      create: {
        code: 'NOK',
        name: 'Norwegian Krone',
        symbol: 'kr',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Europe',
      },
    }),
    prisma.currency.upsert({
      where: { code: 'DKK' },
      update: {},
      create: {
        code: 'DKK',
        name: 'Danish Krone',
        symbol: 'kr',
        decimalPlaces: 2,
        enabled: true,
        isCrypto: false,
        region: 'Europe',
      },
    }),
  ]);

  console.log(`✓ Seeded ${currencies.length} currencies`);

  // ============================================
  // 2. SEED LANGUAGES (5)
  // ============================================
  console.log('Seeding languages...');

  const languages = await Promise.all([
    prisma.language.upsert({
      where: { code: 'en' },
      update: {},
      create: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        rtl: false,
        enabled: true,
      },
    }),
    prisma.language.upsert({
      where: { code: 'es' },
      update: {},
      create: {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        rtl: false,
        enabled: true,
      },
    }),
    prisma.language.upsert({
      where: { code: 'fr' },
      update: {},
      create: {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        rtl: false,
        enabled: true,
      },
    }),
    prisma.language.upsert({
      where: { code: 'de' },
      update: {},
      create: {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        rtl: false,
        enabled: true,
      },
    }),
    prisma.language.upsert({
      where: { code: 'zh-CN' },
      update: {},
      create: {
        code: 'zh-CN',
        name: 'Mandarin Chinese',
        nativeName: '简体中文',
        rtl: false,
        enabled: true,
      },
    }),
  ]);

  console.log(`✓ Seeded ${languages.length} languages`);

  // ============================================
  // 3. SEED EXCHANGE RATES (Sample)
  // ============================================
  console.log('Seeding sample exchange rates...');

  const usd = currencies.find(c => c.code === 'USD')!;
  const eur = currencies.find(c => c.code === 'EUR')!;
  const gbp = currencies.find(c => c.code === 'GBP')!;
  const jpy = currencies.find(c => c.code === 'JPY')!;

  await Promise.all([
    // USD to other currencies
    prisma.exchangeRate.upsert({
      where: {
        fromCurrencyId_toCurrencyId_rateTimestamp: {
          fromCurrencyId: usd.id,
          toCurrencyId: eur.id,
          rateTimestamp: new Date(),
        },
      },
      update: {},
      create: {
        fromCurrencyId: usd.id,
        toCurrencyId: eur.id,
        rate: 0.92,
        rateTimestamp: new Date(),
        source: 'seed_data',
        isMidMarket: true,
        confidenceScore: 1.0,
      },
    }),
    prisma.exchangeRate.upsert({
      where: {
        fromCurrencyId_toCurrencyId_rateTimestamp: {
          fromCurrencyId: usd.id,
          toCurrencyId: gbp.id,
          rateTimestamp: new Date(),
        },
      },
      update: {},
      create: {
        fromCurrencyId: usd.id,
        toCurrencyId: gbp.id,
        rate: 0.79,
        rateTimestamp: new Date(),
        source: 'seed_data',
        isMidMarket: true,
        confidenceScore: 1.0,
      },
    }),
    prisma.exchangeRate.upsert({
      where: {
        fromCurrencyId_toCurrencyId_rateTimestamp: {
          fromCurrencyId: usd.id,
          toCurrencyId: jpy.id,
          rateTimestamp: new Date(),
        },
      },
      update: {},
      create: {
        fromCurrencyId: usd.id,
        toCurrencyId: jpy.id,
        rate: 149.50,
        rateTimestamp: new Date(),
        source: 'seed_data',
        isMidMarket: true,
        confidenceScore: 1.0,
      },
    }),
  ]);

  console.log('✓ Seeded sample exchange rates');

  // ============================================
  // 4. SEED COMPLIANCE REGIONS
  // ============================================
  console.log('Seeding compliance regions...');

  const regions = await Promise.all([
    prisma.complianceRegion.upsert({
      where: { regionCode: 'UK' },
      update: {},
      create: {
        regionCode: 'UK',
        regionName: 'United Kingdom',
        regulationFramework: 'FCA',
        dataResidencyRequired: true,
        dataResidencyCountries: 'UK,EU',
        requiresLocalAudit: true,
        auditLanguage: 'en',
        taxReportingRequired: true,
        withholdingTaxApplicable: true,
        standardWithholdingRate: 20.0,
        businessDays: { days: [1, 2, 3, 4, 5] },
        kycRequirements: { levels: 3, documentsRequired: ['passport', 'proof_of_address'] },
        amlThresholds: 10000,
      },
    }),
    prisma.complianceRegion.upsert({
      where: { regionCode: 'EU' },
      update: {},
      create: {
        regionCode: 'EU',
        regionName: 'European Union',
        regulationFramework: 'MiFID II',
        dataResidencyRequired: true,
        dataResidencyCountries: 'EU',
        requiresLocalAudit: true,
        auditLanguage: 'en',
        taxReportingRequired: true,
        withholdingTaxApplicable: true,
        standardWithholdingRate: 15.0,
        businessDays: { days: [1, 2, 3, 4, 5] },
        kycRequirements: { levels: 3, documentsRequired: ['id', 'proof_of_address', 'source_of_funds'] },
        amlThresholds: 10000,
      },
    }),
    prisma.complianceRegion.upsert({
      where: { regionCode: 'APAC' },
      update: {},
      create: {
        regionCode: 'APAC',
        regionName: 'Asia-Pacific',
        regulationFramework: 'ASIC',
        dataResidencyRequired: false,
        requiresLocalAudit: false,
        taxReportingRequired: true,
        withholdingTaxApplicable: true,
        standardWithholdingRate: 10.0,
        businessDays: { days: [1, 2, 3, 4, 5] },
        kycRequirements: { levels: 2, documentsRequired: ['passport'] },
        amlThresholds: 10000,
      },
    }),
  ]);

  console.log(`✓ Seeded ${regions.length} compliance regions`);

  console.log('✅ Global operations seed completed successfully');
}

// Run if called directly
if (require.main === module) {
  seedGlobalOperations()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

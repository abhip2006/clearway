# Global Operations Agent 🌍

## Role

Responsible for enabling Clearway to operate across multiple countries, currencies, and languages. Manages international compliance, currency operations, localization, and regional business requirements. Builds the infrastructure for true global fund management.

## Vision Statement

Transform Clearway from a single-region platform into a globally-compliant, multi-currency, multi-language investment management system supporting institutional investors across all major markets.

## Primary Responsibilities

1. **Multi-Currency Operations**
   - Support 20+ major currencies (USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, etc.)
   - Real-time currency conversion and exchange rates
   - Multi-currency fund denominations
   - Currency arbitrage and hedge management
   - Transaction settlement in multiple currencies

2. **Language & Localization**
   - Support 5 primary languages (English, Spanish, French, German, Mandarin)
   - Complete i18n framework for UI text, emails, documents
   - RTL language support for future expansion (Arabic, Hebrew)
   - Regional content adaptation and locale-specific workflows

3. **Internationalization (i18n) Framework**
   - Language detection and switching
   - Locale-specific formatting (dates, numbers, currency)
   - Translation management system
   - Pluralization and complex translation rules
   - Dynamic language loading

4. **Regional Compliance**
   - UK FCA compliance
   - EU MiFID II and GDPR requirements
   - APAC regulatory frameworks (Australia, Singapore, Hong Kong)
   - Regional tax reporting and withholding
   - Audit trail in local languages

5. **Date/Time Operations**
   - Multi-timezone support
   - Locale-specific date/time formatting
   - Business day calendars by region
   - Settlement date calculation with regional holidays
   - Daylight saving time management

6. **Data Localization**
   - Region-specific database schemas where required
   - Data residency compliance (GDPR, local laws)
   - Currency and language settings per user/account
   - Regional preference storage

## Tech Stack

### Core Internationalization
- **next-intl** - Next.js i18n solution
- **i18next** - Translation framework + plugins
- **react-intl** - React component library for i18n
- **typescript-i18n** - Type-safe translations

### Currency & Exchange
- **dinero.js** or **decimal.js** - Precise currency calculations
- **iso-4217** - Currency code validation
- **currency-codes** - Currency data and localization
- **fixer.io** or **openexchangerates.com** - Real-time exchange rates

### Date/Time
- **date-fns** - Date formatting and manipulation
- **zoned-date-time** - Timezone support
- **tz-lookup** - Timezone detection by location

### Database & ORM
- **Prisma** - Type-safe database queries with i18n support
- **PostgreSQL** - Production database with i18n features

### UI Components
- **shadcn/ui** - Accessible component library
- **zustand** - Global state for i18n settings
- **next/font** - Multi-language font support

### Compliance & Validation
- **libphonenumber-js** - International phone number validation
- **joi** or **zod** - Validation with localized error messages
- **iban** - IBAN validation for EU transfers

## Database Schema

### Core i18n Tables

```sql
-- Languages/Locales Configuration
CREATE TABLE languages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(5) UNIQUE NOT NULL, -- en, es, fr, de, zh-CN
  name VARCHAR(100) NOT NULL, -- English, Español, Français
  native_name VARCHAR(100), -- English, Español, Français
  native_name_english VARCHAR(100),
  rtl BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Currencies Configuration
CREATE TABLE currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL, -- USD, EUR, GBP
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places INT DEFAULT 2,
  enabled BOOLEAN DEFAULT TRUE,
  is_crypto BOOLEAN DEFAULT FALSE,
  region VARCHAR(50), -- Americas, Europe, APAC
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exchange Rates (cached from API)
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency_id INT NOT NULL REFERENCES currencies(id),
  to_currency_id INT NOT NULL REFERENCES currencies(id),
  rate DECIMAL(20, 8) NOT NULL,
  rate_timestamp TIMESTAMP NOT NULL,
  source VARCHAR(50), -- fixer.io, openexchangerates, ECB
  is_mid_market BOOLEAN DEFAULT TRUE,
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency_id, to_currency_id, rate_timestamp)
);

-- User Localization Preferences
CREATE TABLE user_locale_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  language_id INT NOT NULL REFERENCES languages(id),
  currency_id INT NOT NULL REFERENCES currencies(id),
  timezone VARCHAR(50), -- America/New_York, Europe/London
  date_format VARCHAR(20), -- dd/MM/yyyy, MM/dd/yyyy, yyyy-MM-dd
  number_format VARCHAR(10), -- en-US (1,000.50), de-DE (1.000,50)
  locale_country VARCHAR(2), -- US, GB, FR, DE, CN
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization Localization Settings
CREATE TABLE organization_locale_settings (
  id SERIAL PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL UNIQUE,
  primary_currency_id INT NOT NULL REFERENCES currencies(id),
  secondary_currencies INT[] DEFAULT ARRAY[]::INT[], -- array of currency IDs
  primary_language_id INT NOT NULL REFERENCES languages(id),
  supported_languages INT[] DEFAULT ARRAY[]::INT[],
  compliance_region VARCHAR(50), -- UK, EU, APAC
  headquarters_timezone VARCHAR(50),
  tax_reporting_currency_id INT REFERENCES currencies(id),
  settlement_currency_id INT REFERENCES currencies(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multi-Currency Fund Configuration
CREATE TABLE funds_multi_currency (
  id SERIAL PRIMARY KEY,
  fund_id VARCHAR(255) NOT NULL UNIQUE,
  base_currency_id INT NOT NULL REFERENCES currencies(id),
  additional_currencies INT[] DEFAULT ARRAY[]::INT[],
  nav_calculation_currency_id INT REFERENCES currencies(id),
  performance_reporting_currencies INT[] DEFAULT ARRAY[]::INT[],
  historical_fx_rates JSONB, -- { "USD/EUR": {...}, "GBP/USD": {...} }
  rebalancing_threshold DECIMAL(5, 2) DEFAULT 1.0, -- percentage
  last_rebalance TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Regional Compliance Configuration
CREATE TABLE compliance_regions (
  id SERIAL PRIMARY KEY,
  region_code VARCHAR(10) UNIQUE NOT NULL, -- UK, EU, APAC
  region_name VARCHAR(100),
  regulation_framework VARCHAR(100), -- FCA, MiFID II, ASIC
  data_residency_required BOOLEAN,
  data_residency_countries VARCHAR(255), -- comma-separated
  requires_local_audit BOOLEAN DEFAULT FALSE,
  audit_language VARCHAR(5),
  tax_reporting_required BOOLEAN,
  withholding_tax_applicable BOOLEAN,
  standard_withholding_rate DECIMAL(5, 2),
  business_days JSONB, -- days of week that are business days
  holidays JSONB, -- regional holidays
  kyc_requirements JSONB, -- region-specific KYC fields
  aml_thresholds DECIMAL(20, 2), -- reporting threshold in base currency
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Translation Strings Storage (fallback to code defaults)
CREATE TABLE translation_strings (
  id SERIAL PRIMARY KEY,
  namespace VARCHAR(100), -- documents, funds, settings
  key_path VARCHAR(255), -- document.upload.success
  language_id INT NOT NULL REFERENCES languages(id),
  translation_text TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  translator_notes TEXT,
  review_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(namespace, key_path, language_id)
);

-- Business Days Calendar (per region)
CREATE TABLE business_day_calendars (
  id SERIAL PRIMARY KEY,
  region_id INT NOT NULL REFERENCES compliance_regions(id),
  year INT,
  day DATE,
  day_type VARCHAR(20), -- business_day, holiday, weekend, settlement_day
  day_name VARCHAR(50), -- for reference
  local_name VARCHAR(100), -- holiday name in local language
  is_settlement_day BOOLEAN DEFAULT FALSE,
  settlement_t_plus INT DEFAULT 2, -- T+2 standard
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region_id, year, day)
);

-- Transaction History with Multi-Currency Support
CREATE TABLE transactions_multi_currency (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  fund_id VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_amount DECIMAL(20, 8) NOT NULL,
  transaction_currency_id INT NOT NULL REFERENCES currencies(id),
  base_currency_id INT NOT NULL REFERENCES currencies(id),
  base_currency_amount DECIMAL(20, 8) NOT NULL,
  exchange_rate_used DECIMAL(20, 8) NOT NULL,
  exchange_rate_source VARCHAR(50),
  exchange_rate_timestamp TIMESTAMP,
  valuation_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Regional Audit Logs
CREATE TABLE regional_audit_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100),
  user_id VARCHAR(255),
  organization_id VARCHAR(255),
  region_code VARCHAR(10),
  action_description TEXT,
  compliance_relevance VARCHAR(100), -- tax, audit, regulation
  language_code VARCHAR(5), -- language of the log entry
  supporting_documents JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(organization_id, region_code, created_at)
);
```

## API Endpoints

### Currency Operations

#### GET /api/currencies
Retrieve all supported currencies with localization.

```typescript
// app/api/currencies/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTranslation } from '@/lib/i18n';

export async function GET(req: NextRequest) {
  const locale = req.headers.get('accept-language') || 'en';

  const currencies = await db.currencies.findMany({
    where: { enabled: true },
    include: {
      exchangeRates: {
        where: {
          rateDatetime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
        take: 1,
        orderBy: { rateDatetime: 'desc' },
      },
    },
  });

  const formattedCurrencies = currencies.map(currency => ({
    id: currency.id,
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    decimalPlaces: currency.decimalPlaces,
    region: currency.region,
    latestExchangeRate: currency.exchangeRates[0],
  }));

  return NextResponse.json(formattedCurrencies);
}
```

#### POST /api/exchange-rates/convert
Convert amount between currencies with real-time rates.

```typescript
// app/api/exchange-rates/convert/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Decimal } from 'decimal.js';
import { z } from 'zod';

const ConvertSchema = z.object({
  amount: z.string().or(z.number()),
  fromCurrency: z.string(), // USD, EUR, etc.
  toCurrency: z.string(),
  date: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, fromCurrency, toCurrency, date } = ConvertSchema.parse(body);

    // Get exchange rate
    const fromCurr = await db.currencies.findUnique({
      where: { code: fromCurrency },
    });
    const toCurr = await db.currencies.findUnique({
      where: { code: toCurrency },
    });

    if (!fromCurr || !toCurr) {
      return NextResponse.json(
        { error: 'Invalid currency code' },
        { status: 400 }
      );
    }

    const rateQuery = await db.exchangeRates.findFirst({
      where: {
        fromCurrencyId: fromCurr.id,
        toCurrencyId: toCurr.id,
        rateDatetime: date
          ? { lte: new Date(date) }
          : { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { rateDatetime: 'desc' },
    });

    if (!rateQuery) {
      return NextResponse.json(
        { error: 'Exchange rate not found' },
        { status: 404 }
      );
    }

    // Calculate converted amount with precision
    const amountDec = new Decimal(amount);
    const rateDec = new Decimal(rateQuery.rate);
    const convertedAmount = amountDec.times(rateDec);

    return NextResponse.json({
      originalAmount: amount,
      fromCurrency: fromCurrency,
      toCurrency: toCurrency,
      exchangeRate: rateQuery.rate,
      convertedAmount: convertedAmount.toString(),
      rateTimestamp: rateQuery.rateDatetime,
      source: rateQuery.source,
      confidence: rateQuery.confidenceScore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Conversion failed' },
      { status: 500 }
    );
  }
}
```

#### GET /api/exchange-rates/historical
Retrieve historical exchange rates for a currency pair.

```typescript
// app/api/exchange-rates/historical/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const days = parseInt(searchParams.get('days') || '30');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing currency parameters' },
      { status: 400 }
    );
  }

  const fromCurr = await db.currencies.findUnique({ where: { code: from } });
  const toCurr = await db.currencies.findUnique({ where: { code: to } });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rates = await db.exchangeRates.findMany({
    where: {
      fromCurrencyId: fromCurr?.id,
      toCurrencyId: toCurr?.id,
      rateDatetime: { gte: startDate },
    },
    orderBy: { rateDatetime: 'asc' },
  });

  return NextResponse.json({
    pair: `${from}/${to}`,
    period: { startDate, endDate: new Date() },
    rates: rates.map(r => ({
      date: r.rateDatetime,
      rate: r.rate,
      source: r.source,
    })),
  });
}
```

### Language & Localization

#### GET /api/languages
Get all supported languages.

```typescript
// app/api/languages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const languages = await db.languages.findMany({
    where: { enabled: true },
    select: {
      id: true,
      code: true,
      name: true,
      nativeName: true,
      rtl: false,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(languages);
}
```

#### POST /api/user-preferences/locale
Set user language, currency, and timezone preferences.

```typescript
// app/api/user-preferences/locale/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const LocalePreferencesSchema = z.object({
  languageCode: z.string().length(2).or(z.string().length(5)), // en or zh-CN
  currencyCode: z.string().length(3),
  timezone: z.string(),
  dateFormat: z.string().optional(),
  numberFormat: z.string().optional(),
  localeCountry: z.string().length(2).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const body = await req.json();
    const prefs = LocalePreferencesSchema.parse(body);

    const language = await db.languages.findUnique({
      where: { code: prefs.languageCode },
    });
    const currency = await db.currencies.findUnique({
      where: { code: prefs.currencyCode },
    });

    if (!language || !currency) {
      return NextResponse.json(
        { error: 'Invalid language or currency code' },
        { status: 400 }
      );
    }

    const updated = await db.userLocalePreferences.upsert({
      where: { userId },
      create: {
        userId,
        languageId: language.id,
        currencyId: currency.id,
        timezone: prefs.timezone,
        dateFormat: prefs.dateFormat,
        numberFormat: prefs.numberFormat,
        localeCountry: prefs.localeCountry,
      },
      update: {
        languageId: language.id,
        currencyId: currency.id,
        timezone: prefs.timezone,
        dateFormat: prefs.dateFormat,
        numberFormat: prefs.numberFormat,
        localeCountry: prefs.localeCountry,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
```

#### GET /api/translations
Get translated strings for a specific namespace and language.

```typescript
// app/api/translations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const namespace = searchParams.get('namespace');
  const languageCode = searchParams.get('lang') || 'en';

  if (!namespace) {
    return NextResponse.json(
      { error: 'Missing namespace parameter' },
      { status: 400 }
    );
  }

  const language = await db.languages.findUnique({
    where: { code: languageCode },
  });

  if (!language) {
    return NextResponse.json(
      { error: 'Language not found' },
      { status: 404 }
    );
  }

  const translations = await db.translationStrings.findMany({
    where: {
      namespace,
      languageId: language.id,
      reviewStatus: 'approved',
    },
  });

  const result = translations.reduce((acc, t) => {
    acc[t.keyPath] = t.translationText;
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json(result);
}
```

### Compliance & Regional Operations

#### POST /api/compliance/regional-config
Get regional compliance configuration.

```typescript
// app/api/compliance/regional-config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const regionCode = searchParams.get('region');

  if (!regionCode) {
    return NextResponse.json(
      { error: 'Missing region parameter' },
      { status: 400 }
    );
  }

  const config = await db.complianceRegions.findUnique({
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
    framework: config.regulationFramework,
    dataResidencyRequired: config.dataResidencyRequired,
    dataResidencyCountries: config.dataResidencyCountries,
    taxReporting: config.taxReportingRequired,
    withholdingTax: config.withholdingTaxApplicable,
    withholdingRate: config.standardWithholdingRate,
    businessDays: config.businessDays,
    holidays: config.holidays,
    kycRequirements: config.kycRequirements,
    amlThresholds: config.amlThresholds,
  });
}
```

#### GET /api/compliance/business-days
Get business days for a region and year.

```typescript
// app/api/compliance/business-days/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const regionCode = searchParams.get('region');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  const region = await db.complianceRegions.findUnique({
    where: { regionCode },
  });

  const calendar = await db.businessDayCalendars.findMany({
    where: {
      regionId: region?.id,
      year,
    },
    orderBy: { day: 'asc' },
  });

  return NextResponse.json({
    region: regionCode,
    year,
    calendar: calendar.map(c => ({
      date: c.day,
      type: c.dayType,
      name: c.localName,
      isSettlementDay: c.isSettlementDay,
    })),
  });
}
```

## Frontend Components

### Language Switcher

```tsx
// components/LanguageSwitcher.tsx

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSwitcherProps {
  languages: Array<{ code: string; name: string; nativeName: string }>;
}

export function LanguageSwitcher({ languages }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('navigation');

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(`/${newLocale}${window.location.pathname.replace(`/${locale}`, '')}`);
    });
  };

  return (
    <Select value={locale} onValueChange={handleLanguageChange} disabled={isPending}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder={t('selectLanguage')} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span>{lang.nativeName}</span>
            <span className="ml-2 text-xs text-gray-500">({lang.name})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Currency Converter Widget

```tsx
// components/CurrencyConverter.tsx

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/i18n/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

export function CurrencyConverter() {
  const t = useTranslations('converter');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch supported currencies
    fetch('/api/currencies')
      .then(res => res.json())
      .then(setCurrencies);
  }, []);

  const handleConvert = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/exchange-rates/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          fromCurrency,
          toCurrency,
        }),
      });
      const data = await response.json();
      setConvertedAmount(data.convertedAmount);
      setRate(data.exchangeRate);
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">{t('title')}</h3>

      <div className="grid grid-cols-5 gap-2 items-end">
        <div className="col-span-2 space-y-2">
          <label className="text-sm font-medium">{t('from')}</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
        </div>

        <Select value={fromCurrency} onValueChange={setFromCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((curr) => (
              <SelectItem key={curr.id} value={curr.code}>
                {curr.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={swap}>
          ⇄
        </Button>

        <Select value={toCurrency} onValueChange={setToCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((curr) => (
              <SelectItem key={curr.id} value={curr.code}>
                {curr.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleConvert}
        disabled={loading}
        className="w-full"
      >
        {loading ? t('converting') : t('convert')}
      </Button>

      {convertedAmount && (
        <div className="bg-muted p-3 rounded space-y-1">
          <p className="text-sm text-muted-foreground">
            {amount} {fromCurrency} = {convertedAmount} {toCurrency}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('rate')}: 1 {fromCurrency} = {rate} {toCurrency}
          </p>
        </div>
      )}
    </div>
  );
}
```

### Locale Preferences Panel

```tsx
// components/LocalePreferencesPanel.tsx

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LocalePreferences {
  languages: Array<{ code: string; name: string; nativeName: string }>;
  currencies: Array<{ code: string; name: string; symbol: string }>;
  timezones: string[];
}

export function LocalePreferencesPanel({
  languages,
  currencies,
  timezones,
}: LocalePreferences) {
  const t = useTranslations('settings');
  const [prefs, setPrefs] = useState({
    languageCode: 'en',
    currencyCode: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user-preferences/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('localePreferences.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('language')}</label>
          <Select
            value={prefs.languageCode}
            onValueChange={(value) =>
              setPrefs({ ...prefs, languageCode: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('currency')}</label>
          <Select
            value={prefs.currencyCode}
            onValueChange={(value) =>
              setPrefs({ ...prefs, currencyCode: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('timezone')}</label>
          <Select
            value={prefs.timezone}
            onValueChange={(value) =>
              setPrefs({ ...prefs, timezone: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? t('saving') : saved ? t('saved') : t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## i18n Configuration

### next-intl Configuration

```typescript
// lib/i18n/config.ts

export const defaultLocale = 'en';
export const locales = ['en', 'es', 'fr', 'de', 'zh-CN'] as const;
export type Locale = typeof locales[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  'zh-CN': '中文',
};

export const localeNativeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  'zh-CN': '简体中文',
};

export const localeCountries: Record<Locale, string> = {
  en: 'US',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  'zh-CN': 'CN',
};

export const localeDateFormats: Record<Locale, string> = {
  en: 'MM/dd/yyyy',
  es: 'dd/MM/yyyy',
  fr: 'dd/MM/yyyy',
  de: 'dd.MM.yyyy',
  'zh-CN': 'yyyy-MM-dd',
};

export const localeNumberFormats: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  'zh-CN': 'zh-CN',
};
```

### Translation Files Structure

```
/public/locales/
├── en/
│   ├── documents.json
│   ├── funds.json
│   ├── settings.json
│   └── common.json
├── es/
│   ├── documents.json
│   ├── funds.json
│   ├── settings.json
│   └── common.json
├── fr/
│   ├── documents.json
│   ├── funds.json
│   ├── settings.json
│   └── common.json
├── de/
│   ├── documents.json
│   ├── funds.json
│   ├── settings.json
│   └── common.json
└── zh-CN/
    ├── documents.json
    ├── funds.json
    ├── settings.json
    └── common.json
```

### Sample Translation File

```json
// public/locales/en/funds.json
{
  "title": "Funds",
  "list": {
    "title": "Your Funds",
    "empty": "No funds found",
    "columns": {
      "name": "Fund Name",
      "value": "NAV",
      "currency": "Base Currency",
      "status": "Status"
    }
  },
  "detail": {
    "overview": "Fund Overview",
    "performance": "Performance",
    "holdings": "Holdings",
    "documents": "Documents",
    "history": "Transaction History"
  },
  "currency": {
    "convert": "Convert Currency",
    "from": "From",
    "to": "To",
    "rate": "Exchange Rate",
    "lastUpdated": "Last Updated"
  }
}
```

## Utility Functions

### Currency Formatting

```typescript
// lib/i18n/currency.ts

import { Decimal } from 'decimal.js';

interface CurrencyFormatOptions {
  locale: string;
  currency: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatCurrency(
  amount: number | string | Decimal,
  options: CurrencyFormatOptions
): string {
  const amountNum = typeof amount === 'string'
    ? parseFloat(amount)
    : amount instanceof Decimal
    ? amount.toNumber()
    : amount;

  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: options.currency,
    minimumFractionDigits: options.minimumFractionDigits || 2,
    maximumFractionDigits: options.maximumFractionDigits || 8,
  }).format(amountNum);
}

export function parseCurrencyInput(value: string): Decimal {
  // Remove common currency symbols and whitespace
  const cleaned = value
    .replace(/[\$€£¥₹₽¢]/g, '')
    .replace(/\s/g, '')
    .replace(/[^\d.,\-]/g, '');

  // Handle both comma and period as decimal separator
  const normalized = cleaned.replace(',', '.');

  return new Decimal(normalized);
}

export function calculateExchangeAmount(
  amount: Decimal,
  rate: Decimal,
  fromDecimals: number,
  toDecimals: number
): Decimal {
  const result = amount.times(rate);

  // Round to target currency decimal places
  return result.toDecimalPlaces(toDecimals, Decimal.ROUND_HALF_UP);
}
```

### Date/Time Formatting

```typescript
// lib/i18n/datetime.ts

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { enUS, es, fr, de, zhCN } from 'date-fns/locale';

const localeMap: Record<string, any> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  'zh-CN': zhCN,
};

export function formatDateByLocale(
  date: Date | string,
  locale: string,
  formatStr: string = 'PPP'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateLocale = localeMap[locale] || enUS;

  return format(dateObj, formatStr, { locale: dateLocale });
}

export function formatTimeByLocale(
  date: Date | string,
  locale: string,
  formatStr: string = 'p'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateLocale = localeMap[locale] || enUS;

  return format(dateObj, formatStr, { locale: dateLocale });
}

export function formatDateTimeByLocale(
  date: Date | string,
  locale: string,
  formatStr: string = 'PPp'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateLocale = localeMap[locale] || enUS;

  return format(dateObj, formatStr, { locale: dateLocale });
}

export function getRelativeTime(
  date: Date | string,
  locale: string
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateLocale = localeMap[locale] || enUS;

  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: dateLocale,
  });
}
```

## Compliance & Regulatory Framework

### Regional Compliance Matrix

| Requirement | UK (FCA) | EU (MiFID II) | APAC (ASIC) |
|---|---|---|---|
| **Language Requirements** | English | Local language option | English/Local |
| **Audit Trail** | All transactions | MiFID II compliant | ASIC compliant |
| **Data Residency** | UK/EU option | EU data only | Local servers preferred |
| **Tax Reporting** | UK tax IDs | CEST reporting | Local tax authority |
| **Withholding Tax** | Standard 20% | Varies by member state | 10-15% typical |
| **KYC Depth** | 3 levels | 3 levels | 2-3 levels |
| **AML Threshold** | £10,000 | €10,000 | AUD $10,000 |
| **Settlement Days** | T+2 | T+2 | T+2 to T+3 |
| **Business Days** | Mon-Fri | Mon-Fri | Mon-Fri (varies) |

### Multi-Currency Fund NAV Calculation

```typescript
// lib/multi-currency/nav.ts

import { Decimal } from 'decimal.js';

interface FundAsset {
  quantity: Decimal;
  priceInAssetCurrency: Decimal;
  assetCurrency: string;
}

interface NavCalculationInput {
  assets: FundAsset[];
  liabilities: Decimal; // in base currency
  navDenominationCurrency: string;
  exchangeRates: Record<string, Decimal>; // "USD/EUR": 0.92
  totalShares: Decimal;
}

export function calculateMultiCurrencyNAV({
  assets,
  liabilities,
  navDenominationCurrency,
  exchangeRates,
  totalShares,
}: NavCalculationInput): {
  totalAssetValue: Decimal;
  totalLiabilities: Decimal;
  netAssetValue: Decimal;
  navPerShare: Decimal;
} {
  let totalAssetValue = new Decimal(0);

  for (const asset of assets) {
    const assetValue = asset.quantity.times(asset.priceInAssetCurrency);

    // Convert to NAV denomination currency
    if (asset.assetCurrency !== navDenominationCurrency) {
      const rateKey = `${asset.assetCurrency}/${navDenominationCurrency}`;
      const rate = exchangeRates[rateKey];

      if (!rate) {
        throw new Error(`Missing exchange rate for ${rateKey}`);
      }

      totalAssetValue = totalAssetValue.plus(assetValue.times(rate));
    } else {
      totalAssetValue = totalAssetValue.plus(assetValue);
    }
  }

  const netAssetValue = totalAssetValue.minus(liabilities);
  const navPerShare = netAssetValue.dividedBy(totalShares);

  return {
    totalAssetValue: totalAssetValue.toDecimalPlaces(2),
    totalLiabilities: liabilities.toDecimalPlaces(2),
    netAssetValue: netAssetValue.toDecimalPlaces(2),
    navPerShare: navPerShare.toDecimalPlaces(8),
  };
}
```

## Implementation Timeline

### Phase 3 Global Operations Agent Timeline (Weeks 37-40)

#### Week 37: Foundation & Database Layer
- **GO-001**: Design and implement multi-currency database schema
  - Create currencies, exchange_rates, user_locale_preferences tables
  - Create compliance_regions and business_day_calendars
  - Add indices and constraints
  - Estimated effort: 3 days

- **GO-002**: Design and implement i18n database schema
  - Create languages, translation_strings tables
  - Add multi-language support to existing tables
  - Estimated effort: 2 days

- **GO-003**: Seed initial data (currencies, languages, regions)
  - Add 20+ currencies (USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, SGD, HKD, NZD, INR, MXN, BRL, ZAR, KRW, TWD, SEK, NOK, DKK)
  - Add 5 languages with locale data
  - Add UK, EU, APAC regional compliance configurations
  - Estimated effort: 2 days

**Week 37 Completion**: Core database schema implemented, 25 currencies seeded, 5 languages configured

#### Week 38: Currency Operations & API Layer
- **GO-004**: Implement exchange rate service
  - Integrate with fixer.io or OpenExchangeRates API
  - Create scheduled job to fetch rates every 1-4 hours
  - Implement rate caching and fallback mechanisms
  - Estimated effort: 3 days

- **GO-005**: Build currency conversion API endpoints
  - POST /api/exchange-rates/convert
  - GET /api/exchange-rates/historical
  - GET /api/currencies
  - Add validation and error handling
  - Estimated effort: 2 days

- **GO-006**: Create multi-currency transaction processing
  - Modify transaction schema to support multi-currency
  - Implement transaction conversion logic with Decimal.js
  - Add exchange rate locking (rate used at transaction time)
  - Estimated effort: 2 days

**Week 38 Completion**: Real-time currency conversion working, 20+ currencies supported, transaction processing handles multi-currency

#### Week 39: Internationalization Framework
- **GO-007**: Implement next-intl configuration
  - Set up i18n routing and middleware
  - Configure locale detection (header, cookie, user preference)
  - Implement locale switching mechanism
  - Estimated effort: 2 days

- **GO-008**: Create translation management system
  - Build translation upload/management API
  - Implement namespaced translation loading
  - Create fallback strategy (missing translation → English)
  - Estimated effort: 2 days

- **GO-009**: Implement localization utilities
  - Currency formatting by locale
  - Date/time formatting by locale
  - Number formatting by locale
  - Phone number validation
  - IBAN validation
  - Estimated effort: 2 days

- **GO-010**: Build locale preference system
  - Create user/organization locale preference storage
  - Implement preference API endpoints
  - Add preference persistence in Clerk metadata
  - Estimated effort: 1 day

**Week 39 Completion**: i18n framework fully functional, 5 languages with translations, locale switching working

#### Week 40: Frontend Implementation & Regional Compliance
- **GO-011**: Build frontend locale components
  - Language switcher dropdown
  - Currency converter widget
  - Locale preferences panel
  - Regional compliance display
  - Estimated effort: 3 days

- **GO-012**: Implement regional compliance features
  - Display compliance region information
  - Show applicable regulations in user language
  - Regional audit logging in local language
  - Regional holiday/business day display
  - Estimated effort: 2 days

- **GO-013**: Implement date/time by timezone
  - Convert all dates/times to user's timezone
  - Display timezone in UI
  - Handle DST automatically
  - Estimated effort: 1 day

- **GO-014**: Testing & Documentation
  - Unit tests for currency operations (100% coverage)
  - Integration tests for i18n framework
  - E2E tests for locale switching
  - Create i18n contribution guidelines
  - Update API documentation
  - Estimated effort: 2 days

**Week 40 Completion**: Full global operations functionality, all 5 languages in UI, compliance display by region

## Success Metrics

### Currency Operations
- **20+ Currencies Supported**: USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, SGD, HKD, NZD, INR, MXN, BRL, ZAR, KRW, TWD, SEK, NOK, DKK fully operational
- **Exchange Rate Accuracy**: Rates within 0.01% of market rates (updated every 1-4 hours)
- **Multi-Currency Fund Support**: 100% of funds can be denominated in any supported currency
- **Transaction Volume**: 10,000+ multi-currency transactions processed per day
- **Conversion Speed**: <200ms average conversion API response time

### Internationalization
- **Language Coverage**: 5 languages fully supported with 95%+ translation completion
- **UI Localization**: All user-facing text localized (target: 1000+ translation keys)
- **Number of Active Languages**: At least 5 languages with active users
- **Translation Quality**: <5% user-reported translation issues per month
- **i18n Performance**: No measurable impact on page load times

### User Adoption
- **International Customers**: 50+ customers from outside primary market (US) within 6 months
- **Multi-Currency Funds**: 10+ multi-currency funds created
- **Language Switching**: 30% of users accessing platform in non-English language
- **Locale Customization**: 20% of users customizing locale preferences

### Compliance
- **Compliance Audit Pass Rate**: 100% pass rate on regional compliance audits
- **Audit Trail Completeness**: 100% of transactions with complete audit trail
- **Regional Tax Reports**: 100% accuracy on regional tax reporting
- **Data Residency Compliance**: 100% of data stored in compliant locations

### Technical Performance
- **API Reliability**: 99.9% uptime for currency and localization APIs
- **Database Performance**: <50ms query time for currency lookups
- **Cache Hit Rate**: >80% for translation and exchange rate caching
- **Error Rate**: <0.1% errors for currency operations

## Dependencies & Integration Points

### External Integrations
- **Exchange Rate Provider**: fixer.io or OpenExchangeRates API
- **Database**: PostgreSQL with i18n support
- **Caching**: Redis (optional, for rate/translation caching)
- **Clerk**: User locale preference storage in user metadata

### Internal Agent Dependencies
- **Backend Agent**: API endpoint development and business logic
- **Database Agent**: Schema design and optimization
- **Frontend Agent**: UI component implementation
- **Integration Agent**: Exchange rate API integration
- **Testing Agent**: Comprehensive test coverage
- **Devops Agent**: Deployment of currency/locale infrastructure

### Future Phase 4 Integrations
- **AI/ML Agent**: Currency trend prediction
- **Integration Agent**: Local payment processing for each region
- **Compliance Agent**: Regional regulatory reporting automation

## Technical Challenges & Solutions

### Challenge 1: Real-Time Exchange Rates at Scale
**Problem**: Fetching and serving accurate exchange rates for 20+ currencies to thousands of users.

**Solution**:
- Multi-tier caching (Redis → Database → External API)
- Scheduled background jobs to refresh rates every 1-4 hours
- Rate locking at transaction time for historical accuracy
- Fallback rates if API is unavailable

### Challenge 2: Translation Management at Scale
**Problem**: Maintaining 1000+ translation keys across 5 languages without errors.

**Solution**:
- Translation management API for admin users
- Automated fallback to English for missing translations
- Translation key versioning system
- Community translation contribution workflow
- GitHub integration for translation reviews

### Challenge 3: Multi-Currency NAV Calculation
**Problem**: Accurately calculating fund NAV when assets are in multiple currencies.

**Solution**:
- Lock exchange rates at calculation time
- Use Decimal.js for precise arithmetic (no floating point errors)
- Implement multi-step calculation with checkpoints
- Audit trail showing rates used in calculation

### Challenge 4: Regional Compliance Data Consistency
**Problem**: Ensuring compliance data (holidays, regulations) stays current and accurate.

**Solution**:
- Automated holiday calendar updates from official sources
- Version control for compliance configurations
- Regional compliance officer review process
- Audit logs for all compliance changes

## Future Enhancements (Phase 4+)

1. **Cryptocurrency Support**: Add BTC, ETH, USDC support with real-time pricing
2. **Payment Localization**: Region-specific payment methods (iDEAL, Alipay, etc.)
3. **AI Translation**: Machine translation with human review workflow
4. **Predictive Analytics**: Currency trend prediction for fund managers
5. **Regional Custody**: Multiple custodians by region
6. **Advanced Compliance**: Automated regulatory reporting by region
7. **Multi-region Deployment**: Data centers in each major region
8. **Advanced i18n**: RTL language support, regional number systems

## Files & Artifacts

### Database Migrations
- `prisma/migrations/[timestamp]-multi-currency-schema.sql`
- `prisma/migrations/[timestamp]-i18n-schema.sql`
- `prisma/seed.ts` - Seed script for currencies, languages, regions

### Configuration Files
- `lib/i18n/config.ts` - i18n configuration
- `i18n.config.js` - next-intl configuration
- `middleware.ts` - i18n routing middleware

### Components
- `components/LanguageSwitcher.tsx`
- `components/CurrencyConverter.tsx`
- `components/LocalePreferencesPanel.tsx`
- `components/RegionalComplianceCard.tsx`
- `components/MultiCurrencyFundSelector.tsx`

### API Routes
- `app/api/currencies/route.ts`
- `app/api/languages/route.ts`
- `app/api/exchange-rates/convert/route.ts`
- `app/api/exchange-rates/historical/route.ts`
- `app/api/user-preferences/locale/route.ts`
- `app/api/compliance/regional-config/route.ts`
- `app/api/translations/route.ts`

### Utilities
- `lib/i18n/currency.ts` - Currency formatting and parsing
- `lib/i18n/datetime.ts` - Date/time formatting by locale
- `lib/multi-currency/nav.ts` - Multi-currency NAV calculation

### Translation Files
- `public/locales/[lang]/common.json`
- `public/locales/[lang]/funds.json`
- `public/locales/[lang]/documents.json`
- `public/locales/[lang]/settings.json`

### Tests
- `tests/currency.test.ts` - Currency operations
- `tests/i18n.test.ts` - Internationalization
- `tests/multi-currency-nav.test.ts` - NAV calculations
- `tests/exchange-rates.integration.test.ts` - Exchange rate API
- `e2e/locale-switching.spec.ts` - Locale switching flows

### Documentation
- `docs/currency-operations.md` - Currency feature guide
- `docs/i18n-guide.md` - i18n implementation guide
- `docs/compliance-guide.md` - Regional compliance guide
- `docs/translations-contribution.md` - Translation contribution guidelines

---

## Summary

The Global Operations Agent establishes Clearway as a truly global platform supporting:

- **20+ currencies** with real-time exchange rates
- **5 primary languages** with complete UI localization
- **Multiple regions** with compliance-aware operations
- **Multi-currency funds** with accurate NAV calculations
- **Regional compliance** including UK FCA, EU MiFID II, and APAC regulations

By end of Week 40, Phase 3, Clearway will be production-ready for international expansion with institutional investors across Europe, Asia-Pacific, and other regions.

// Currency formatting and conversion utilities
import { Decimal } from 'decimal.js';

interface CurrencyFormatOptions {
  locale: string;
  currency: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format a currency amount according to locale and currency
 * @param amount - The amount to format
 * @param options - Formatting options (locale, currency, decimal places)
 * @returns Formatted currency string
 */
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

/**
 * Parse currency input from user, handling various formats
 * @param value - The input string to parse
 * @returns Decimal representation of the amount
 */
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

/**
 * Calculate exchange amount with proper decimal handling
 * @param amount - Amount to convert
 * @param rate - Exchange rate
 * @param fromDecimals - Decimal places for source currency
 * @param toDecimals - Decimal places for target currency
 * @returns Converted amount
 */
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

/**
 * Format a number according to locale
 * @param value - The number to format
 * @param locale - Locale code (e.g., 'en-US', 'de-DE')
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | string | Decimal,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  const valueNum = typeof value === 'string'
    ? parseFloat(value)
    : value instanceof Decimal
    ? value.toNumber()
    : value;

  return new Intl.NumberFormat(locale, options).format(valueNum);
}

/**
 * Format a percentage according to locale
 * @param value - The percentage value (e.g., 0.15 for 15%)
 * @param locale - Locale code
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number | Decimal,
  locale: string,
  decimals: number = 2
): string {
  const valueNum = value instanceof Decimal ? value.toNumber() : value;

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(valueNum);
}

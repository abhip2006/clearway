// Date/time formatting utilities for global operations
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { enUS, es, fr, de, zhCN } from 'date-fns/locale';

const localeMap: Record<string, any> = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  'zh-CN': zhCN,
};

/**
 * Format a date according to locale
 * @param date - Date to format (Date object or ISO string)
 * @param locale - Locale code (en, es, fr, de, zh-CN)
 * @param formatStr - Format string (default: 'PPP' - localized date)
 * @returns Formatted date string
 */
export function formatDateByLocale(
  date: Date | string,
  locale: string,
  formatStr: string = 'PPP'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateLocale = localeMap[locale] || enUS;

  return format(dateObj, formatStr, { locale: dateLocale });
}

/**
 * Format a time according to locale
 * @param date - Date to format
 * @param locale - Locale code
 * @param formatStr - Format string (default: 'p' - localized time)
 * @returns Formatted time string
 */
export function formatTimeByLocale(
  date: Date | string,
  locale: string,
  formatStr: string = 'p'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateLocale = localeMap[locale] || enUS;

  return format(dateObj, formatStr, { locale: dateLocale });
}

/**
 * Format a date and time according to locale
 * @param date - Date to format
 * @param locale - Locale code
 * @param formatStr - Format string (default: 'PPp' - localized date and time)
 * @returns Formatted date/time string
 */
export function formatDateTimeByLocale(
  date: Date | string,
  locale: string,
  formatStr: string = 'PPp'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateLocale = localeMap[locale] || enUS;

  return format(dateObj, formatStr, { locale: dateLocale });
}

/**
 * Get relative time (e.g., "2 hours ago") in locale
 * @param date - Date to compare
 * @param locale - Locale code
 * @returns Relative time string
 */
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

/**
 * Convert date to timezone
 * @param date - Date to convert
 * @param timezone - IANA timezone (e.g., 'America/New_York')
 * @returns Date string in the specified timezone
 */
export function convertToTimezone(
  date: Date | string,
  timezone: string
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(dateObj);
}

/**
 * Format date range according to locale
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Locale code
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale: string
): string {
  const start = formatDateByLocale(startDate, locale);
  const end = formatDateByLocale(endDate, locale);
  return `${start} - ${end}`;
}

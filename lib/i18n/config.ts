// Global Operations i18n Configuration
// Supports 5 primary languages: English, Spanish, French, German, Mandarin

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

export const localeTimezones: Record<Locale, string> = {
  en: 'America/New_York',
  es: 'Europe/Madrid',
  fr: 'Europe/Paris',
  de: 'Europe/Berlin',
  'zh-CN': 'Asia/Shanghai',
};

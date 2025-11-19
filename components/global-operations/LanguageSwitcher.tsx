// Language Switcher Component
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageSwitcherProps {
  currentLocale?: string;
}

export function LanguageSwitcher({ currentLocale = 'en' }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [locale, setLocale] = useState(currentLocale);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch available languages
    fetch('/api/languages')
      .then(res => res.json())
      .then(data => {
        if (data.languages) {
          setLanguages(data.languages);
        }
      })
      .catch(err => console.error('Failed to fetch languages:', err));
  }, []);

  const handleLanguageChange = async (newLocale: string) => {
    setLoading(true);
    try {
      // Save preference to backend if user is authenticated
      // This will be handled by the locale preference API
      setLocale(newLocale);

      // Reload page with new locale (if using i18n routing)
      // or just reload to apply new language
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setLoading(false);
    }
  };

  if (languages.length === 0) {
    return null;
  }

  return (
    <Select value={locale} onValueChange={handleLanguageChange} disabled={loading}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{lang.nativeName}</span>
              {lang.code !== lang.name && (
                <span className="text-xs text-muted-foreground">({lang.name})</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

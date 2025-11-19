// Locale Preferences Panel
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'UTC',
];

const DATE_FORMATS = [
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (Europe)' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' },
  { value: 'dd.MM.yyyy', label: 'DD.MM.YYYY (German)' },
];

export function LocalePreferencesPanel() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [prefs, setPrefs] = useState({
    languageCode: 'en',
    currencyCode: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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

    // Fetch available currencies
    fetch('/api/currencies')
      .then(res => res.json())
      .then(data => {
        if (data.currencies) {
          setCurrencies(data.currencies);
        }
      })
      .catch(err => console.error('Failed to fetch currencies:', err));

    // Fetch current preferences
    fetch('/api/user-preferences/locale')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.preferences) {
          setPrefs({
            languageCode: data.preferences.language.code,
            currencyCode: data.preferences.currency.code,
            timezone: data.preferences.timezone || 'America/New_York',
            dateFormat: data.preferences.dateFormat || 'MM/dd/yyyy',
          });
        }
      })
      .catch(err => {
        // User may not have preferences set yet
        console.log('No preferences found, using defaults');
      });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const response = await fetch('/api/user-preferences/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Locale Preferences</CardTitle>
        <CardDescription>
          Customize your language, currency, and regional settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Language</label>
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
            <label className="text-sm font-medium">Currency</label>
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
            <label className="text-sm font-medium">Timezone</label>
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
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date Format</label>
            <Select
              value={prefs.dateFormat}
              onValueChange={(value) =>
                setPrefs({ ...prefs, dateFormat: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading ? (
            'Saving...'
          ) : saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

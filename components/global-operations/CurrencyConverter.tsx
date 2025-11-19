// Currency Converter Widget
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight } from 'lucide-react';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export function CurrencyConverter() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch supported currencies
    fetch('/api/currencies')
      .then(res => res.json())
      .then(data => {
        if (data.currencies) {
          setCurrencies(data.currencies);
        }
      })
      .catch(err => console.error('Failed to fetch currencies:', err));
  }, []);

  const handleConvert = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/exchange-rates/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          fromCurrency,
          toCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

      const data = await response.json();
      setConvertedAmount(data.convertedAmount);
      setRate(parseFloat(data.exchangeRate));
    } catch (error) {
      console.error('Conversion failed:', error);
      setError('Failed to convert currency. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setConvertedAmount('');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              min="0"
              step="0.01"
            />
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.id} value={curr.code}>
                    {curr.code} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={swap}
            className="mb-2"
            title="Swap currencies"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <div className="space-y-2">
            <label className="text-sm font-medium">To</label>
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              {convertedAmount || '0.00'}
            </div>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.id} value={curr.code}>
                    {curr.code} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleConvert}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Converting...' : 'Convert'}
        </Button>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {convertedAmount && !error && (
          <div className="bg-muted p-3 rounded-md space-y-1">
            <p className="text-sm">
              {amount} {fromCurrency} = {convertedAmount} {toCurrency}
            </p>
            {rate > 0 && (
              <p className="text-xs text-muted-foreground">
                Exchange rate: 1 {fromCurrency} = {rate.toFixed(8)} {toCurrency}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

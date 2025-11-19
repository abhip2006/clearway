// Multi-currency NAV (Net Asset Value) calculation utilities
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

interface NavCalculationResult {
  totalAssetValue: Decimal;
  totalLiabilities: Decimal;
  netAssetValue: Decimal;
  navPerShare: Decimal;
  assetBreakdown: {
    currency: string;
    value: Decimal;
    convertedValue: Decimal;
  }[];
}

/**
 * Calculate multi-currency NAV with precise decimal arithmetic
 * @param input - NAV calculation parameters
 * @returns NAV calculation results
 */
export function calculateMultiCurrencyNAV({
  assets,
  liabilities,
  navDenominationCurrency,
  exchangeRates,
  totalShares,
}: NavCalculationInput): NavCalculationResult {
  let totalAssetValue = new Decimal(0);
  const assetBreakdown: NavCalculationResult['assetBreakdown'] = [];

  for (const asset of assets) {
    const assetValue = asset.quantity.times(asset.priceInAssetCurrency);

    // Convert to NAV denomination currency
    let convertedValue: Decimal;
    if (asset.assetCurrency !== navDenominationCurrency) {
      const rateKey = `${asset.assetCurrency}/${navDenominationCurrency}`;
      const rate = exchangeRates[rateKey];

      if (!rate) {
        throw new Error(`Missing exchange rate for ${rateKey}`);
      }

      convertedValue = assetValue.times(rate);
    } else {
      convertedValue = assetValue;
    }

    totalAssetValue = totalAssetValue.plus(convertedValue);

    assetBreakdown.push({
      currency: asset.assetCurrency,
      value: assetValue,
      convertedValue,
    });
  }

  const netAssetValue = totalAssetValue.minus(liabilities);
  const navPerShare = netAssetValue.dividedBy(totalShares);

  return {
    totalAssetValue: totalAssetValue.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalLiabilities: liabilities.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    netAssetValue: netAssetValue.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    navPerShare: navPerShare.toDecimalPlaces(8, Decimal.ROUND_HALF_UP),
    assetBreakdown,
  };
}

/**
 * Calculate weighted average exchange rate
 * @param rates - Array of exchange rates with weights
 * @returns Weighted average rate
 */
export function calculateWeightedAverageRate(
  rates: { rate: Decimal; weight: Decimal }[]
): Decimal {
  let weightedSum = new Decimal(0);
  let totalWeight = new Decimal(0);

  for (const { rate, weight } of rates) {
    weightedSum = weightedSum.plus(rate.times(weight));
    totalWeight = totalWeight.plus(weight);
  }

  if (totalWeight.isZero()) {
    throw new Error('Total weight cannot be zero');
  }

  return weightedSum.dividedBy(totalWeight);
}

/**
 * Convert amount between currencies with rate locking
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rate - Locked exchange rate
 * @param toDecimals - Decimal places for target currency
 * @returns Converted amount and metadata
 */
export function convertWithLockedRate(
  amount: Decimal,
  fromCurrency: string,
  toCurrency: string,
  rate: Decimal,
  toDecimals: number = 2
): {
  originalAmount: Decimal;
  convertedAmount: Decimal;
  rate: Decimal;
  fromCurrency: string;
  toCurrency: string;
} {
  const convertedAmount = amount
    .times(rate)
    .toDecimalPlaces(toDecimals, Decimal.ROUND_HALF_UP);

  return {
    originalAmount: amount,
    convertedAmount,
    rate,
    fromCurrency,
    toCurrency,
  };
}

/**
 * Calculate currency exposure by percentage
 * @param holdings - Array of holdings with currency and value
 * @param totalValue - Total portfolio value
 * @returns Currency exposure breakdown
 */
export function calculateCurrencyExposure(
  holdings: { currency: string; value: Decimal }[],
  totalValue: Decimal
): { currency: string; value: Decimal; percentage: Decimal }[] {
  return holdings.map((holding) => ({
    currency: holding.currency,
    value: holding.value,
    percentage: holding.value
      .dividedBy(totalValue)
      .times(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
  }));
}

<?php

namespace App\Services;

use App\Models\ExchangeRateModel;

class CurrencyService
{
    protected ExchangeRateModel $exchangeRateModel;

    /**
     * Available currencies
     */
    public const CURRENCIES = ['TRY', 'USD', 'EUR'];

    /**
     * Currency symbols
     */
    public const SYMBOLS = [
        'TRY' => '₺',
        'USD' => '$',
        'EUR' => '€',
    ];

    /**
     * Currency names in Turkish
     */
    public const NAMES = [
        'TRY' => 'Türk Lirası',
        'USD' => 'Amerikan Doları',
        'EUR' => 'Euro',
    ];

    public function __construct()
    {
        $this->exchangeRateModel = new ExchangeRateModel();
    }

    /**
     * Convert amount to TRY
     */
    public function convertToTRY(float $amount, string $currency, string $date): array
    {
        return $this->exchangeRateModel->convertToTRY($amount, $currency, $date);
    }

    /**
     * Get rate for date and currency
     */
    public function getRate(string $date, string $currency): ?float
    {
        return $this->exchangeRateModel->getRateForDate($date, $currency);
    }

    /**
     * Get latest rate for currency
     */
    public function getLatestRate(string $currency): ?float
    {
        return $this->exchangeRateModel->getLatestRate($currency);
    }

    /**
     * Get all latest rates
     */
    public function getLatestRates(): array
    {
        return $this->exchangeRateModel->getLatestRates();
    }

    /**
     * Format currency amount
     */
    public function format(float $amount, string $currency = 'TRY'): string
    {
        $symbol = self::SYMBOLS[$currency] ?? $currency;
        $formatted = number_format($amount, 2, ',', '.');

        return "{$formatted} {$symbol}";
    }

    /**
     * Format currency amount without symbol
     */
    public function formatNumber(float $amount): string
    {
        return number_format($amount, 2, ',', '.');
    }

    /**
     * Get currency symbol
     */
    public function getSymbol(string $currency): string
    {
        return self::SYMBOLS[$currency] ?? $currency;
    }

    /**
     * Get currency name
     */
    public function getName(string $currency): string
    {
        return self::NAMES[$currency] ?? $currency;
    }

    /**
     * Get all currencies for dropdown
     */
    public function getForDropdown(): array
    {
        $result = [];
        foreach (self::CURRENCIES as $currency) {
            $result[$currency] = "{$currency} - " . self::NAMES[$currency];
        }
        return $result;
    }

    /**
     * Calculate total in TRY from mixed currency amounts
     */
    public function calculateTotalTRY(array $amounts, string $date): array
    {
        $total = 0;
        $details = [];
        $hasWarning = false;

        foreach ($amounts as $item) {
            $currency = $item['currency'];
            $amount = (float) $item['amount'];

            $conversion = $this->convertToTRY($amount, $currency, $date);

            $total += $conversion['amount_try'];
            $details[$currency] = ($details[$currency] ?? 0) + $amount;

            if (!empty($conversion['warning'])) {
                $hasWarning = true;
            }
        }

        return [
            'total_try' => $total,
            'by_currency' => $details,
            'has_warning' => $hasWarning,
        ];
    }

    /**
     * Parse decimal amount from Turkish format
     */
    public function parseAmount(string $amount): float
    {
        // Remove thousand separators and convert decimal separator
        $amount = str_replace('.', '', $amount);
        $amount = str_replace(',', '.', $amount);

        return (float) $amount;
    }

    /**
     * Validate currency code
     */
    public function isValidCurrency(string $currency): bool
    {
        return in_array($currency, self::CURRENCIES);
    }
}

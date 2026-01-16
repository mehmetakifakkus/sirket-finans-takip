<?php

use App\Services\CurrencyService;

if (!function_exists('format_currency')) {
    /**
     * Format amount with currency symbol
     */
    function format_currency(float $amount, string $currency = 'TRY'): string
    {
        $symbols = [
            'TRY' => '₺',
            'USD' => '$',
            'EUR' => '€',
        ];

        $symbol = $symbols[$currency] ?? $currency;
        $formatted = number_format($amount, 2, ',', '.');

        return "{$formatted} {$symbol}";
    }
}

if (!function_exists('format_number')) {
    /**
     * Format number without currency symbol
     */
    function format_number(float $amount, int $decimals = 2): string
    {
        return number_format($amount, $decimals, ',', '.');
    }
}

if (!function_exists('get_currency_symbol')) {
    /**
     * Get currency symbol
     */
    function get_currency_symbol(string $currency): string
    {
        $symbols = [
            'TRY' => '₺',
            'USD' => '$',
            'EUR' => '€',
        ];

        return $symbols[$currency] ?? $currency;
    }
}

if (!function_exists('get_currency_name')) {
    /**
     * Get currency name in Turkish
     */
    function get_currency_name(string $currency): string
    {
        $names = [
            'TRY' => 'Türk Lirası',
            'USD' => 'Amerikan Doları',
            'EUR' => 'Euro',
        ];

        return $names[$currency] ?? $currency;
    }
}

if (!function_exists('convert_to_try')) {
    /**
     * Convert amount to TRY using exchange rate
     */
    function convert_to_try(float $amount, string $currency, string $date): array
    {
        $currencyService = new CurrencyService();
        return $currencyService->convertToTRY($amount, $currency, $date);
    }
}

if (!function_exists('parse_decimal')) {
    /**
     * Parse Turkish decimal format to float
     */
    function parse_decimal(string $value): float
    {
        // Remove thousand separators and convert decimal separator
        $value = str_replace('.', '', $value);
        $value = str_replace(',', '.', $value);

        return (float) $value;
    }
}

if (!function_exists('currency_options')) {
    /**
     * Get currency options for dropdown
     */
    function currency_options(): array
    {
        return [
            'TRY' => 'TRY - Türk Lirası',
            'USD' => 'USD - Amerikan Doları',
            'EUR' => 'EUR - Euro',
        ];
    }
}

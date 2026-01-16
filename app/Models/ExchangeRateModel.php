<?php

namespace App\Models;

use CodeIgniter\Model;

class ExchangeRateModel extends Model
{
    protected $table            = 'exchange_rates';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'rate_date',
        'base_currency',
        'quote_currency',
        'rate',
        'source',
    ];

    // Dates
    protected $useTimestamps = false;
    protected $createdField  = 'created_at';

    // Validation
    protected $validationRules = [
        'rate_date'       => 'required|valid_date',
        'base_currency'   => 'required|max_length[3]',
        'quote_currency'  => 'required|max_length[3]',
        'rate'            => 'required|decimal',
        'source'          => 'required|in_list[manual,tcmb]',
    ];

    protected $validationMessages = [
        'rate_date' => [
            'required'   => 'Tarih zorunludur.',
            'valid_date' => 'Geçerli bir tarih giriniz.',
        ],
        'quote_currency' => [
            'required' => 'Para birimi zorunludur.',
        ],
        'rate' => [
            'required' => 'Kur değeri zorunludur.',
            'decimal'  => 'Geçerli bir kur değeri giriniz.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get rate for a specific date and currency
     */
    public function getRateForDate(string $date, string $currency): ?float
    {
        if ($currency === 'TRY') {
            return 1.0;
        }

        $rate = $this->where('rate_date', $date)
                     ->where('quote_currency', $currency)
                     ->first();

        if ($rate) {
            return (float) $rate['rate'];
        }

        // Fallback: Find the most recent rate before this date
        $rate = $this->where('rate_date <', $date)
                     ->where('quote_currency', $currency)
                     ->orderBy('rate_date', 'DESC')
                     ->first();

        if ($rate) {
            return (float) $rate['rate'];
        }

        // Last fallback: Get the latest rate available
        return $this->getLatestRate($currency);
    }

    /**
     * Get the latest rate for a currency
     */
    public function getLatestRate(string $currency): ?float
    {
        if ($currency === 'TRY') {
            return 1.0;
        }

        $rate = $this->where('quote_currency', $currency)
                     ->orderBy('rate_date', 'DESC')
                     ->first();

        return $rate ? (float) $rate['rate'] : null;
    }

    /**
     * Get all rates for a date
     */
    public function getRatesForDate(string $date): array
    {
        return $this->where('rate_date', $date)
                    ->orderBy('quote_currency', 'ASC')
                    ->findAll();
    }

    /**
     * Get rate history for a currency
     */
    public function getRateHistory(string $currency, int $days = 30): array
    {
        $startDate = date('Y-m-d', strtotime("-{$days} days"));

        return $this->where('quote_currency', $currency)
                    ->where('rate_date >=', $startDate)
                    ->orderBy('rate_date', 'ASC')
                    ->findAll();
    }

    /**
     * Check if rate exists for date and currency
     */
    public function rateExists(string $date, string $currency): bool
    {
        return $this->where('rate_date', $date)
                    ->where('quote_currency', $currency)
                    ->countAllResults() > 0;
    }

    /**
     * Upsert rate (insert or update)
     */
    public function upsertRate(string $date, string $currency, float $rate, string $source = 'manual'): bool
    {
        $existing = $this->where('rate_date', $date)
                         ->where('quote_currency', $currency)
                         ->first();

        $data = [
            'rate_date'      => $date,
            'base_currency'  => 'TRY',
            'quote_currency' => $currency,
            'rate'           => $rate,
            'source'         => $source,
            'created_at'     => date('Y-m-d H:i:s'),
        ];

        if ($existing) {
            return $this->update($existing['id'], $data);
        }

        return $this->insert($data) !== false;
    }

    /**
     * Convert amount to TRY
     */
    public function convertToTRY(float $amount, string $currency, string $date): array
    {
        if ($currency === 'TRY') {
            return [
                'amount_try' => $amount,
                'rate'       => 1.0,
                'rate_date'  => $date,
                'fallback'   => false,
            ];
        }

        $rate = $this->getRateForDate($date, $currency);

        if ($rate === null) {
            // No rate found at all, return with warning
            return [
                'amount_try' => $amount,
                'rate'       => 1.0,
                'rate_date'  => null,
                'fallback'   => true,
                'warning'    => 'Kur bilgisi bulunamadı!',
            ];
        }

        return [
            'amount_try' => round($amount * $rate, 2),
            'rate'       => $rate,
            'rate_date'  => $date,
            'fallback'   => false,
        ];
    }

    /**
     * Get all recent rates (latest for each currency)
     */
    public function getLatestRates(): array
    {
        $currencies = ['USD', 'EUR'];
        $rates = [];

        foreach ($currencies as $currency) {
            $rate = $this->where('quote_currency', $currency)
                         ->orderBy('rate_date', 'DESC')
                         ->first();

            if ($rate) {
                $rates[$currency] = $rate;
            }
        }

        return $rates;
    }

    /**
     * Get available currencies
     */
    public function getAvailableCurrencies(): array
    {
        $results = $this->select('DISTINCT quote_currency')
                        ->findAll();

        $currencies = ['TRY'];
        foreach ($results as $result) {
            $currencies[] = $result['quote_currency'];
        }

        return array_unique($currencies);
    }
}

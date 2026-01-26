<?php

namespace App\Models;

use App\Libraries\Database;

class ExchangeRateModel extends BaseModel
{
    protected string $table = 'exchange_rates';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'rate_date', 'base_currency', 'quote_currency', 'rate', 'source'
    ];
    protected bool $useTimestamps = false; // Only created_at, no updated_at

    /**
     * Get filtered rates
     */
    public function getFiltered(array $filters = []): array
    {
        $sql = "SELECT * FROM exchange_rates WHERE 1=1";
        $params = [];

        if (!empty($filters['currency']) || !empty($filters['quote_currency'])) {
            $sql .= " AND quote_currency = ?";
            $params[] = $filters['currency'] ?? $filters['quote_currency'];
        }
        if (!empty($filters['start_date'])) {
            $sql .= " AND rate_date >= ?";
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $sql .= " AND rate_date <= ?";
            $params[] = $filters['end_date'];
        }

        $sql .= " ORDER BY rate_date DESC, quote_currency ASC";

        if (!empty($filters['limit'])) {
            $sql .= " LIMIT " . (int)$filters['limit'];
        }

        return Database::query($sql, $params);
    }

    /**
     * Get latest rates for all currencies
     */
    public function getLatest(): array
    {
        $currencies = ['USD', 'EUR', 'GBP', 'GOLD'];
        $rates = [];

        foreach ($currencies as $currency) {
            $rate = Database::queryOne(
                "SELECT * FROM exchange_rates WHERE quote_currency = ? ORDER BY rate_date DESC LIMIT 1",
                [$currency]
            );
            if ($rate) {
                $rates[$currency] = $rate;
            }
        }

        return $rates;
    }

    /**
     * Get rate by currency and date
     */
    public function getByDate(string $currency, string $date): ?array
    {
        // First try exact date
        $rate = Database::queryOne(
            "SELECT * FROM exchange_rates WHERE quote_currency = ? AND rate_date = ?",
            [$currency, $date]
        );

        if ($rate) {
            return $rate;
        }

        // Fall back to most recent before date
        return Database::queryOne(
            "SELECT * FROM exchange_rates WHERE quote_currency = ? AND rate_date <= ? ORDER BY rate_date DESC LIMIT 1",
            [$currency, $date]
        );
    }

    /**
     * Check if rate exists
     */
    public function rateExists(string $currency, string $date): bool
    {
        $result = Database::queryOne(
            "SELECT COUNT(*) as cnt FROM exchange_rates WHERE quote_currency = ? AND rate_date = ?",
            [$currency, $date]
        );
        return ((int)($result['cnt'] ?? 0)) > 0;
    }

    /**
     * Upsert rate (insert or update)
     */
    public function upsertRate(string $currency, float $rate, string $date, string $source = 'manual'): bool
    {
        $existing = Database::queryOne(
            "SELECT id FROM exchange_rates WHERE quote_currency = ? AND rate_date = ?",
            [$currency, $date]
        );

        if ($existing) {
            return Database::execute(
                "UPDATE exchange_rates SET rate = ?, source = ? WHERE id = ?",
                [$rate, $source, $existing['id']]
            );
        }

        return Database::execute(
            "INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at) VALUES (?, 'TRY', ?, ?, ?, NOW())",
            [$date, $currency, $rate, $source]
        );
    }

    /**
     * Convert amount to TRY
     */
    public function convertToTry(float $amount, string $currency, string $date): float
    {
        if ($currency === 'TRY') {
            return $amount;
        }

        $rate = $this->getByDate($currency, $date);
        if (!$rate) {
            // Fall back to latest rate
            $rate = Database::queryOne(
                "SELECT * FROM exchange_rates WHERE quote_currency = ? ORDER BY rate_date DESC LIMIT 1",
                [$currency]
            );
        }

        if (!$rate) {
            return $amount; // Can't convert, return original
        }

        return $amount * (float)$rate['rate'];
    }
}

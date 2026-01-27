<?php

namespace App\Controllers;

use App\Libraries\Database;

class ChartController extends BaseController
{
    /**
     * Get latest exchange rates for TRY conversion
     */
    private function getLatestRates(): array
    {
        $rates = ['TRY' => 1.0, 'USD' => 1.0, 'EUR' => 1.0];

        // Get latest USD rate
        $usdRate = Database::queryOne(
            "SELECT rate FROM exchange_rates WHERE quote_currency = 'USD' ORDER BY rate_date DESC LIMIT 1"
        );
        if ($usdRate) {
            $rates['USD'] = (float)$usdRate['rate'];
        }

        // Get latest EUR rate
        $eurRate = Database::queryOne(
            "SELECT rate FROM exchange_rates WHERE quote_currency = 'EUR' ORDER BY rate_date DESC LIMIT 1"
        );
        if ($eurRate) {
            $rates['EUR'] = (float)$eurRate['rate'];
        }

        return $rates;
    }

    /**
     * Convert amount to TRY
     */
    private function convertToTRY(float $amount, string $currency, array $rates): float
    {
        if ($currency === 'TRY') {
            return $amount;
        }

        $rate = $rates[$currency] ?? 1.0;
        return $amount * $rate;
    }

    /**
     * Get last day of month
     */
    private function getLastDayOfMonth(string $date): string
    {
        $d = new \DateTime($date);
        $d->modify('last day of this month');
        return $d->format('Y-m-d');
    }

    /**
     * Monthly income/expense chart data
     * GET /api/charts/monthly
     */
    public function monthly()
    {
        $months = (int)$this->getQueryParam('months', 12);
        if ($months < 1 || $months > 24) {
            $months = 12;
        }

        $rates = $this->getLatestRates();
        $result = [];

        $monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

        $today = new \DateTime();

        for ($i = $months - 1; $i >= 0; $i--) {
            $date = new \DateTime();
            $date->modify("-$i months");
            $date->modify('first day of this month');
            $firstDay = $date->format('Y-m-d');
            $lastDay = $this->getLastDayOfMonth($firstDay);

            // Get transactions for this month
            $transactions = Database::query(
                "SELECT type, net_amount, currency FROM transactions
                 WHERE date >= ? AND date <= ?",
                [$firstDay, $lastDay]
            );

            $income = 0;
            $expense = 0;

            foreach ($transactions as $t) {
                $amount = $this->convertToTRY((float)$t['net_amount'], $t['currency'], $rates);
                if ($t['type'] === 'income') {
                    $income += $amount;
                } else {
                    $expense += $amount;
                }
            }

            $monthIndex = (int)$date->format('n') - 1;
            $year = $date->format('y');

            $result[] = [
                'month' => $date->format('Y-m'),
                'month_label' => $monthNames[$monthIndex] . ' ' . $year,
                'income' => round($income, 2),
                'expense' => round($expense, 2)
            ];
        }

        return $this->success('Aylık grafik verileri', ['data' => $result]);
    }

    /**
     * Category distribution chart data
     * GET /api/charts/category
     */
    public function category()
    {
        $type = $this->getQueryParam('type', 'expense');
        $months = (int)$this->getQueryParam('months', 6);

        if (!in_array($type, ['income', 'expense'])) {
            $type = 'expense';
        }
        if ($months < 1 || $months > 12) {
            $months = 6;
        }

        $rates = $this->getLatestRates();

        // Calculate date range
        $endDate = date('Y-m-d');
        $startDate = date('Y-m-d', strtotime("-$months months"));

        // Get transactions grouped by category
        $transactions = Database::query(
            "SELECT t.category_id, c.name as category_name, t.net_amount, t.currency
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE t.type = ? AND t.date >= ? AND t.date <= ?",
            [$type, $startDate, $endDate]
        );

        $categoryTotals = [];

        foreach ($transactions as $t) {
            $categoryId = $t['category_id'] ?? 0;
            $categoryName = $t['category_name'] ?? 'Kategorisiz';
            $key = (string)$categoryId;

            if (!isset($categoryTotals[$key])) {
                $categoryTotals[$key] = [
                    'category_id' => (int)$categoryId,
                    'category_name' => $categoryName,
                    'total' => 0
                ];
            }

            $amount = $this->convertToTRY((float)$t['net_amount'], $t['currency'], $rates);
            $categoryTotals[$key]['total'] += $amount;
        }

        // Sort by total descending
        usort($categoryTotals, fn($a, $b) => $b['total'] <=> $a['total']);

        // Calculate grand total for percentage
        $grandTotal = array_sum(array_column($categoryTotals, 'total'));

        // Top 5 categories + others
        $result = [];
        $othersTotal = 0;

        foreach ($categoryTotals as $index => $item) {
            if ($index < 5) {
                $result[] = [
                    'category_id' => $item['category_id'],
                    'category_name' => $item['category_name'],
                    'total' => round($item['total'], 2),
                    'percentage' => $grandTotal > 0 ? ($item['total'] / $grandTotal) * 100 : 0
                ];
            } else {
                $othersTotal += $item['total'];
            }
        }

        if ($othersTotal > 0) {
            $result[] = [
                'category_id' => -1,
                'category_name' => 'Diğerleri',
                'total' => round($othersTotal, 2),
                'percentage' => $grandTotal > 0 ? ($othersTotal / $grandTotal) * 100 : 0
            ];
        }

        return $this->success('Kategori grafik verileri', ['data' => $result]);
    }

    /**
     * Debt/Receivable summary chart data
     * GET /api/charts/debt-summary
     */
    public function debtSummary()
    {
        $rates = $this->getLatestRates();
        $today = date('Y-m-d');

        // Get all open debts with paid amounts
        $debts = Database::query(
            "SELECT d.id, d.kind, d.principal_amount, d.currency, d.due_date,
                    COALESCE((
                        SELECT SUM(p.amount)
                        FROM payments p
                        JOIN installments i ON p.related_id = i.id AND p.related_type = 'installment'
                        WHERE i.debt_id = d.id
                    ), 0) as total_paid
             FROM debts d
             WHERE d.status = 'open'"
        );

        $summary = [
            'debt_total' => 0,
            'debt_paid' => 0,
            'debt_remaining' => 0,
            'debt_overdue' => 0,
            'receivable_total' => 0,
            'receivable_paid' => 0,
            'receivable_remaining' => 0,
            'receivable_overdue' => 0
        ];

        foreach ($debts as $debt) {
            $principalTRY = $this->convertToTRY((float)$debt['principal_amount'], $debt['currency'], $rates);
            $paidTRY = $this->convertToTRY((float)$debt['total_paid'], $debt['currency'], $rates);
            $remaining = $principalTRY - $paidTRY;
            $isOverdue = $debt['due_date'] && $debt['due_date'] < $today;

            if ($debt['kind'] === 'debt') {
                $summary['debt_total'] += $principalTRY;
                $summary['debt_paid'] += $paidTRY;
                $summary['debt_remaining'] += $remaining;
                if ($isOverdue) {
                    $summary['debt_overdue'] += $remaining;
                }
            } else {
                $summary['receivable_total'] += $principalTRY;
                $summary['receivable_paid'] += $paidTRY;
                $summary['receivable_remaining'] += $remaining;
                if ($isOverdue) {
                    $summary['receivable_overdue'] += $remaining;
                }
            }
        }

        // Round all values
        foreach ($summary as $key => $value) {
            $summary[$key] = round($value, 2);
        }

        return $this->success('Borç/alacak özet verileri', $summary);
    }
}

<?php

namespace App\Controllers;

use App\Libraries\Database;

class NotificationController extends BaseController
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
     * Get upcoming payments (installments due within specified days)
     * GET /api/notifications/upcoming
     */
    public function upcoming()
    {
        $days = (int)$this->getQueryParam('days', 7);
        if ($days < 1 || $days > 90) {
            $days = 7;
        }

        $today = date('Y-m-d');
        $futureDate = date('Y-m-d', strtotime("+$days days"));

        $payments = Database::query(
            "SELECT i.*, d.kind as debt_type, d.currency, d.description as debt_description,
                    p.name as party_name
             FROM installments i
             JOIN debts d ON d.id = i.debt_id
             LEFT JOIN parties p ON p.id = d.party_id
             WHERE i.status = 'pending'
             AND i.due_date >= ?
             AND i.due_date <= ?
             ORDER BY i.due_date ASC",
            [$today, $futureDate]
        );

        return $this->success('Yaklaşan ödemeler', ['payments' => $payments]);
    }

    /**
     * Get overdue payments (past due date, still pending)
     * GET /api/notifications/overdue
     */
    public function overdue()
    {
        $today = date('Y-m-d');

        $payments = Database::query(
            "SELECT i.*, d.kind as debt_type, d.currency, d.description as debt_description,
                    p.name as party_name
             FROM installments i
             JOIN debts d ON d.id = i.debt_id
             LEFT JOIN parties p ON p.id = d.party_id
             WHERE i.status = 'pending'
             AND i.due_date < ?
             ORDER BY i.due_date ASC",
            [$today]
        );

        return $this->success('Vadesi geçmiş ödemeler', ['payments' => $payments]);
    }

    /**
     * Get payment summary (counts and totals)
     * GET /api/notifications/summary
     */
    public function summary()
    {
        $today = date('Y-m-d');
        $futureDate = date('Y-m-d', strtotime('+7 days'));
        $rates = $this->getLatestRates();

        // Overdue count and amount
        $overdueData = Database::query(
            "SELECT i.amount, d.currency
             FROM installments i
             JOIN debts d ON d.id = i.debt_id
             WHERE i.status = 'pending' AND i.due_date < ?",
            [$today]
        );

        $overdueCount = count($overdueData);
        $overdueAmount = 0;
        foreach ($overdueData as $row) {
            $overdueAmount += $this->convertToTRY((float)$row['amount'], $row['currency'], $rates);
        }

        // Upcoming count and amount (next 7 days)
        $upcomingData = Database::query(
            "SELECT i.amount, d.currency
             FROM installments i
             JOIN debts d ON d.id = i.debt_id
             WHERE i.status = 'pending'
             AND i.due_date >= ?
             AND i.due_date <= ?",
            [$today, $futureDate]
        );

        $upcomingCount = count($upcomingData);
        $upcomingAmount = 0;
        foreach ($upcomingData as $row) {
            $upcomingAmount += $this->convertToTRY((float)$row['amount'], $row['currency'], $rates);
        }

        return $this->success('Ödeme özeti', [
            'overdueCount' => $overdueCount,
            'overdueAmount' => round($overdueAmount, 2),
            'upcomingCount' => $upcomingCount,
            'upcomingAmount' => round($upcomingAmount, 2)
        ]);
    }
}

<?php

namespace App\Controllers;

use App\Libraries\Database;
use App\Models\TransactionModel;
use App\Models\DebtModel;
use App\Models\ProjectModel;
use App\Models\InstallmentModel;
use App\Models\ExchangeRateModel;

class ReportController extends BaseController
{
    protected TransactionModel $transactionModel;
    protected DebtModel $debtModel;
    protected ProjectModel $projectModel;
    protected InstallmentModel $installmentModel;
    protected ExchangeRateModel $exchangeRateModel;

    public function __construct()
    {
        parent::__construct();
        $this->transactionModel = new TransactionModel();
        $this->debtModel = new DebtModel();
        $this->projectModel = new ProjectModel();
        $this->installmentModel = new InstallmentModel();
        $this->exchangeRateModel = new ExchangeRateModel();
    }

    /**
     * Dashboard summary
     * GET /api/reports/dashboard
     */
    public function dashboard()
    {
        $currentMonth = date('Y-m');
        $today = date('Y-m-d');

        // Get latest exchange rates for conversion
        $rates = $this->getLatestRates();

        // Monthly income by currency
        $monthlyIncomeData = Database::query(
            "SELECT currency, COALESCE(SUM(net_amount), 0) as total FROM transactions
             WHERE type = 'income' AND DATE_FORMAT(date, '%Y-%m') = ?
             GROUP BY currency",
            [$currentMonth]
        );
        $monthlyIncomeByCurrency = [];
        $monthlyIncome = 0;
        foreach ($monthlyIncomeData as $row) {
            $currency = $row['currency'];
            $amount = (float)$row['total'];
            $monthlyIncomeByCurrency[$currency] = $amount;
            $monthlyIncome += $this->convertToTRY($amount, $currency, $rates);
        }

        // Monthly expense by currency
        $monthlyExpenseData = Database::query(
            "SELECT currency, COALESCE(SUM(net_amount), 0) as total FROM transactions
             WHERE type = 'expense' AND DATE_FORMAT(date, '%Y-%m') = ?
             GROUP BY currency",
            [$currentMonth]
        );
        $monthlyExpenseByCurrency = [];
        $monthlyExpense = 0;
        foreach ($monthlyExpenseData as $row) {
            $currency = $row['currency'];
            $amount = (float)$row['total'];
            $monthlyExpenseByCurrency[$currency] = $amount;
            $monthlyExpense += $this->convertToTRY($amount, $currency, $rates);
        }

        // Total debt by currency (open debts)
        $debtData = Database::query(
            "SELECT currency, COALESCE(SUM(principal_amount), 0) as total FROM debts
             WHERE kind = 'debt' AND status = 'open'
             GROUP BY currency"
        );
        $debtByCurrency = [];
        $totalDebt = 0;
        foreach ($debtData as $row) {
            $currency = $row['currency'];
            $amount = (float)$row['total'];
            $debtByCurrency[$currency] = $amount;
            $totalDebt += $this->convertToTRY($amount, $currency, $rates);
        }

        // Total receivable by currency (open receivables)
        $receivableData = Database::query(
            "SELECT currency, COALESCE(SUM(principal_amount), 0) as total FROM debts
             WHERE kind = 'receivable' AND status = 'open'
             GROUP BY currency"
        );
        $receivableByCurrency = [];
        $totalReceivable = 0;
        foreach ($receivableData as $row) {
            $currency = $row['currency'];
            $amount = (float)$row['total'];
            $receivableByCurrency[$currency] = $amount;
            $totalReceivable += $this->convertToTRY($amount, $currency, $rates);
        }

        // Upcoming installments (next 30 days, pending)
        $upcomingInstallments = $this->installmentModel->getUpcoming(30);

        // Overdue installments (past due date, still pending)
        $overdueInstallments = Database::query(
            "SELECT i.*, d.kind as debt_type, d.currency as debt_currency, p.name as party_name
             FROM installments i
             LEFT JOIN debts d ON d.id = i.debt_id
             LEFT JOIN parties p ON p.id = d.party_id
             WHERE i.status = 'pending' AND i.due_date < ?
             ORDER BY i.due_date ASC",
            [$today]
        );
        $overdueCount = count($overdueInstallments);

        // Active projects
        $activeProjects = Database::query(
            "SELECT p.*, pa.name as party_name FROM projects p
             LEFT JOIN parties pa ON pa.id = p.party_id
             WHERE p.status = 'active'
             ORDER BY p.start_date DESC"
        );
        $activeProjectsCount = count($activeProjects);

        // Recent transactions
        $recentTransactions = Database::query(
            "SELECT t.*, p.name as party_name, c.name as category_name
             FROM transactions t
             LEFT JOIN parties p ON p.id = t.party_id
             LEFT JOIN categories c ON c.id = t.category_id
             ORDER BY t.date DESC, t.id DESC
             LIMIT 10"
        );

        return $this->success('Dashboard verileri', [
            'monthly_income' => $monthlyIncome,
            'monthly_income_by_currency' => $monthlyIncomeByCurrency,
            'monthly_expense' => $monthlyExpense,
            'monthly_expense_by_currency' => $monthlyExpenseByCurrency,
            'monthly_balance' => $monthlyIncome - $monthlyExpense,
            'total_debt' => $totalDebt,
            'total_debt_by_currency' => $debtByCurrency,
            'total_receivable' => $totalReceivable,
            'total_receivable_by_currency' => $receivableByCurrency,
            'net_position' => $totalReceivable - $totalDebt,
            'upcoming_installments' => $upcomingInstallments,
            'overdue_installments' => $overdueInstallments,
            'overdue_count' => $overdueCount,
            'active_projects' => $activeProjects,
            'active_projects_count' => $activeProjectsCount,
            'recent_transactions' => $recentTransactions,
            'exchange_rates' => $rates
        ]);
    }

    /**
     * Get latest exchange rates
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
     * Summary report
     * GET /api/reports/summary
     */
    public function summary()
    {
        $startDate = $this->getQueryParam('start_date', date('Y-01-01'));
        $endDate = $this->getQueryParam('end_date', date('Y-m-d'));

        // Income/Expense by month
        $monthly = Database::query(
            "SELECT DATE_FORMAT(date, '%Y-%m') as month, type, currency, SUM(net_amount) as total
             FROM transactions
             WHERE date >= ? AND date <= ?
             GROUP BY DATE_FORMAT(date, '%Y-%m'), type, currency
             ORDER BY month ASC",
            [$startDate, $endDate]
        );

        // By category
        $byCategory = Database::query(
            "SELECT c.name as category, t.type, t.currency, SUM(t.net_amount) as total
             FROM transactions t
             LEFT JOIN categories c ON c.id = t.category_id
             WHERE t.date >= ? AND t.date <= ?
             GROUP BY t.category_id, t.type, t.currency
             ORDER BY total DESC",
            [$startDate, $endDate]
        );

        // By party
        $byParty = Database::query(
            "SELECT p.name as party, t.type, t.currency, SUM(t.net_amount) as total
             FROM transactions t
             LEFT JOIN parties p ON p.id = t.party_id
             WHERE t.date >= ? AND t.date <= ?
             GROUP BY t.party_id, t.type, t.currency
             ORDER BY total DESC",
            [$startDate, $endDate]
        );

        return $this->success('Özet rapor', [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'monthly' => $monthly,
            'by_category' => $byCategory,
            'by_party' => $byParty
        ]);
    }

    /**
     * Transactions report
     * GET /api/reports/transactions
     */
    public function transactions()
    {
        $filters = $this->getQueryParams([
            'type', 'party_id', 'category_id', 'project_id',
            'start_date', 'end_date', 'currency'
        ]);

        $transactions = $this->transactionModel->getFiltered($filters);

        // Calculate totals
        $totals = ['income' => [], 'expense' => []];
        foreach ($transactions as $t) {
            $type = $t['type'];
            $currency = $t['currency'];
            if (!isset($totals[$type][$currency])) {
                $totals[$type][$currency] = 0;
            }
            $totals[$type][$currency] += (float)$t['net_amount'];
        }

        return $this->success('İşlem raporu', [
            'transactions' => $transactions,
            'totals' => $totals,
            'count' => count($transactions)
        ]);
    }

    /**
     * Debts report
     * GET /api/reports/debts
     */
    public function debts()
    {
        $filters = $this->getQueryParams([
            'type', 'party_id', 'status', 'start_date', 'end_date'
        ]);

        $debts = $this->debtModel->getFiltered($filters);

        // Calculate totals
        $totals = ['debt' => [], 'receivable' => []];
        foreach ($debts as $d) {
            $type = $d['kind'] ?? $d['type'] ?? 'debt';
            $currency = $d['currency'];
            if (!isset($totals[$type][$currency])) {
                $totals[$type][$currency] = ['total' => 0, 'paid' => 0, 'remaining' => 0];
            }
            $totals[$type][$currency]['total'] += (float)($d['principal_amount'] ?? $d['total_amount'] ?? 0);
            $totals[$type][$currency]['paid'] += (float)($d['paid_amount'] ?? 0);
            $totals[$type][$currency]['remaining'] += (float)($d['principal_amount'] ?? 0);
        }

        return $this->success('Borç/alacak raporu', [
            'debts' => $debts,
            'totals' => $totals,
            'count' => count($debts)
        ]);
    }

    /**
     * Projects report
     * GET /api/reports/projects
     */
    public function projects()
    {
        $status = $this->getQueryParam('status');
        $projects = $this->projectModel->getAll($status);

        // Calculate totals
        $statusCounts = [];
        $currencyTotals = [];

        foreach ($projects as $p) {
            // Status counts
            $s = $p['status'];
            if (!isset($statusCounts[$s])) {
                $statusCounts[$s] = 0;
            }
            $statusCounts[$s]++;

            // Currency totals
            $currency = $p['currency'];
            if (!isset($currencyTotals[$currency])) {
                $currencyTotals[$currency] = ['contract' => 0, 'balance' => 0];
            }
            $currencyTotals[$currency]['contract'] += (float)$p['contract_amount'];
            $currencyTotals[$currency]['balance'] += (float)($p['balance'] ?? 0);
        }

        return $this->success('Proje raporu', [
            'projects' => $projects,
            'status_counts' => $statusCounts,
            'currency_totals' => $currencyTotals,
            'count' => count($projects)
        ]);
    }

    /**
     * Export report
     * GET /api/reports/export
     */
    public function export()
    {
        $type = $this->getQueryParam('type', 'transactions');
        $format = $this->getQueryParam('format', 'csv');

        if ($type === 'transactions') {
            $filters = $this->getQueryParams([
                'type', 'party_id', 'category_id', 'project_id',
                'start_date', 'end_date'
            ]);
            $csv = $this->transactionModel->exportCsv($filters);
            $filename = 'islemler_' . date('Y-m-d') . '.csv';
        } else if ($type === 'debts') {
            $filters = $this->getQueryParams([
                'type', 'party_id', 'status', 'start_date', 'end_date'
            ]);
            $csv = $this->debtModel->exportCsv($filters);
            $filename = 'borc_alacak_' . date('Y-m-d') . '.csv';
        } else {
            return $this->error('Geçersiz rapor tipi');
        }

        header('Content-Type: text/csv; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"$filename\"");
        echo $csv;
        exit;
    }
}

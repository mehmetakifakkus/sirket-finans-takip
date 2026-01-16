<?php

namespace App\Services;

use App\Models\TransactionModel;
use App\Models\DebtModel;
use App\Models\InstallmentModel;
use App\Models\ProjectModel;
use App\Models\PartyModel;

class ReportService
{
    protected TransactionModel $transactionModel;
    protected DebtModel $debtModel;
    protected InstallmentModel $installmentModel;
    protected ProjectModel $projectModel;
    protected PartyModel $partyModel;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->transactionModel = new TransactionModel();
        $this->debtModel = new DebtModel();
        $this->installmentModel = new InstallmentModel();
        $this->projectModel = new ProjectModel();
        $this->partyModel = new PartyModel();
        $this->currencyService = new CurrencyService();
    }

    /**
     * Get dashboard data
     */
    public function getDashboardData(): array
    {
        $today = date('Y-m-d');
        $firstDayOfMonth = date('Y-m-01');
        $lastDayOfMonth = date('Y-m-t');

        // This month's transactions
        $monthlyTransactions = $this->transactionModel
            ->where('date >=', $firstDayOfMonth)
            ->where('date <=', $lastDayOfMonth)
            ->findAll();

        $monthlyIncome = 0;
        $monthlyExpense = 0;

        foreach ($monthlyTransactions as $t) {
            $conversion = $this->currencyService->convertToTRY(
                (float) $t['net_amount'],
                $t['currency'],
                $t['date']
            );

            if ($t['type'] === 'income') {
                $monthlyIncome += $conversion['amount_try'];
            } else {
                $monthlyExpense += $conversion['amount_try'];
            }
        }

        // Open debts and receivables
        $openDebts = $this->debtModel->getOpenDebts();
        $openReceivables = $this->debtModel->getOpenReceivables();

        $totalDebt = 0;
        $totalReceivable = 0;

        foreach ($openDebts as $debt) {
            $remaining = $this->debtModel->calculateRemainingAmount($debt['id']);
            $conversion = $this->currencyService->convertToTRY($remaining, $debt['currency'], $today);
            $totalDebt += $conversion['amount_try'];
        }

        foreach ($openReceivables as $receivable) {
            $remaining = $this->debtModel->calculateRemainingAmount($receivable['id']);
            $conversion = $this->currencyService->convertToTRY($remaining, $receivable['currency'], $today);
            $totalReceivable += $conversion['amount_try'];
        }

        // Upcoming installments (next 30 days)
        $upcomingInstallments = $this->installmentModel->getUpcoming(30);

        // Overdue installments
        $overdueInstallments = $this->installmentModel->getOverdue();

        // Active projects
        $activeProjects = $this->projectModel->getOpenProjects();

        // Recent transactions
        $recentTransactions = $this->transactionModel->getRecent(5);

        return [
            'monthly_income'         => $monthlyIncome,
            'monthly_expense'        => $monthlyExpense,
            'monthly_balance'        => $monthlyIncome - $monthlyExpense,
            'total_debt'             => $totalDebt,
            'total_receivable'       => $totalReceivable,
            'net_position'           => $totalReceivable - $totalDebt,
            'upcoming_installments'  => $upcomingInstallments,
            'overdue_installments'   => $overdueInstallments,
            'overdue_count'          => count($overdueInstallments),
            'active_projects'        => $activeProjects,
            'active_projects_count'  => count($activeProjects),
            'recent_transactions'    => $recentTransactions,
        ];
    }

    /**
     * Get transaction report data
     */
    public function getTransactionReport(array $filters = []): array
    {
        $transactions = $this->transactionModel->getFiltered($filters);

        $totals = [
            'income'  => ['TRY' => 0, 'USD' => 0, 'EUR' => 0, 'total_try' => 0],
            'expense' => ['TRY' => 0, 'USD' => 0, 'EUR' => 0, 'total_try' => 0],
        ];

        foreach ($transactions as &$t) {
            $type = $t['type'];
            $currency = $t['currency'];
            $amount = (float) $t['net_amount'];

            // Add to currency totals
            if (!isset($totals[$type][$currency])) {
                $totals[$type][$currency] = 0;
            }
            $totals[$type][$currency] += $amount;

            // Convert to TRY
            $conversion = $this->currencyService->convertToTRY($amount, $currency, $t['date']);
            $t['amount_try'] = $conversion['amount_try'];
            $totals[$type]['total_try'] += $conversion['amount_try'];
        }

        return [
            'transactions' => $transactions,
            'totals'       => $totals,
            'balance_try'  => $totals['income']['total_try'] - $totals['expense']['total_try'],
        ];
    }

    /**
     * Get debt report data
     */
    public function getDebtReport(array $filters = []): array
    {
        $debts = $this->debtModel->getFiltered($filters);
        $today = date('Y-m-d');

        $totals = [
            'debt'       => ['principal' => 0, 'paid' => 0, 'remaining' => 0],
            'receivable' => ['principal' => 0, 'paid' => 0, 'remaining' => 0],
        ];

        foreach ($debts as &$debt) {
            $kind = $debt['kind'];
            $paidAmount = $this->debtModel->calculatePaidAmount($debt['id']);
            $remainingAmount = (float) $debt['principal_amount'] - $paidAmount;

            $debt['paid_amount'] = $paidAmount;
            $debt['remaining_amount'] = $remainingAmount;

            // Convert to TRY
            $date = $debt['start_date'] ?? $today;
            $convPrincipal = $this->currencyService->convertToTRY((float) $debt['principal_amount'], $debt['currency'], $date);
            $convPaid = $this->currencyService->convertToTRY($paidAmount, $debt['currency'], $date);
            $convRemaining = $this->currencyService->convertToTRY($remainingAmount, $debt['currency'], $date);

            $debt['principal_try'] = $convPrincipal['amount_try'];
            $debt['paid_try'] = $convPaid['amount_try'];
            $debt['remaining_try'] = $convRemaining['amount_try'];

            $totals[$kind]['principal'] += $convPrincipal['amount_try'];
            $totals[$kind]['paid'] += $convPaid['amount_try'];
            $totals[$kind]['remaining'] += $convRemaining['amount_try'];
        }

        return [
            'debts'        => $debts,
            'totals'       => $totals,
            'net_position' => $totals['receivable']['remaining'] - $totals['debt']['remaining'],
        ];
    }

    /**
     * Get project report data
     */
    public function getProjectReport(array $filters = []): array
    {
        $projects = $this->projectModel->getWithParty();
        $today = date('Y-m-d');

        $totals = [
            'contract_total'  => 0,
            'collected_total' => 0,
            'remaining_total' => 0,
        ];

        foreach ($projects as &$project) {
            $balance = $this->projectModel->calculateBalance($project['id']);
            $project = array_merge($project, $balance);

            // Convert to TRY
            $date = $project['start_date'] ?? $today;
            $convContract = $this->currencyService->convertToTRY($balance['contract_amount'], $project['currency'], $date);
            $convCollected = $this->currencyService->convertToTRY($balance['collected_amount'], $project['currency'], $date);
            $convRemaining = $this->currencyService->convertToTRY($balance['remaining_amount'], $project['currency'], $date);

            $project['contract_try'] = $convContract['amount_try'];
            $project['collected_try'] = $convCollected['amount_try'];
            $project['remaining_try'] = $convRemaining['amount_try'];

            $totals['contract_total'] += $convContract['amount_try'];
            $totals['collected_total'] += $convCollected['amount_try'];
            $totals['remaining_total'] += $convRemaining['amount_try'];
        }

        return [
            'projects' => $projects,
            'totals'   => $totals,
        ];
    }

    /**
     * Get monthly summary for charts
     */
    public function getMonthlySummary(int $year): array
    {
        $months = [];

        for ($i = 1; $i <= 12; $i++) {
            $months[$i] = [
                'month'   => $i,
                'income'  => 0,
                'expense' => 0,
                'balance' => 0,
            ];
        }

        $transactions = $this->transactionModel
            ->where("YEAR(date)", $year)
            ->findAll();

        foreach ($transactions as $t) {
            $month = (int) date('n', strtotime($t['date']));
            $conversion = $this->currencyService->convertToTRY(
                (float) $t['net_amount'],
                $t['currency'],
                $t['date']
            );

            if ($t['type'] === 'income') {
                $months[$month]['income'] += $conversion['amount_try'];
            } else {
                $months[$month]['expense'] += $conversion['amount_try'];
            }
        }

        // Calculate balances
        foreach ($months as &$month) {
            $month['balance'] = $month['income'] - $month['expense'];
        }

        return array_values($months);
    }

    /**
     * Export report to CSV
     */
    public function exportCSV(string $reportType, array $filters = []): string
    {
        switch ($reportType) {
            case 'transactions':
                $transactionService = new TransactionService();
                return $transactionService->exportToCSV($filters);

            case 'debts':
                $debtService = new DebtService();
                return $debtService->exportToCSV($filters);

            case 'projects':
                return $this->exportProjectsCSV();

            default:
                return '';
        }
    }

    /**
     * Export projects to CSV
     */
    protected function exportProjectsCSV(): string
    {
        $report = $this->getProjectReport();

        $csv = "Proje;Müşteri;Sözleşme Tutarı;Para Birimi;Tahsilat;Kalan;Tahsilat %;Durum;Başlangıç;Bitiş\n";

        foreach ($report['projects'] as $p) {
            $status = match($p['status']) {
                'active'    => 'Aktif',
                'completed' => 'Tamamlandı',
                'cancelled' => 'İptal',
                'on_hold'   => 'Beklemede',
                default     => $p['status'],
            };

            $csv .= sprintf(
                "%s;%s;%.2f;%s;%.2f;%.2f;%.2f;%s;%s;%s\n",
                str_replace(';', ',', $p['title']),
                $p['party_name'] ?? '',
                $p['contract_amount'],
                $p['currency'],
                $p['collected_amount'],
                $p['remaining_amount'],
                $p['percentage'],
                $status,
                $p['start_date'] ?? '',
                $p['end_date'] ?? ''
            );
        }

        return $csv;
    }
}

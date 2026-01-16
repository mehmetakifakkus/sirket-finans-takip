<?php

namespace App\Services;

use App\Models\DebtModel;
use App\Models\InstallmentModel;
use App\Models\AuditLogModel;

class DebtService
{
    protected DebtModel $debtModel;
    protected InstallmentModel $installmentModel;
    protected AuditLogModel $auditLogModel;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->debtModel = new DebtModel();
        $this->installmentModel = new InstallmentModel();
        $this->auditLogModel = new AuditLogModel();
        $this->currencyService = new CurrencyService();
    }

    /**
     * Create a new debt/receivable
     */
    public function create(array $data): array
    {
        $id = $this->debtModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'debt', $id, null, $data);

            return [
                'success' => true,
                'message' => 'Borç/Alacak başarıyla oluşturuldu.',
                'id'      => $id,
            ];
        }

        return [
            'success' => false,
            'message' => 'Borç/Alacak oluşturulamadı.',
            'errors'  => $this->debtModel->errors(),
        ];
    }

    /**
     * Update a debt/receivable
     */
    public function update(int $id, array $data): array
    {
        $oldData = $this->debtModel->find($id);

        if (!$oldData) {
            return [
                'success' => false,
                'message' => 'Borç/Alacak bulunamadı.',
            ];
        }

        if ($this->debtModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'debt', $id, $oldData, $data);

            return [
                'success' => true,
                'message' => 'Borç/Alacak başarıyla güncellendi.',
            ];
        }

        return [
            'success' => false,
            'message' => 'Borç/Alacak güncellenemedi.',
            'errors'  => $this->debtModel->errors(),
        ];
    }

    /**
     * Delete a debt/receivable
     */
    public function delete(int $id): array
    {
        $debt = $this->debtModel->find($id);

        if (!$debt) {
            return [
                'success' => false,
                'message' => 'Borç/Alacak bulunamadı.',
            ];
        }

        // Check if there are installments
        $installments = $this->installmentModel->getByDebt($id);
        if (!empty($installments)) {
            // Delete all installments first (cascade should handle this, but just in case)
            foreach ($installments as $installment) {
                $this->installmentModel->delete($installment['id']);
            }
        }

        if ($this->debtModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'debt', $id, $debt, null);

            return [
                'success' => true,
                'message' => 'Borç/Alacak başarıyla silindi.',
            ];
        }

        return [
            'success' => false,
            'message' => 'Borç/Alacak silinemedi.',
        ];
    }

    /**
     * Get debt with full details
     */
    public function getWithDetails(int $id): ?array
    {
        $debt = $this->debtModel->getWithPartyById($id);

        if (!$debt) {
            return null;
        }

        // Get installments
        $debt['installments'] = $this->installmentModel->getByDebt($id);

        // Calculate totals
        $debt['total_installments'] = 0;
        $debt['total_paid'] = 0;

        foreach ($debt['installments'] as $installment) {
            $debt['total_installments'] += (float) $installment['amount'];
            $debt['total_paid'] += (float) $installment['paid_amount'];
        }

        $debt['remaining_amount'] = (float) $debt['principal_amount'] - $debt['total_paid'];
        $debt['payment_percentage'] = $debt['principal_amount'] > 0
            ? round(($debt['total_paid'] / $debt['principal_amount']) * 100, 2)
            : 0;

        // Convert to TRY
        $date = $debt['start_date'] ?? date('Y-m-d');
        $conversion = $this->currencyService->convertToTRY(
            (float) $debt['principal_amount'],
            $debt['currency'],
            $date
        );
        $debt['principal_try'] = $conversion['amount_try'];

        return $debt;
    }

    /**
     * Create installments for a debt
     */
    public function createInstallments(int $debtId, int $count, ?string $startDate = null): array
    {
        $debt = $this->debtModel->find($debtId);

        if (!$debt) {
            return [
                'success' => false,
                'message' => 'Borç bulunamadı.',
            ];
        }

        $principal = (float) $debt['principal_amount'];
        $installmentAmount = round($principal / $count, 2);
        $startDate = $startDate ?? $debt['start_date'] ?? date('Y-m-d');

        $created = 0;
        $total = 0;

        for ($i = 0; $i < $count; $i++) {
            // Last installment gets the remainder
            $amount = ($i === $count - 1) ? ($principal - $total) : $installmentAmount;
            $total += $amount;

            $dueDate = date('Y-m-d', strtotime("+{$i} months", strtotime($startDate)));

            $data = [
                'debt_id'     => $debtId,
                'due_date'    => $dueDate,
                'amount'      => $amount,
                'currency'    => $debt['currency'],
                'status'      => 'pending',
                'paid_amount' => 0,
            ];

            if ($this->installmentModel->insert($data)) {
                $created++;
            }
        }

        return [
            'success' => $created === $count,
            'message' => "{$created} taksit oluşturuldu.",
            'created' => $created,
        ];
    }

    /**
     * Get summary of debts and receivables
     */
    public function getSummary(): array
    {
        $totals = $this->debtModel->getTotalOpenByCurrency();

        $summary = [
            'debt' => [
                'TRY' => $totals['debt']['TRY'] ?? 0,
                'USD' => $totals['debt']['USD'] ?? 0,
                'EUR' => $totals['debt']['EUR'] ?? 0,
                'total_try' => 0,
            ],
            'receivable' => [
                'TRY' => $totals['receivable']['TRY'] ?? 0,
                'USD' => $totals['receivable']['USD'] ?? 0,
                'EUR' => $totals['receivable']['EUR'] ?? 0,
                'total_try' => 0,
            ],
        ];

        // Convert all to TRY
        $today = date('Y-m-d');
        foreach (['debt', 'receivable'] as $kind) {
            foreach (['TRY', 'USD', 'EUR'] as $currency) {
                $amount = $summary[$kind][$currency];
                if ($amount > 0) {
                    $conversion = $this->currencyService->convertToTRY($amount, $currency, $today);
                    $summary[$kind]['total_try'] += $conversion['amount_try'];
                }
            }
        }

        $summary['net_position'] = $summary['receivable']['total_try'] - $summary['debt']['total_try'];

        return $summary;
    }

    /**
     * Get overdue debts/receivables
     */
    public function getOverdue(): array
    {
        $installments = $this->installmentModel->getOverdue();

        $result = [
            'debt' => [],
            'receivable' => [],
        ];

        foreach ($installments as $installment) {
            $kind = $installment['kind'];
            $result[$kind][] = $installment;
        }

        return $result;
    }

    /**
     * Export debts to CSV
     */
    public function exportToCSV(array $filters = []): string
    {
        $debts = $this->debtModel->getFiltered($filters);

        $csv = "Tip;Taraf;Anapara;Para Birimi;KDV Oranı;Başlangıç;Vade;Durum;Ödenen;Kalan;Notlar\n";

        foreach ($debts as $debt) {
            $kind = $debt['kind'] === 'debt' ? 'Borç' : 'Alacak';
            $status = $debt['status'] === 'open' ? 'Açık' : 'Kapalı';

            $paidAmount = $this->debtModel->calculatePaidAmount($debt['id']);
            $remainingAmount = (float) $debt['principal_amount'] - $paidAmount;

            $csv .= sprintf(
                "%s;%s;%.2f;%s;%.2f;%s;%s;%s;%.2f;%.2f;%s\n",
                $kind,
                $debt['party_name'] ?? '',
                $debt['principal_amount'],
                $debt['currency'],
                $debt['vat_rate'],
                $debt['start_date'] ?? '',
                $debt['due_date'] ?? '',
                $status,
                $paidAmount,
                $remainingAmount,
                str_replace(["\n", "\r", ";"], [" ", " ", ","], $debt['notes'] ?? '')
            );
        }

        return $csv;
    }
}

<?php

namespace App\Services;

use App\Models\TransactionModel;
use App\Models\AuditLogModel;

class TransactionService
{
    protected TransactionModel $transactionModel;
    protected AuditLogModel $auditLogModel;
    protected CurrencyService $currencyService;

    public function __construct()
    {
        $this->transactionModel = new TransactionModel();
        $this->auditLogModel = new AuditLogModel();
        $this->currencyService = new CurrencyService();
    }

    /**
     * Create a new transaction
     */
    public function create(array $data): array
    {
        // Calculate KDV, Stopaj, Net amounts
        $calculations = TransactionModel::calculateAmounts(
            (float) $data['amount'],
            (float) ($data['vat_rate'] ?? 0),
            (float) ($data['withholding_rate'] ?? 0),
            $data['type']
        );

        $data['vat_amount'] = $calculations['vat_amount'];
        $data['withholding_amount'] = $calculations['withholding_amount'];
        $data['net_amount'] = $calculations['net_amount'];
        $data['created_by'] = session()->get('user_id');

        // Convert empty strings to null for optional fields
        foreach (['party_id', 'category_id', 'project_id', 'milestone_id'] as $field) {
            if (empty($data[$field])) {
                $data[$field] = null;
            }
        }

        $id = $this->transactionModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'transaction', $id, null, $data);

            return [
                'success' => true,
                'message' => 'İşlem başarıyla oluşturuldu.',
                'id'      => $id,
            ];
        }

        return [
            'success' => false,
            'message' => 'İşlem oluşturulamadı.',
            'errors'  => $this->transactionModel->errors(),
        ];
    }

    /**
     * Update a transaction
     */
    public function update(int $id, array $data): array
    {
        $oldData = $this->transactionModel->find($id);

        if (!$oldData) {
            return [
                'success' => false,
                'message' => 'İşlem bulunamadı.',
            ];
        }

        // Recalculate amounts
        $calculations = TransactionModel::calculateAmounts(
            (float) $data['amount'],
            (float) ($data['vat_rate'] ?? 0),
            (float) ($data['withholding_rate'] ?? 0),
            $data['type']
        );

        $data['vat_amount'] = $calculations['vat_amount'];
        $data['withholding_amount'] = $calculations['withholding_amount'];
        $data['net_amount'] = $calculations['net_amount'];

        // Convert empty strings to null for optional fields
        foreach (['party_id', 'category_id', 'project_id', 'milestone_id'] as $field) {
            if (empty($data[$field])) {
                $data[$field] = null;
            }
        }

        if ($this->transactionModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'transaction', $id, $oldData, $data);

            return [
                'success' => true,
                'message' => 'İşlem başarıyla güncellendi.',
            ];
        }

        return [
            'success' => false,
            'message' => 'İşlem güncellenemedi.',
            'errors'  => $this->transactionModel->errors(),
        ];
    }

    /**
     * Delete a transaction
     */
    public function delete(int $id): array
    {
        $transaction = $this->transactionModel->find($id);

        if (!$transaction) {
            return [
                'success' => false,
                'message' => 'İşlem bulunamadı.',
            ];
        }

        // Delete document if exists
        if (!empty($transaction['document_path'])) {
            $filePath = FCPATH . $transaction['document_path'];
            if (file_exists($filePath)) {
                @unlink($filePath);
            }
        }

        if ($this->transactionModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'transaction', $id, $transaction, null);

            return [
                'success' => true,
                'message' => 'İşlem başarıyla silindi.',
            ];
        }

        return [
            'success' => false,
            'message' => 'İşlem silinemedi.',
        ];
    }

    /**
     * Get transaction with TRY equivalent
     */
    public function getWithTRY(int $id): ?array
    {
        $transaction = $this->transactionModel->getWithRelationsById($id);

        if (!$transaction) {
            return null;
        }

        // Add TRY equivalent
        $conversion = $this->currencyService->convertToTRY(
            (float) $transaction['net_amount'],
            $transaction['currency'],
            $transaction['date']
        );

        $transaction['amount_try'] = $conversion['amount_try'];
        $transaction['exchange_rate'] = $conversion['rate'];
        $transaction['rate_warning'] = $conversion['warning'] ?? null;

        return $transaction;
    }

    /**
     * Get transactions with TRY equivalents
     */
    public function getFilteredWithTRY(array $filters = []): array
    {
        $transactions = $this->transactionModel->getFiltered($filters);

        foreach ($transactions as &$transaction) {
            $conversion = $this->currencyService->convertToTRY(
                (float) $transaction['net_amount'],
                $transaction['currency'],
                $transaction['date']
            );

            $transaction['amount_try'] = $conversion['amount_try'];
        }

        return $transactions;
    }

    /**
     * Get summary statistics
     */
    public function getSummary(?string $dateFrom = null, ?string $dateTo = null): array
    {
        $builder = $this->transactionModel;

        if ($dateFrom) {
            $builder->where('date >=', $dateFrom);
        }

        if ($dateTo) {
            $builder->where('date <=', $dateTo);
        }

        $transactions = $builder->findAll();

        $summary = [
            'income' => ['TRY' => 0, 'USD' => 0, 'EUR' => 0, 'total_try' => 0],
            'expense' => ['TRY' => 0, 'USD' => 0, 'EUR' => 0, 'total_try' => 0],
            'balance' => ['TRY' => 0, 'USD' => 0, 'EUR' => 0, 'total_try' => 0],
        ];

        foreach ($transactions as $transaction) {
            $type = $transaction['type'];
            $currency = $transaction['currency'];
            $amount = (float) $transaction['net_amount'];

            if (!isset($summary[$type][$currency])) {
                $summary[$type][$currency] = 0;
            }

            $summary[$type][$currency] += $amount;

            // Convert to TRY
            $conversion = $this->currencyService->convertToTRY($amount, $currency, $transaction['date']);
            $summary[$type]['total_try'] += $conversion['amount_try'];
        }

        // Calculate balance
        foreach (['TRY', 'USD', 'EUR'] as $currency) {
            $summary['balance'][$currency] = $summary['income'][$currency] - $summary['expense'][$currency];
        }
        $summary['balance']['total_try'] = $summary['income']['total_try'] - $summary['expense']['total_try'];

        return $summary;
    }

    /**
     * Export transactions to CSV format
     */
    public function exportToCSV(array $filters = []): string
    {
        $transactions = $this->getFilteredWithTRY($filters);

        $csv = "Tarih;Tip;Kategori;Taraf;Proje;Tutar;Para Birimi;KDV;Stopaj;Net Tutar;TRY Karşılığı;Açıklama;Belge No\n";

        foreach ($transactions as $t) {
            $type = $t['type'] === 'income' ? 'Gelir' : 'Gider';
            $csv .= sprintf(
                "%s;%s;%s;%s;%s;%.2f;%s;%.2f;%.2f;%.2f;%.2f;%s;%s\n",
                $t['date'],
                $type,
                $t['category_name'] ?? '',
                $t['party_name'] ?? '',
                $t['project_title'] ?? '',
                $t['amount'],
                $t['currency'],
                $t['vat_amount'],
                $t['withholding_amount'],
                $t['net_amount'],
                $t['amount_try'],
                str_replace(["\n", "\r", ";"], [" ", " ", ","], $t['description'] ?? ''),
                $t['ref_no'] ?? ''
            );
        }

        return $csv;
    }
}

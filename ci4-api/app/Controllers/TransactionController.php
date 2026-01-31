<?php

namespace App\Controllers;

use App\Models\TransactionModel;
use App\Models\DocumentModel;
use App\Libraries\Database;

class TransactionController extends BaseController
{
    protected TransactionModel $transactionModel;
    protected DocumentModel $documentModel;

    public function __construct()
    {
        parent::__construct();
        $this->transactionModel = new TransactionModel();
        $this->documentModel = new DocumentModel();
    }

    /**
     * List transactions
     * GET /api/transactions
     */
    public function index()
    {
        $filters = $this->getQueryParams([
            'type', 'party_id', 'category_id', 'project_id', 'currency',
            'start_date', 'end_date', 'search', 'sort_by', 'sort_order',
            'limit', 'offset'
        ]);

        $transactions = $this->transactionModel->getFiltered($filters);

        // Döviz kurlarını al ve her işlem için amount_try hesapla
        $rates = $this->getLatestRates();
        foreach ($transactions as &$t) {
            $t['amount_try'] = $this->convertToTRY(
                (float)($t['net_amount'] ?? 0),
                $t['currency'] ?? 'TRY',
                $rates
            );
        }

        return $this->success('İşlemler listelendi', [
            'transactions' => $transactions,
            'count' => count($transactions)
        ]);
    }

    /**
     * Get single transaction
     * GET /api/transactions/{id}
     */
    public function show(int $id)
    {
        $transaction = $this->transactionModel->getWithDetails($id);

        if (!$transaction) {
            return $this->notFound('İşlem bulunamadı');
        }

        return $this->success('İşlem detayı', [
            'transaction' => $transaction
        ]);
    }

    /**
     * Create transaction
     * POST /api/transactions
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['type', 'date', 'amount', 'currency']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Calculate VAT and withholding
        $amount = (float)$data['amount'];
        $insuranceAmount = isset($data['insurance_amount']) ? (float)$data['insurance_amount'] : null;

        // If insurance is provided, add it to amount for total calculation
        $totalAmount = $insuranceAmount ? $amount + $insuranceAmount : $amount;

        // Check if this is an employee expense (no VAT for employee payments)
        $isEmployeeExpense = false;
        if ($data['type'] === 'expense' && !empty($data['party_id'])) {
            $party = Database::queryOne("SELECT type FROM parties WHERE id = ?", [$data['party_id']]);
            $isEmployeeExpense = $party && $party['type'] === 'employee';
        }

        // Check if category requires VAT (only specific categories)
        $categoryRequiresVat = true;
        if ($data['type'] === 'expense' && !empty($data['category_id'])) {
            $category = Database::queryOne("SELECT name FROM categories WHERE id = ?", [$data['category_id']]);
            if ($category) {
                $categoryName = strtolower($category['name']);
                $vatCategories = ['teçhizat', 'yazılım', 'hizmet alımı', 'ofis malzemesi', 'equipment', 'software', 'service', 'office supplies'];
                $categoryRequiresVat = false;
                foreach ($vatCategories as $vc) {
                    if (strpos($categoryName, $vc) !== false) {
                        $categoryRequiresVat = true;
                        break;
                    }
                }
            }
        }

        $shouldApplyVat = !$isEmployeeExpense && $categoryRequiresVat;
        $vatRate = $shouldApplyVat ? (float)($data['vat_rate'] ?? 0) : 0;
        $withholdingRate = (float)($data['withholding_rate'] ?? 0);
        $vatIncluded = $shouldApplyVat ? !empty($data['vat_included']) : false;

        if ($vatIncluded && $vatRate > 0) {
            // KDV dahil: amount already includes VAT
            // baseAmount = amount / (1 + vatRate/100)
            // vatAmount = amount - baseAmount
            $vatAmount = $totalAmount * $vatRate / (100 + $vatRate);
            $baseAmount = $totalAmount - $vatAmount;
            $withholdingAmount = $baseAmount * ($withholdingRate / 100);
            $netAmount = $totalAmount - $withholdingAmount;
        } else {
            // KDV hariç: add VAT to amount
            $baseAmount = $totalAmount; // Amount is already VAT-excluded
            $vatAmount = $totalAmount * ($vatRate / 100);
            $withholdingAmount = $totalAmount * ($withholdingRate / 100);
            $netAmount = $totalAmount + $vatAmount - $withholdingAmount;
        }

        $insertData = [
            'type' => $data['type'],
            'party_id' => $data['party_id'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'milestone_id' => $data['milestone_id'] ?? null,
            'date' => $data['date'],
            'amount' => $totalAmount,
            'insurance_amount' => $insuranceAmount,
            'currency' => $data['currency'],
            'vat_rate' => $vatRate,
            'vat_amount' => $vatAmount,
            'withholding_rate' => $withholdingRate,
            'withholding_amount' => $withholdingAmount,
            'net_amount' => $netAmount,
            'base_amount' => $baseAmount,
            'description' => $data['description'] ?? null,
            'ref_no' => $data['ref_no'] ?? null,
            'created_by' => $this->getUserId()
        ];

        $id = $this->transactionModel->insert($insertData);
        if (!$id) {
            return $this->error('İşlem oluşturulamadı', 500);
        }

        $transaction = $this->transactionModel->getWithDetails($id);

        return $this->created('İşlem oluşturuldu', [
            'transaction' => $transaction
        ]);
    }

    /**
     * Update transaction
     * PUT /api/transactions/{id}
     */
    public function update(int $id)
    {
        $transaction = $this->transactionModel->find($id);
        if (!$transaction) {
            return $this->notFound('İşlem bulunamadı');
        }

        $data = $this->getJsonInput();

        // Calculate VAT and withholding if amount changed
        if (isset($data['amount'])) {
            $amount = (float)$data['amount'];
            $insuranceAmount = isset($data['insurance_amount']) ? (float)$data['insurance_amount'] : null;

            // If insurance is provided, add it to amount for total calculation
            $totalAmount = $insuranceAmount ? $amount + $insuranceAmount : $amount;

            // Check if this is an employee expense (no VAT for employee payments)
            $partyId = $data['party_id'] ?? $transaction['party_id'] ?? null;
            $type = $data['type'] ?? $transaction['type'] ?? null;
            $categoryId = $data['category_id'] ?? $transaction['category_id'] ?? null;
            $isEmployeeExpense = false;
            if ($type === 'expense' && $partyId) {
                $party = Database::queryOne("SELECT type FROM parties WHERE id = ?", [$partyId]);
                $isEmployeeExpense = $party && $party['type'] === 'employee';
            }

            // Check if category requires VAT (only specific categories)
            $categoryRequiresVat = true;
            if ($type === 'expense' && $categoryId) {
                $category = Database::queryOne("SELECT name FROM categories WHERE id = ?", [$categoryId]);
                if ($category) {
                    $categoryName = strtolower($category['name']);
                    $vatCategories = ['teçhizat', 'yazılım', 'hizmet alımı', 'ofis malzemesi', 'equipment', 'software', 'service', 'office supplies'];
                    $categoryRequiresVat = false;
                    foreach ($vatCategories as $vc) {
                        if (strpos($categoryName, $vc) !== false) {
                            $categoryRequiresVat = true;
                            break;
                        }
                    }
                }
            }

            $shouldApplyVat = !$isEmployeeExpense && $categoryRequiresVat;
            $vatRate = $shouldApplyVat ? (float)($data['vat_rate'] ?? $transaction['vat_rate'] ?? 0) : 0;
            $withholdingRate = (float)($data['withholding_rate'] ?? $transaction['withholding_rate'] ?? 0);
            $vatIncluded = $shouldApplyVat ? !empty($data['vat_included']) : false;

            if ($vatIncluded && $vatRate > 0) {
                // KDV dahil: amount already includes VAT
                $data['vat_amount'] = $totalAmount * $vatRate / (100 + $vatRate);
                $baseAmount = $totalAmount - $data['vat_amount'];
                $data['withholding_amount'] = $baseAmount * ($withholdingRate / 100);
                $data['net_amount'] = $totalAmount - $data['withholding_amount'];
                $data['base_amount'] = $baseAmount;
            } else {
                // KDV hariç: add VAT to amount
                $baseAmount = $totalAmount; // Amount is already VAT-excluded
                $data['vat_amount'] = $totalAmount * ($vatRate / 100);
                $data['withholding_amount'] = $totalAmount * ($withholdingRate / 100);
                $data['net_amount'] = $totalAmount + $data['vat_amount'] - $data['withholding_amount'];
                $data['base_amount'] = $baseAmount;
            }
            $data['amount'] = $totalAmount;
            $data['insurance_amount'] = $insuranceAmount;
            $data['vat_rate'] = $vatRate;
            $data['withholding_rate'] = $withholdingRate;
        }

        // Remove vat_included from data as it's not a database field
        unset($data['vat_included']);

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at'], $data['created_by']);

        $this->transactionModel->update($id, $data);

        $transaction = $this->transactionModel->getWithDetails($id);

        return $this->success('İşlem güncellendi', [
            'transaction' => $transaction
        ]);
    }

    /**
     * Delete transaction
     * DELETE /api/transactions/{id}
     */
    public function delete(int $id)
    {
        $transaction = $this->transactionModel->find($id);
        if (!$transaction) {
            return $this->notFound('İşlem bulunamadı');
        }

        // Delete related documents
        $documents = $this->documentModel->getByTransaction($id);
        foreach ($documents as $doc) {
            $filePath = $this->getUploadPath() . $doc['file_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            $this->documentModel->delete($doc['id']);
        }

        $this->transactionModel->delete($id);

        return $this->success('İşlem silindi');
    }

    /**
     * Get unassigned transactions
     * GET /api/transactions/unassigned
     */
    public function unassigned()
    {
        $transactions = $this->transactionModel->getUnassigned();

        return $this->success('Atanmamış işlemler', [
            'transactions' => $transactions,
            'count' => count($transactions)
        ]);
    }

    /**
     * Assign transactions to project
     * POST /api/transactions/assign
     */
    public function assignToProject()
    {
        $data = $this->getJsonInput();

        if (empty($data['transaction_ids']) || empty($data['project_id'])) {
            return $this->validationError(['message' => 'transaction_ids ve project_id zorunludur']);
        }

        $transactionIds = $data['transaction_ids'];
        $projectId = (int)$data['project_id'];
        $milestoneId = isset($data['milestone_id']) ? (int)$data['milestone_id'] : null;

        $updated = $this->transactionModel->assignToProject($transactionIds, $projectId, $milestoneId);

        return $this->success('İşlemler projeye atandı', [
            'updated_count' => $updated
        ]);
    }

    /**
     * Export transactions to CSV
     * GET /api/transactions/export/csv
     */
    public function export()
    {
        $filters = $this->getQueryParams([
            'type', 'party_id', 'category_id', 'project_id',
            'start_date', 'end_date', 'search'
        ]);

        $csv = $this->transactionModel->exportCsv($filters);

        return $this->response
            ->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', 'attachment; filename="islemler_' . date('Y-m-d') . '.csv"')
            ->setBody($csv);
    }

    /**
     * Get latest exchange rates
     */
    private function getLatestRates(): array
    {
        $rates = ['TRY' => 1.0, 'USD' => 1.0, 'EUR' => 1.0];

        $usdRate = Database::queryOne(
            "SELECT rate FROM exchange_rates WHERE quote_currency = 'USD' ORDER BY rate_date DESC LIMIT 1"
        );
        if ($usdRate) {
            $rates['USD'] = (float)$usdRate['rate'];
        }

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
        return $amount * ($rates[$currency] ?? 1.0);
    }
}

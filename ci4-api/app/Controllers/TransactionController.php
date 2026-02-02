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

        // Toplamları hesapla (hibe gelirleri dahil)
        $totals = $this->calculateTotals($filters, $rates);

        return $this->success('İşlemler listelendi', [
            'transactions' => $transactions,
            'count' => count($transactions),
            'totals' => $totals
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

        // TÜBİTAK support handling
        $tubitakSupported = !empty($data['tubitak_supported']) && $data['type'] === 'expense';
        $grantId = isset($data['grant_id']) ? (int)$data['grant_id'] : null;
        $grantAmount = null;

        // Calculate grant amount if TÜBİTAK supported
        if ($tubitakSupported && $grantId) {
            $grant = Database::queryOne("SELECT funding_rate, vat_excluded FROM project_grants WHERE id = ?", [$grantId]);
            if ($grant && $grant['funding_rate'] > 0) {
                // Grant is calculated on VAT-excluded amount (base_amount)
                $grantAmount = $baseAmount * ($grant['funding_rate'] / 100);
            }
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
            'tubitak_supported' => $tubitakSupported ? 1 : 0,
            'grant_amount' => $grantAmount,
            'grant_id' => $grantId,
            'description' => $data['description'] ?? null,
            'ref_no' => $data['ref_no'] ?? null,
            'created_by' => $this->getUserId()
        ];

        $id = $this->transactionModel->insert($insertData);
        if (!$id) {
            return $this->error('İşlem oluşturulamadı', 500);
        }

        // Create automatic grant income if TÜBİTAK supported
        $linkedIncomeId = null;
        if ($tubitakSupported && $grantAmount > 0) {
            $linkedIncomeId = $this->createGrantIncome($id, $data, $grantAmount, $grantId);
            if ($linkedIncomeId) {
                // Update expense with linked transaction id
                $this->transactionModel->update($id, ['linked_transaction_id' => $linkedIncomeId]);
            }
        }

        $transaction = $this->transactionModel->getWithDetails($id);

        return $this->created('İşlem oluşturuldu', [
            'transaction' => $transaction,
            'linked_income_id' => $linkedIncomeId
        ]);
    }

    /**
     * Create automatic grant income transaction
     */
    private function createGrantIncome(int $expenseId, array $expenseData, float $grantAmount, ?int $grantId): ?int
    {
        // Get grant provider name for description
        $grantProviderName = 'TÜBİTAK';
        if ($grantId) {
            $grant = Database::queryOne("SELECT provider_name FROM project_grants WHERE id = ?", [$grantId]);
            if ($grant) {
                $grantProviderName = $grant['provider_name'];
            }
        }

        $description = $grantProviderName . ' Hibe - ' . ($expenseData['description'] ?? 'Gider #' . $expenseId);

        $incomeData = [
            'type' => 'income',
            'party_id' => null, // Could link to TÜBİTAK party if exists
            'category_id' => null, // Could create/use a "Hibe Geliri" category
            'project_id' => $expenseData['project_id'] ?? null,
            'milestone_id' => $expenseData['milestone_id'] ?? null,
            'date' => $expenseData['date'],
            'amount' => $grantAmount,
            'currency' => $expenseData['currency'],
            'vat_rate' => 0,
            'vat_amount' => 0,
            'withholding_rate' => 0,
            'withholding_amount' => 0,
            'net_amount' => $grantAmount,
            'base_amount' => $grantAmount,
            'tubitak_supported' => 0,
            'grant_amount' => null,
            'grant_id' => $grantId,
            'linked_transaction_id' => $expenseId,
            'description' => $description,
            'ref_no' => null,
            'created_by' => $this->getUserId()
        ];

        return $this->transactionModel->insert($incomeData);
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

        // Handle TÜBİTAK support changes
        $type = $data['type'] ?? $transaction['type'];
        $tubitakSupported = !empty($data['tubitak_supported']) && $type === 'expense';
        $grantId = isset($data['grant_id']) ? (int)$data['grant_id'] : ($transaction['grant_id'] ?? null);
        $oldTubitakSupported = !empty($transaction['tubitak_supported']);
        $oldLinkedTransactionId = $transaction['linked_transaction_id'] ?? null;

        // Calculate base_amount if not already calculated
        $baseAmount = $data['base_amount'] ?? $transaction['base_amount'] ?? $transaction['amount'];

        // Calculate grant amount if TÜBİTAK supported
        $grantAmount = null;
        if ($tubitakSupported && $grantId) {
            $grant = Database::queryOne("SELECT funding_rate FROM project_grants WHERE id = ?", [$grantId]);
            if ($grant && $grant['funding_rate'] > 0) {
                $grantAmount = $baseAmount * ($grant['funding_rate'] / 100);
            }
        }

        $data['tubitak_supported'] = $tubitakSupported ? 1 : 0;
        $data['grant_amount'] = $grantAmount;
        $data['grant_id'] = $grantId;

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at'], $data['created_by']);

        $this->transactionModel->update($id, $data);

        // Handle linked grant income
        if ($tubitakSupported && $grantAmount > 0) {
            if ($oldLinkedTransactionId) {
                // Update existing linked income
                $this->updateLinkedGrantIncome($oldLinkedTransactionId, $id, array_merge($transaction, $data), $grantAmount, $grantId);
            } else {
                // Create new linked income
                $linkedIncomeId = $this->createGrantIncome($id, array_merge($transaction, $data), $grantAmount, $grantId);
                if ($linkedIncomeId) {
                    $this->transactionModel->update($id, ['linked_transaction_id' => $linkedIncomeId]);
                }
            }
        } elseif (!$tubitakSupported && $oldLinkedTransactionId) {
            // Remove linked income if TÜBİTAK support was disabled
            $this->transactionModel->delete($oldLinkedTransactionId);
            $this->transactionModel->update($id, ['linked_transaction_id' => null]);
        }

        $transaction = $this->transactionModel->getWithDetails($id);

        return $this->success('İşlem güncellendi', [
            'transaction' => $transaction
        ]);
    }

    /**
     * Update linked grant income transaction
     */
    private function updateLinkedGrantIncome(int $incomeId, int $expenseId, array $expenseData, float $grantAmount, ?int $grantId): void
    {
        // Get grant provider name for description
        $grantProviderName = 'TÜBİTAK';
        if ($grantId) {
            $grant = Database::queryOne("SELECT provider_name FROM project_grants WHERE id = ?", [$grantId]);
            if ($grant) {
                $grantProviderName = $grant['provider_name'];
            }
        }

        $description = $grantProviderName . ' Hibe - ' . ($expenseData['description'] ?? 'Gider #' . $expenseId);

        $updateData = [
            'project_id' => $expenseData['project_id'] ?? null,
            'milestone_id' => $expenseData['milestone_id'] ?? null,
            'date' => $expenseData['date'],
            'amount' => $grantAmount,
            'currency' => $expenseData['currency'],
            'net_amount' => $grantAmount,
            'base_amount' => $grantAmount,
            'grant_id' => $grantId,
            'description' => $description
        ];

        $this->transactionModel->update($incomeId, $updateData);
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

        // Delete linked grant income if exists
        if (!empty($transaction['linked_transaction_id'])) {
            $linkedTransaction = $this->transactionModel->find($transaction['linked_transaction_id']);
            if ($linkedTransaction) {
                // Delete documents of linked transaction
                $linkedDocs = $this->documentModel->getByTransaction($transaction['linked_transaction_id']);
                foreach ($linkedDocs as $doc) {
                    $filePath = $this->getUploadPath() . $doc['file_path'];
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                    $this->documentModel->delete($doc['id']);
                }
                $this->transactionModel->delete($transaction['linked_transaction_id']);
            }
        }

        // Also check if this transaction is a linked income (delete the link from expense)
        $linkedExpense = Database::queryOne(
            "SELECT id FROM transactions WHERE linked_transaction_id = ?",
            [$id]
        );
        if ($linkedExpense) {
            $this->transactionModel->update($linkedExpense['id'], [
                'linked_transaction_id' => null,
                'tubitak_supported' => 0,
                'grant_amount' => null
            ]);
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
     * Calculate totals including grant incomes
     */
    private function calculateTotals(array $filters, array $rates): array
    {
        // Build WHERE clause for filters (same as getFiltered but without grant income exclusion)
        $where = "1=1";
        $params = [];

        if (!empty($filters['type'])) {
            $where .= " AND type = ?";
            $params[] = $filters['type'];
        }
        if (!empty($filters['party_id'])) {
            $where .= " AND party_id = ?";
            $params[] = $filters['party_id'];
        }
        if (!empty($filters['category_id'])) {
            $where .= " AND category_id = ?";
            $params[] = $filters['category_id'];
        }
        if (!empty($filters['project_id'])) {
            $where .= " AND project_id = ?";
            $params[] = $filters['project_id'];
        }
        if (!empty($filters['currency'])) {
            $where .= " AND currency = ?";
            $params[] = $filters['currency'];
        }
        if (!empty($filters['start_date'])) {
            $where .= " AND date >= ?";
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $where .= " AND date <= ?";
            $params[] = $filters['end_date'];
        }

        // Get all transactions for totals (including grant incomes)
        $sql = "SELECT type, net_amount, currency FROM transactions WHERE $where";
        $allTransactions = Database::query($sql, $params);

        $totalIncome = 0.0;
        $totalExpense = 0.0;

        foreach ($allTransactions as $t) {
            $amountTry = $this->convertToTRY(
                (float)($t['net_amount'] ?? 0),
                $t['currency'] ?? 'TRY',
                $rates
            );

            if ($t['type'] === 'income') {
                $totalIncome += $amountTry;
            } else {
                $totalExpense += $amountTry;
            }
        }

        return [
            'income' => $totalIncome,
            'expense' => $totalExpense,
            'balance' => $totalIncome - $totalExpense
        ];
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

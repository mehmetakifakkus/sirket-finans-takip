<?php

namespace App\Controllers;

use App\Models\TransactionModel;
use App\Models\DocumentModel;

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
        $vatRate = (float)($data['vat_rate'] ?? 0);
        $withholdingRate = (float)($data['withholding_rate'] ?? 0);

        $vatAmount = $amount * ($vatRate / 100);
        $withholdingAmount = $amount * ($withholdingRate / 100);
        $netAmount = $amount + $vatAmount - $withholdingAmount;

        $insertData = [
            'type' => $data['type'],
            'party_id' => $data['party_id'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'milestone_id' => $data['milestone_id'] ?? null,
            'date' => $data['date'],
            'amount' => $amount,
            'currency' => $data['currency'],
            'vat_rate' => $vatRate,
            'vat_amount' => $vatAmount,
            'withholding_rate' => $withholdingRate,
            'withholding_amount' => $withholdingAmount,
            'net_amount' => $netAmount,
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
            $vatRate = (float)($data['vat_rate'] ?? $transaction['vat_rate'] ?? 0);
            $withholdingRate = (float)($data['withholding_rate'] ?? $transaction['withholding_rate'] ?? 0);

            $data['vat_amount'] = $amount * ($vatRate / 100);
            $data['withholding_amount'] = $amount * ($withholdingRate / 100);
            $data['net_amount'] = $amount + $data['vat_amount'] - $data['withholding_amount'];
            $data['vat_rate'] = $vatRate;
            $data['withholding_rate'] = $withholdingRate;
        }

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
}

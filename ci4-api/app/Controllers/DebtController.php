<?php

namespace App\Controllers;

use App\Models\DebtModel;
use App\Models\InstallmentModel;

class DebtController extends BaseController
{
    protected DebtModel $debtModel;
    protected InstallmentModel $installmentModel;

    public function __construct()
    {
        parent::__construct();
        $this->debtModel = new DebtModel();
        $this->installmentModel = new InstallmentModel();
    }

    /**
     * List debts
     * GET /api/debts
     */
    public function index()
    {
        $filters = $this->getQueryParams([
            'type', 'party_id', 'status', 'currency',
            'start_date', 'end_date', 'search', 'sort_by', 'sort_order'
        ]);

        $debts = $this->debtModel->getFiltered($filters);

        return $this->success('Borç/alacaklar listelendi', [
            'debts' => $debts,
            'count' => count($debts)
        ]);
    }

    /**
     * Get single debt
     * GET /api/debts/{id}
     */
    public function show(int $id)
    {
        $debt = $this->debtModel->getWithInstallments($id);

        if (!$debt) {
            return $this->notFound('Borç/alacak bulunamadı');
        }

        return $this->success('Borç/alacak detayı', [
            'debt' => $debt
        ]);
    }

    /**
     * Create debt
     * POST /api/debts
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['type', 'party_id', 'amount', 'currency', 'date', 'due_date']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Calculate VAT
        $amount = (float)$data['amount'];
        $vatRate = (float)($data['vat_rate'] ?? 0);
        $vatAmount = $amount * ($vatRate / 100);
        $totalAmount = $amount + $vatAmount;

        $insertData = [
            'type' => $data['type'],
            'party_id' => $data['party_id'],
            'amount' => $amount,
            'currency' => $data['currency'],
            'vat_rate' => $vatRate,
            'vat_amount' => $vatAmount,
            'total_amount' => $totalAmount,
            'paid_amount' => 0,
            'remaining_amount' => $totalAmount,
            'date' => $data['date'],
            'due_date' => $data['due_date'],
            'description' => $data['description'] ?? null,
            'status' => 'pending',
            'notes' => $data['notes'] ?? null,
            'created_by' => $this->getUserId()
        ];

        $id = $this->debtModel->insert($insertData);
        if (!$id) {
            return $this->error('Borç/alacak oluşturulamadı', 500);
        }

        $debt = $this->debtModel->getWithInstallments($id);

        return $this->created('Borç/alacak oluşturuldu', [
            'debt' => $debt
        ]);
    }

    /**
     * Update debt
     * PUT /api/debts/{id}
     */
    public function update(int $id)
    {
        $debt = $this->debtModel->find($id);
        if (!$debt) {
            return $this->notFound('Borç/alacak bulunamadı');
        }

        $data = $this->getJsonInput();

        // Recalculate if amount changed
        if (isset($data['amount'])) {
            $amount = (float)$data['amount'];
            $vatRate = (float)($data['vat_rate'] ?? $debt['vat_rate'] ?? 0);
            $vatAmount = $amount * ($vatRate / 100);
            $totalAmount = $amount + $vatAmount;
            $paidAmount = (float)$debt['paid_amount'];

            $data['vat_amount'] = $vatAmount;
            $data['total_amount'] = $totalAmount;
            $data['remaining_amount'] = $totalAmount - $paidAmount;
            $data['vat_rate'] = $vatRate;

            // Update status based on payments
            if ($data['remaining_amount'] <= 0) {
                $data['status'] = 'paid';
            } elseif ($paidAmount > 0) {
                $data['status'] = 'partial';
            }
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at'], $data['created_by']);

        $this->debtModel->update($id, $data);

        $debt = $this->debtModel->getWithInstallments($id);

        return $this->success('Borç/alacak güncellendi', [
            'debt' => $debt
        ]);
    }

    /**
     * Delete debt
     * DELETE /api/debts/{id}
     */
    public function delete(int $id)
    {
        $debt = $this->debtModel->find($id);
        if (!$debt) {
            return $this->notFound('Borç/alacak bulunamadı');
        }

        // Delete related installments
        $this->installmentModel->where('debt_id', $id)->delete();

        $this->debtModel->delete($id);

        return $this->success('Borç/alacak silindi');
    }

    /**
     * Create installments for debt
     * POST /api/debts/{id}/installments
     */
    public function createInstallments(int $id)
    {
        $debt = $this->debtModel->find($id);
        if (!$debt) {
            return $this->notFound('Borç/alacak bulunamadı');
        }

        $data = $this->getJsonInput();

        // Validate
        $errors = $this->validateRequired($data, ['count', 'start_date']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Delete existing installments
        $this->installmentModel->where('debt_id', $id)->delete();

        // Create new installments
        $installments = $this->installmentModel->createInstallments(
            $id,
            (float)$debt['total_amount'],
            (int)$data['count'],
            $data['start_date']
        );

        // Update debt paid amounts
        $this->debtModel->updatePaidAmount($id);

        return $this->success('Taksitler oluşturuldu', [
            'installments' => $installments
        ]);
    }

    /**
     * Export debts to CSV
     * GET /api/debts/export/csv
     */
    public function export()
    {
        $filters = $this->getQueryParams([
            'type', 'party_id', 'status', 'start_date', 'end_date', 'search'
        ]);

        $csv = $this->debtModel->exportCsv($filters);

        return $this->response
            ->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', 'attachment; filename="borc_alacak_' . date('Y-m-d') . '.csv"')
            ->setBody($csv);
    }
}

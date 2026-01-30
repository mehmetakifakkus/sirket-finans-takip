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
        $errors = $this->validateRequired($data, ['kind', 'party_id', 'principal_amount', 'currency']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        $insertData = [
            'kind' => $data['kind'],
            'party_id' => $data['party_id'],
            'principal_amount' => (float)$data['principal_amount'],
            'currency' => $data['currency'],
            'vat_rate' => (float)($data['vat_rate'] ?? 0),
            'start_date' => $data['start_date'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'status' => 'open',
            'notes' => $data['notes'] ?? null
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

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at']);

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
        $this->installmentModel->where('debt_id', $id)->chainDelete();

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
        $this->installmentModel->where('debt_id', $id)->chainDelete();

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
     * Add direct payment to debt
     * POST /api/debts/{id}/pay
     */
    public function addPayment(int $id)
    {
        $debt = $this->debtModel->find($id);
        if (!$debt) {
            return $this->notFound('Borç/alacak bulunamadı');
        }

        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['amount']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        $amount = (float)$data['amount'];
        $date = $data['date'] ?? date('Y-m-d');
        $method = $data['method'] ?? 'bank';
        $notes = $data['notes'] ?? null;

        // Create payment record
        $paymentModel = new \App\Models\PaymentModel();
        $paymentId = $paymentModel->insert([
            'related_type' => 'debt',
            'related_id' => $id,
            'amount' => $amount,
            'currency' => $debt['currency'],
            'payment_date' => $date,
            'payment_method' => $method,
            'notes' => $notes
        ]);

        if (!$paymentId) {
            return $this->error('Ödeme kaydedilemedi', 500);
        }

        // Update debt paid amount
        $this->debtModel->updatePaidAmount($id);

        $updatedDebt = $this->debtModel->getWithInstallments($id);

        return $this->success('Ödeme kaydedildi', [
            'debt' => $updatedDebt,
            'payment_id' => $paymentId
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

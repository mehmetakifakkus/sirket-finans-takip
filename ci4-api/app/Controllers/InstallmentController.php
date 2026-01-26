<?php

namespace App\Controllers;

use App\Models\InstallmentModel;
use App\Models\DebtModel;
use App\Models\PaymentModel;

class InstallmentController extends BaseController
{
    protected InstallmentModel $installmentModel;
    protected DebtModel $debtModel;
    protected PaymentModel $paymentModel;

    public function __construct()
    {
        parent::__construct();
        $this->installmentModel = new InstallmentModel();
        $this->debtModel = new DebtModel();
        $this->paymentModel = new PaymentModel();
    }

    /**
     * Get single installment
     * GET /api/installments/{id}
     */
    public function show(int $id)
    {
        $installment = $this->installmentModel->getWithDebt($id);

        if (!$installment) {
            return $this->notFound('Taksit bulunamadı');
        }

        return $this->success('Taksit detayı', [
            'installment' => $installment
        ]);
    }

    /**
     * Update installment
     * PUT /api/installments/{id}
     */
    public function update(int $id)
    {
        $installment = $this->installmentModel->find($id);
        if (!$installment) {
            return $this->notFound('Taksit bulunamadı');
        }

        $data = $this->getJsonInput();

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['debt_id'], $data['created_at']);

        $this->installmentModel->update($id, $data);

        // Update debt paid amounts
        $this->debtModel->updatePaidAmount($installment['debt_id']);

        $updatedInstallment = $this->installmentModel->getWithDebt($id);

        return $this->success('Taksit güncellendi', [
            'installment' => $updatedInstallment
        ]);
    }

    /**
     * Delete installment
     * DELETE /api/installments/{id}
     */
    public function delete(int $id)
    {
        $installment = $this->installmentModel->find($id);
        if (!$installment) {
            return $this->notFound('Taksit bulunamadı');
        }

        $debtId = $installment['debt_id'];

        $this->installmentModel->delete($id);

        // Update debt paid amounts
        $this->debtModel->updatePaidAmount($debtId);

        return $this->success('Taksit silindi');
    }

    /**
     * Pay installment
     * POST /api/installments/{id}/pay
     */
    public function pay(int $id)
    {
        $installment = $this->installmentModel->getWithDebt($id);
        if (!$installment) {
            return $this->notFound('Taksit bulunamadı');
        }

        if ($installment['status'] === 'paid') {
            return $this->error('Bu taksit zaten ödenmiş');
        }

        $data = $this->getJsonInput();
        $paidDate = $data['paid_date'] ?? date('Y-m-d');

        // Mark as paid
        $this->installmentModel->markAsPaid($id, (float)$installment['amount']);

        // Record payment
        $this->paymentModel->recordInstallmentPayment(
            $id,
            (float)$installment['amount'],
            $installment['debt_currency'] ?? $installment['currency'] ?? 'TRY',
            $paidDate
        );

        // Update debt paid amounts
        $this->debtModel->updatePaidAmount($installment['debt_id']);

        $updatedInstallment = $this->installmentModel->getWithDebt($id);

        return $this->success('Taksit ödendi', [
            'installment' => $updatedInstallment
        ]);
    }
}

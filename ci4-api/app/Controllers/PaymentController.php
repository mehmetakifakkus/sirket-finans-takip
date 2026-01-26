<?php

namespace App\Controllers;

use App\Models\PaymentModel;
use App\Models\InstallmentModel;
use App\Models\DebtModel;

class PaymentController extends BaseController
{
    protected PaymentModel $paymentModel;
    protected InstallmentModel $installmentModel;
    protected DebtModel $debtModel;

    public function __construct()
    {
        parent::__construct();
        $this->paymentModel = new PaymentModel();
        $this->installmentModel = new InstallmentModel();
        $this->debtModel = new DebtModel();
    }

    /**
     * List payments
     * GET /api/payments
     */
    public function index()
    {
        $filters = $this->getQueryParams([
            'debt_id', 'start_date', 'end_date'
        ]);

        $payments = $this->paymentModel->getFiltered($filters);

        return $this->success('Ödemeler listelendi', [
            'payments' => $payments,
            'count' => count($payments)
        ]);
    }

    /**
     * Delete payment (and unmark installment)
     * DELETE /api/payments/{id}
     */
    public function delete(int $id)
    {
        $payment = $this->paymentModel->find($id);
        if (!$payment) {
            return $this->notFound('Ödeme bulunamadı');
        }

        // Get the related debt ID for updating paid amount later
        $debtId = null;

        // Unmark installment as paid if related to an installment
        if ($payment['related_type'] === 'installment' && $payment['related_id']) {
            $this->installmentModel->markAsUnpaid($payment['related_id']);
            // Get debt_id from installment
            $installment = $this->installmentModel->find($payment['related_id']);
            if ($installment) {
                $debtId = $installment['debt_id'];
            }
        } elseif ($payment['related_type'] === 'debt' && $payment['related_id']) {
            $debtId = $payment['related_id'];
        }

        $this->paymentModel->delete($id);

        // Update debt paid amounts
        if ($debtId) {
            $this->debtModel->updatePaidAmount($debtId);
        }

        return $this->success('Ödeme silindi');
    }
}

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

        // Unmark installment as paid
        if ($payment['installment_id']) {
            $this->installmentModel->markAsUnpaid($payment['installment_id']);
        }

        $this->paymentModel->delete($id);

        // Update debt paid amounts
        if ($payment['debt_id']) {
            $this->debtModel->updatePaidAmount($payment['debt_id']);
        }

        return $this->success('Ödeme silindi');
    }
}

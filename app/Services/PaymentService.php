<?php

namespace App\Services;

use App\Models\PaymentModel;
use App\Models\InstallmentModel;
use App\Models\DebtModel;
use App\Models\TransactionModel;
use App\Models\AuditLogModel;

class PaymentService
{
    protected PaymentModel $paymentModel;
    protected InstallmentModel $installmentModel;
    protected DebtModel $debtModel;
    protected TransactionModel $transactionModel;
    protected AuditLogModel $auditLogModel;

    public function __construct()
    {
        $this->paymentModel = new PaymentModel();
        $this->installmentModel = new InstallmentModel();
        $this->debtModel = new DebtModel();
        $this->transactionModel = new TransactionModel();
        $this->auditLogModel = new AuditLogModel();
    }

    /**
     * Record a payment for an installment
     */
    public function payInstallment(int $installmentId, array $data): array
    {
        $installment = $this->installmentModel->find($installmentId);

        if (!$installment) {
            return [
                'success' => false,
                'message' => 'Taksit bulunamadı.',
            ];
        }

        // Get debt info
        $debt = $this->debtModel->find($installment['debt_id']);

        if (!$debt) {
            return [
                'success' => false,
                'message' => 'Borç/Alacak bulunamadı.',
            ];
        }

        $paymentAmount = (float) $data['amount'];
        $remainingAmount = (float) $installment['amount'] - (float) $installment['paid_amount'];

        if ($paymentAmount > $remainingAmount) {
            return [
                'success' => false,
                'message' => "Ödeme tutarı kalan tutarı ({$remainingAmount}) aşıyor.",
            ];
        }

        // Create transaction if requested
        $transactionId = null;
        if (!empty($data['create_transaction']) && $data['create_transaction']) {
            $transactionData = [
                'type'        => $debt['kind'] === 'debt' ? 'expense' : 'income',
                'party_id'    => $debt['party_id'],
                'date'        => $data['date'],
                'amount'      => $paymentAmount,
                'currency'    => $installment['currency'],
                'net_amount'  => $paymentAmount,
                'description' => "Taksit ödemesi - {$debt['kind']}",
                'created_by'  => session()->get('user_id'),
            ];

            $transactionId = $this->transactionModel->insert($transactionData);
        }

        // Create payment record
        $paymentData = [
            'related_type'   => 'installment',
            'related_id'     => $installmentId,
            'transaction_id' => $transactionId,
            'date'           => $data['date'],
            'amount'         => $paymentAmount,
            'currency'       => $installment['currency'],
            'method'         => $data['method'] ?? 'bank',
            'notes'          => $data['notes'] ?? null,
        ];

        $paymentId = $this->paymentModel->insert($paymentData);

        if ($paymentId) {
            // Update installment paid amount and status
            $this->installmentModel->recordPayment($installmentId, $paymentAmount);

            $this->auditLogModel->logAction('create', 'payment', $paymentId, null, $paymentData);

            return [
                'success' => true,
                'message' => 'Ödeme başarıyla kaydedildi.',
                'id'      => $paymentId,
            ];
        }

        return [
            'success' => false,
            'message' => 'Ödeme kaydedilemedi.',
            'errors'  => $this->paymentModel->errors(),
        ];
    }

    /**
     * Record a direct payment for a debt (not through installment)
     */
    public function payDebt(int $debtId, array $data): array
    {
        $debt = $this->debtModel->find($debtId);

        if (!$debt) {
            return [
                'success' => false,
                'message' => 'Borç/Alacak bulunamadı.',
            ];
        }

        $paymentAmount = (float) $data['amount'];

        // Create transaction if requested
        $transactionId = null;
        if (!empty($data['create_transaction']) && $data['create_transaction']) {
            $transactionData = [
                'type'        => $debt['kind'] === 'debt' ? 'expense' : 'income',
                'party_id'    => $debt['party_id'],
                'date'        => $data['date'],
                'amount'      => $paymentAmount,
                'currency'    => $debt['currency'],
                'net_amount'  => $paymentAmount,
                'description' => "Doğrudan ödeme - {$debt['kind']}",
                'created_by'  => session()->get('user_id'),
            ];

            $transactionId = $this->transactionModel->insert($transactionData);
        }

        // Create payment record
        $paymentData = [
            'related_type'   => 'debt',
            'related_id'     => $debtId,
            'transaction_id' => $transactionId,
            'date'           => $data['date'],
            'amount'         => $paymentAmount,
            'currency'       => $debt['currency'],
            'method'         => $data['method'] ?? 'bank',
            'notes'          => $data['notes'] ?? null,
        ];

        $paymentId = $this->paymentModel->insert($paymentData);

        if ($paymentId) {
            $this->auditLogModel->logAction('create', 'payment', $paymentId, null, $paymentData);

            // Check if debt should be closed
            $this->debtModel->updateStatusFromInstallments($debtId);

            return [
                'success' => true,
                'message' => 'Ödeme başarıyla kaydedildi.',
                'id'      => $paymentId,
            ];
        }

        return [
            'success' => false,
            'message' => 'Ödeme kaydedilemedi.',
        ];
    }

    /**
     * Delete a payment
     */
    public function delete(int $id): array
    {
        $payment = $this->paymentModel->find($id);

        if (!$payment) {
            return [
                'success' => false,
                'message' => 'Ödeme bulunamadı.',
            ];
        }

        // If payment was for an installment, reverse the paid amount
        if ($payment['related_type'] === 'installment') {
            $installment = $this->installmentModel->find($payment['related_id']);
            if ($installment) {
                $newPaidAmount = max(0, (float) $installment['paid_amount'] - (float) $payment['amount']);
                $this->installmentModel->update($payment['related_id'], ['paid_amount' => $newPaidAmount]);
                $this->installmentModel->updateStatus($payment['related_id']);

                // Update debt status
                $this->debtModel->updateStatusFromInstallments($installment['debt_id']);
            }
        }

        // Delete associated transaction if exists
        if (!empty($payment['transaction_id'])) {
            $this->transactionModel->delete($payment['transaction_id']);
        }

        if ($this->paymentModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'payment', $id, $payment, null);

            return [
                'success' => true,
                'message' => 'Ödeme başarıyla silindi.',
            ];
        }

        return [
            'success' => false,
            'message' => 'Ödeme silinemedi.',
        ];
    }

    /**
     * Get payment methods for dropdown
     */
    public static function getMethodOptions(): array
    {
        return [
            'cash'  => 'Nakit',
            'bank'  => 'Banka Transferi',
            'card'  => 'Kredi Kartı',
            'other' => 'Diğer',
        ];
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

class InstallmentModel extends Model
{
    protected $table            = 'installments';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'debt_id',
        'due_date',
        'amount',
        'currency',
        'status',
        'paid_amount',
        'notes',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'debt_id'     => 'required|integer',
        'due_date'    => 'required|valid_date',
        'amount'      => 'required|decimal',
        'currency'    => 'required|max_length[3]',
        'status'      => 'required|in_list[pending,paid,partial]',
        'paid_amount' => 'permit_empty|decimal',
    ];

    protected $validationMessages = [
        'debt_id' => [
            'required' => 'Borç seçimi zorunludur.',
        ],
        'due_date' => [
            'required'   => 'Vade tarihi zorunludur.',
            'valid_date' => 'Geçerli bir tarih giriniz.',
        ],
        'amount' => [
            'required' => 'Taksit tutarı zorunludur.',
            'decimal'  => 'Geçerli bir tutar giriniz.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get installments by debt
     */
    public function getByDebt(int $debtId): array
    {
        return $this->where('debt_id', $debtId)
                    ->orderBy('due_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get upcoming installments
     */
    public function getUpcoming(int $days = 30): array
    {
        $futureDate = date('Y-m-d', strtotime("+{$days} days"));

        return $this->select('installments.*, debts.kind, debts.principal_amount as debt_amount, parties.name as party_name')
                    ->join('debts', 'debts.id = installments.debt_id')
                    ->join('parties', 'parties.id = debts.party_id', 'left')
                    ->whereIn('installments.status', ['pending', 'partial'])
                    ->where('installments.due_date <=', $futureDate)
                    ->where('debts.status', 'open')
                    ->orderBy('installments.due_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get overdue installments
     */
    public function getOverdue(): array
    {
        return $this->select('installments.*, debts.kind, parties.name as party_name')
                    ->join('debts', 'debts.id = installments.debt_id')
                    ->join('parties', 'parties.id = debts.party_id', 'left')
                    ->whereIn('installments.status', ['pending', 'partial'])
                    ->where('installments.due_date <', date('Y-m-d'))
                    ->where('debts.status', 'open')
                    ->orderBy('installments.due_date', 'ASC')
                    ->findAll();
    }

    /**
     * Update installment status based on payment
     */
    public function updateStatus(int $installmentId): bool
    {
        $installment = $this->find($installmentId);
        if (!$installment) {
            return false;
        }

        $paidAmount = (float) $installment['paid_amount'];
        $amount = (float) $installment['amount'];

        $status = 'pending';
        if ($paidAmount >= $amount) {
            $status = 'paid';
        } elseif ($paidAmount > 0) {
            $status = 'partial';
        }

        return $this->update($installmentId, ['status' => $status]);
    }

    /**
     * Record payment for installment
     */
    public function recordPayment(int $installmentId, float $paymentAmount): bool
    {
        $installment = $this->find($installmentId);
        if (!$installment) {
            return false;
        }

        $newPaidAmount = (float) $installment['paid_amount'] + $paymentAmount;

        $this->update($installmentId, ['paid_amount' => $newPaidAmount]);
        $this->updateStatus($installmentId);

        // Update debt status
        $debtModel = new DebtModel();
        $debtModel->updateStatusFromInstallments($installment['debt_id']);

        return true;
    }

    /**
     * Calculate total installments amount for a debt
     */
    public function getTotalForDebt(int $debtId): float
    {
        $result = $this->where('debt_id', $debtId)
                       ->selectSum('amount')
                       ->first();

        return (float) ($result['amount'] ?? 0);
    }

    /**
     * Get remaining amount for installment
     */
    public function getRemainingAmount(int $installmentId): float
    {
        $installment = $this->find($installmentId);
        if (!$installment) {
            return 0;
        }

        return (float) $installment['amount'] - (float) $installment['paid_amount'];
    }

    /**
     * Validate total installments don't exceed principal
     */
    public function validateTotalAgainstPrincipal(int $debtId, float $newAmount, ?int $excludeId = null): array
    {
        $debtModel = new DebtModel();
        $debt = $debtModel->find($debtId);

        if (!$debt) {
            return ['valid' => false, 'message' => 'Borç bulunamadı.'];
        }

        $builder = $this->where('debt_id', $debtId);
        if ($excludeId) {
            $builder->where('id !=', $excludeId);
        }

        $result = $builder->selectSum('amount')->first();
        $existingTotal = (float) ($result['amount'] ?? 0);
        $newTotal = $existingTotal + $newAmount;

        if ($newTotal > (float) $debt['principal_amount']) {
            return [
                'valid' => false,
                'message' => sprintf(
                    'Taksit toplamı (%.2f) anapara tutarını (%.2f) aşıyor!',
                    $newTotal,
                    $debt['principal_amount']
                ),
                'total' => $newTotal,
                'principal' => (float) $debt['principal_amount'],
            ];
        }

        return ['valid' => true, 'total' => $newTotal, 'principal' => (float) $debt['principal_amount']];
    }
}

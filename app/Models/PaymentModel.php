<?php

namespace App\Models;

use CodeIgniter\Model;

class PaymentModel extends Model
{
    protected $table            = 'payments';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'related_type',
        'related_id',
        'transaction_id',
        'date',
        'amount',
        'currency',
        'method',
        'notes',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'related_type' => 'required|in_list[installment,debt,milestone]',
        'related_id'   => 'required|integer',
        'date'         => 'required|valid_date',
        'amount'       => 'required|decimal',
        'currency'     => 'required|max_length[3]',
        'method'       => 'required|in_list[cash,bank,card,other]',
    ];

    protected $validationMessages = [
        'related_type' => [
            'required' => 'İlişkili kayıt tipi zorunludur.',
        ],
        'related_id' => [
            'required' => 'İlişkili kayıt zorunludur.',
        ],
        'date' => [
            'required' => 'Tarih zorunludur.',
        ],
        'amount' => [
            'required' => 'Tutar zorunludur.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get payments for a related item
     */
    public function getByRelated(string $type, int $relatedId): array
    {
        return $this->where('related_type', $type)
                    ->where('related_id', $relatedId)
                    ->orderBy('date', 'DESC')
                    ->findAll();
    }

    /**
     * Get payments for installment
     */
    public function getByInstallment(int $installmentId): array
    {
        return $this->getByRelated('installment', $installmentId);
    }

    /**
     * Get payments for debt
     */
    public function getByDebt(int $debtId): array
    {
        return $this->getByRelated('debt', $debtId);
    }

    /**
     * Get payments for milestone
     */
    public function getByMilestone(int $milestoneId): array
    {
        return $this->getByRelated('milestone', $milestoneId);
    }

    /**
     * Get all payments with related info
     */
    public function getAllWithDetails(): array
    {
        $payments = $this->orderBy('date', 'DESC')->findAll();

        foreach ($payments as &$payment) {
            $payment['related_info'] = $this->getRelatedInfo($payment);
        }

        return $payments;
    }

    /**
     * Get related info for a payment
     */
    public function getRelatedInfo(array $payment): ?array
    {
        switch ($payment['related_type']) {
            case 'installment':
                $installmentModel = new InstallmentModel();
                $installment = $installmentModel
                    ->select('installments.*, debts.kind, parties.name as party_name')
                    ->join('debts', 'debts.id = installments.debt_id')
                    ->join('parties', 'parties.id = debts.party_id', 'left')
                    ->where('installments.id', $payment['related_id'])
                    ->first();
                return $installment;

            case 'debt':
                $debtModel = new DebtModel();
                return $debtModel->getWithPartyById($payment['related_id']);

            case 'milestone':
                $milestoneModel = new ProjectMilestoneModel();
                return $milestoneModel
                    ->select('project_milestones.*, projects.title as project_title')
                    ->join('projects', 'projects.id = project_milestones.project_id')
                    ->where('project_milestones.id', $payment['related_id'])
                    ->first();

            default:
                return null;
        }
    }

    /**
     * Get total paid amount for a related item
     */
    public function getTotalPaid(string $type, int $relatedId): float
    {
        $result = $this->where('related_type', $type)
                       ->where('related_id', $relatedId)
                       ->selectSum('amount')
                       ->first();

        return (float) ($result['amount'] ?? 0);
    }

    /**
     * Get recent payments
     */
    public function getRecent(int $limit = 10): array
    {
        $payments = $this->orderBy('date', 'DESC')
                         ->limit($limit)
                         ->findAll();

        foreach ($payments as &$payment) {
            $payment['related_info'] = $this->getRelatedInfo($payment);
        }

        return $payments;
    }

    /**
     * Get method label
     */
    public static function getMethodLabel(string $method): string
    {
        return match($method) {
            'cash'  => 'Nakit',
            'bank'  => 'Banka',
            'card'  => 'Kredi Kartı',
            'other' => 'Diğer',
            default => $method,
        };
    }
}

<?php

namespace App\Models;

use CodeIgniter\Model;

class DebtModel extends Model
{
    protected $table            = 'debts';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'kind',
        'party_id',
        'principal_amount',
        'currency',
        'vat_rate',
        'start_date',
        'due_date',
        'status',
        'notes',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'kind'             => 'required|in_list[debt,receivable]',
        'party_id'         => 'required|integer',
        'principal_amount' => 'required|decimal',
        'currency'         => 'required|max_length[3]',
        'start_date'       => 'permit_empty|valid_date',
        'due_date'         => 'permit_empty|valid_date',
        'status'           => 'required|in_list[open,closed]',
    ];

    protected $validationMessages = [
        'kind' => [
            'required' => 'Borç/alacak tipi zorunludur.',
            'in_list'  => 'Geçersiz tip.',
        ],
        'party_id' => [
            'required' => 'Taraf seçimi zorunludur.',
        ],
        'principal_amount' => [
            'required' => 'Anapara tutarı zorunludur.',
            'decimal'  => 'Geçerli bir tutar giriniz.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get debts with party info
     */
    public function getWithParty(): array
    {
        return $this->select('debts.*, parties.name as party_name, parties.type as party_type')
                    ->join('parties', 'parties.id = debts.party_id', 'left')
                    ->orderBy('debts.due_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get single debt with party info
     */
    public function getWithPartyById(int $id): ?array
    {
        return $this->select('debts.*, parties.name as party_name, parties.type as party_type')
                    ->join('parties', 'parties.id = debts.party_id', 'left')
                    ->where('debts.id', $id)
                    ->first();
    }

    /**
     * Get open debts
     */
    public function getOpenDebts(): array
    {
        return $this->select('debts.*, parties.name as party_name')
                    ->join('parties', 'parties.id = debts.party_id', 'left')
                    ->where('debts.status', 'open')
                    ->where('debts.kind', 'debt')
                    ->orderBy('debts.due_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get open receivables
     */
    public function getOpenReceivables(): array
    {
        return $this->select('debts.*, parties.name as party_name')
                    ->join('parties', 'parties.id = debts.party_id', 'left')
                    ->where('debts.status', 'open')
                    ->where('debts.kind', 'receivable')
                    ->orderBy('debts.due_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get filtered debts
     */
    public function getFiltered(array $filters = []): array
    {
        $builder = $this->select('debts.*, parties.name as party_name')
                        ->join('parties', 'parties.id = debts.party_id', 'left');

        if (!empty($filters['kind'])) {
            $builder->where('debts.kind', $filters['kind']);
        }

        if (!empty($filters['status'])) {
            $builder->where('debts.status', $filters['status']);
        }

        if (!empty($filters['party_id'])) {
            $builder->where('debts.party_id', $filters['party_id']);
        }

        if (!empty($filters['currency'])) {
            $builder->where('debts.currency', $filters['currency']);
        }

        return $builder->orderBy('debts.due_date', 'ASC')->findAll();
    }

    /**
     * Calculate remaining amount for a debt
     */
    public function calculateRemainingAmount(int $debtId): float
    {
        $debt = $this->find($debtId);
        if (!$debt) {
            return 0;
        }

        $installmentModel = new InstallmentModel();
        $totalPaid = $installmentModel
            ->where('debt_id', $debtId)
            ->selectSum('paid_amount')
            ->first();

        $paidAmount = (float) ($totalPaid['paid_amount'] ?? 0);

        return (float) $debt['principal_amount'] - $paidAmount;
    }

    /**
     * Calculate paid amount for a debt
     */
    public function calculatePaidAmount(int $debtId): float
    {
        $installmentModel = new InstallmentModel();
        $totalPaid = $installmentModel
            ->where('debt_id', $debtId)
            ->selectSum('paid_amount')
            ->first();

        return (float) ($totalPaid['paid_amount'] ?? 0);
    }

    /**
     * Get total open debts by currency
     */
    public function getTotalOpenByCurrency(): array
    {
        $debts = $this->select('kind, currency, SUM(principal_amount) as total')
                      ->where('status', 'open')
                      ->groupBy(['kind', 'currency'])
                      ->findAll();

        $result = ['debt' => [], 'receivable' => []];
        foreach ($debts as $debt) {
            $result[$debt['kind']][$debt['currency']] = (float) $debt['total'];
        }

        return $result;
    }

    /**
     * Update debt status based on installments
     */
    public function updateStatusFromInstallments(int $debtId): bool
    {
        $debt = $this->find($debtId);
        if (!$debt) {
            return false;
        }

        $remainingAmount = $this->calculateRemainingAmount($debtId);

        if ($remainingAmount <= 0) {
            return $this->update($debtId, ['status' => 'closed']);
        }

        return true;
    }
}

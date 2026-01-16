<?php

namespace App\Models;

use CodeIgniter\Model;

class TransactionModel extends Model
{
    protected $table            = 'transactions';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'type',
        'party_id',
        'category_id',
        'project_id',
        'milestone_id',
        'date',
        'amount',
        'currency',
        'vat_rate',
        'vat_amount',
        'withholding_rate',
        'withholding_amount',
        'net_amount',
        'description',
        'ref_no',
        'document_path',
        'created_by',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'type'        => 'required|in_list[income,expense]',
        'date'        => 'required|valid_date',
        'amount'      => 'required|decimal',
        'currency'    => 'required|max_length[3]',
        'net_amount'  => 'required|decimal',
        'party_id'    => 'permit_empty|integer',
        'category_id' => 'permit_empty|integer',
        'project_id'  => 'permit_empty|integer',
    ];

    protected $validationMessages = [
        'type' => [
            'required' => 'İşlem tipi zorunludur.',
            'in_list'  => 'Geçersiz işlem tipi.',
        ],
        'date' => [
            'required'   => 'Tarih zorunludur.',
            'valid_date' => 'Geçerli bir tarih giriniz.',
        ],
        'amount' => [
            'required' => 'Tutar zorunludur.',
            'decimal'  => 'Geçerli bir tutar giriniz.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get transactions with related data
     */
    public function getWithRelations(): array
    {
        return $this->select('transactions.*,
                              parties.name as party_name,
                              categories.name as category_name,
                              projects.title as project_title,
                              users.name as created_by_name')
                    ->join('parties', 'parties.id = transactions.party_id', 'left')
                    ->join('categories', 'categories.id = transactions.category_id', 'left')
                    ->join('projects', 'projects.id = transactions.project_id', 'left')
                    ->join('users', 'users.id = transactions.created_by', 'left')
                    ->orderBy('transactions.date', 'DESC')
                    ->orderBy('transactions.id', 'DESC')
                    ->findAll();
    }

    /**
     * Get single transaction with related data
     */
    public function getWithRelationsById(int $id): ?array
    {
        return $this->select('transactions.*,
                              parties.name as party_name,
                              categories.name as category_name,
                              projects.title as project_title,
                              project_milestones.title as milestone_title,
                              users.name as created_by_name')
                    ->join('parties', 'parties.id = transactions.party_id', 'left')
                    ->join('categories', 'categories.id = transactions.category_id', 'left')
                    ->join('projects', 'projects.id = transactions.project_id', 'left')
                    ->join('project_milestones', 'project_milestones.id = transactions.milestone_id', 'left')
                    ->join('users', 'users.id = transactions.created_by', 'left')
                    ->where('transactions.id', $id)
                    ->first();
    }

    /**
     * Get filtered transactions
     */
    public function getFiltered(array $filters = []): array
    {
        $builder = $this->select('transactions.*,
                                  parties.name as party_name,
                                  categories.name as category_name,
                                  projects.title as project_title')
                        ->join('parties', 'parties.id = transactions.party_id', 'left')
                        ->join('categories', 'categories.id = transactions.category_id', 'left')
                        ->join('projects', 'projects.id = transactions.project_id', 'left');

        // Apply filters
        if (!empty($filters['type'])) {
            $builder->where('transactions.type', $filters['type']);
        }

        if (!empty($filters['category_id'])) {
            $builder->where('transactions.category_id', $filters['category_id']);
        }

        if (!empty($filters['party_id'])) {
            $builder->where('transactions.party_id', $filters['party_id']);
        }

        if (!empty($filters['project_id'])) {
            $builder->where('transactions.project_id', $filters['project_id']);
        }

        if (!empty($filters['currency'])) {
            $builder->where('transactions.currency', $filters['currency']);
        }

        if (!empty($filters['date_from'])) {
            $builder->where('transactions.date >=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $builder->where('transactions.date <=', $filters['date_to']);
        }

        return $builder->orderBy('transactions.date', 'DESC')
                       ->orderBy('transactions.id', 'DESC')
                       ->findAll();
    }

    /**
     * Get total by type
     */
    public function getTotalByType(string $type, ?string $currency = null): float
    {
        $builder = $this->where('type', $type);

        if ($currency) {
            $builder->where('currency', $currency);
        }

        $result = $builder->selectSum('net_amount')->first();

        return (float) ($result['net_amount'] ?? 0);
    }

    /**
     * Get totals by type and currency
     */
    public function getTotalsByCurrency(): array
    {
        return $this->select('type, currency, SUM(net_amount) as total')
                    ->groupBy(['type', 'currency'])
                    ->findAll();
    }

    /**
     * Get monthly totals
     */
    public function getMonthlyTotals(int $year): array
    {
        return $this->select("type, MONTH(date) as month, SUM(net_amount) as total, currency")
                    ->where("YEAR(date)", $year)
                    ->groupBy(['type', 'MONTH(date)', 'currency'])
                    ->orderBy('month', 'ASC')
                    ->findAll();
    }

    /**
     * Get recent transactions
     */
    public function getRecent(int $limit = 10): array
    {
        return $this->select('transactions.*, parties.name as party_name, categories.name as category_name')
                    ->join('parties', 'parties.id = transactions.party_id', 'left')
                    ->join('categories', 'categories.id = transactions.category_id', 'left')
                    ->orderBy('transactions.date', 'DESC')
                    ->orderBy('transactions.id', 'DESC')
                    ->limit($limit)
                    ->findAll();
    }

    /**
     * Calculate amounts (KDV, Stopaj, Net)
     */
    public static function calculateAmounts(
        float $amount,
        float $vatRate = 0,
        float $withholdingRate = 0,
        string $type = 'income'
    ): array {
        $vatAmount = $amount * ($vatRate / 100);
        $withholdingAmount = $amount * ($withholdingRate / 100);

        // For income: net = amount + vat - withholding
        // For expense: net = amount + vat (no withholding deduction)
        if ($type === 'income') {
            $netAmount = $amount + $vatAmount - $withholdingAmount;
        } else {
            $netAmount = $amount + $vatAmount;
        }

        return [
            'vat_amount'         => round($vatAmount, 2),
            'withholding_amount' => round($withholdingAmount, 2),
            'net_amount'         => round($netAmount, 2),
        ];
    }
}

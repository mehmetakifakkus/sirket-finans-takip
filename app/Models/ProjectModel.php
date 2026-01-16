<?php

namespace App\Models;

use CodeIgniter\Model;

class ProjectModel extends Model
{
    protected $table            = 'projects';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'party_id',
        'title',
        'contract_amount',
        'currency',
        'start_date',
        'end_date',
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
        'party_id'        => 'required|integer',
        'title'           => 'required|min_length[2]|max_length[255]',
        'contract_amount' => 'required|decimal',
        'currency'        => 'required|max_length[3]',
        'start_date'      => 'permit_empty|valid_date',
        'end_date'        => 'permit_empty|valid_date',
        'status'          => 'required|in_list[active,completed,cancelled,on_hold]',
    ];

    protected $validationMessages = [
        'party_id' => [
            'required' => 'Müşteri seçimi zorunludur.',
        ],
        'title' => [
            'required'   => 'Proje başlığı zorunludur.',
            'min_length' => 'Proje başlığı en az 2 karakter olmalıdır.',
        ],
        'contract_amount' => [
            'required' => 'Sözleşme tutarı zorunludur.',
            'decimal'  => 'Geçerli bir tutar giriniz.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get open/active projects
     */
    public function getOpenProjects(): array
    {
        return $this->where('status', 'active')->orderBy('start_date', 'DESC')->findAll();
    }

    /**
     * Get projects with party info
     */
    public function getWithParty(): array
    {
        return $this->select('projects.*, parties.name as party_name, parties.type as party_type')
                    ->join('parties', 'parties.id = projects.party_id', 'left')
                    ->orderBy('projects.created_at', 'DESC')
                    ->findAll();
    }

    /**
     * Get single project with party info
     */
    public function getWithPartyById(int $id): ?array
    {
        return $this->select('projects.*, parties.name as party_name, parties.type as party_type')
                    ->join('parties', 'parties.id = projects.party_id', 'left')
                    ->where('projects.id', $id)
                    ->first();
    }

    /**
     * Calculate project balance (collected vs contract)
     */
    public function calculateBalance(int $projectId): array
    {
        $project = $this->find($projectId);
        if (!$project) {
            return [
                'contract_amount' => 0,
                'collected_amount' => 0,
                'remaining_amount' => 0,
                'percentage' => 0,
            ];
        }

        $transactionModel = new TransactionModel();
        $collected = $transactionModel
            ->where('project_id', $projectId)
            ->where('type', 'income')
            ->selectSum('amount')
            ->first();

        $collectedAmount = (float) ($collected['amount'] ?? 0);
        $contractAmount = (float) $project['contract_amount'];
        $remainingAmount = $contractAmount - $collectedAmount;
        $percentage = $contractAmount > 0 ? ($collectedAmount / $contractAmount) * 100 : 0;

        return [
            'contract_amount' => $contractAmount,
            'collected_amount' => $collectedAmount,
            'remaining_amount' => $remainingAmount,
            'percentage' => round($percentage, 2),
            'currency' => $project['currency'],
        ];
    }

    /**
     * Get projects for dropdown
     */
    public function getForDropdown(): array
    {
        $projects = $this->select('projects.id, projects.title, parties.name as party_name')
                         ->join('parties', 'parties.id = projects.party_id', 'left')
                         ->where('projects.status', 'active')
                         ->orderBy('projects.title', 'ASC')
                         ->findAll();

        $result = [];
        foreach ($projects as $project) {
            $result[$project['id']] = "{$project['title']} ({$project['party_name']})";
        }
        return $result;
    }

    /**
     * Get projects by party
     */
    public function getByParty(int $partyId): array
    {
        return $this->where('party_id', $partyId)
                    ->orderBy('start_date', 'DESC')
                    ->findAll();
    }
}

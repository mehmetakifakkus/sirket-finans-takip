<?php

namespace App\Models;

use CodeIgniter\Model;

class ProjectMilestoneModel extends Model
{
    protected $table            = 'project_milestones';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'project_id',
        'title',
        'expected_date',
        'expected_amount',
        'currency',
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
        'project_id'      => 'required|integer',
        'title'           => 'required|min_length[2]|max_length[255]',
        'expected_date'   => 'permit_empty|valid_date',
        'expected_amount' => 'required|decimal',
        'currency'        => 'required|max_length[3]',
        'status'          => 'required|in_list[pending,completed,cancelled]',
    ];

    protected $validationMessages = [
        'project_id' => [
            'required' => 'Proje seçimi zorunludur.',
        ],
        'title' => [
            'required'   => 'Milestone başlığı zorunludur.',
            'min_length' => 'Başlık en az 2 karakter olmalıdır.',
        ],
        'expected_amount' => [
            'required' => 'Beklenen tutar zorunludur.',
            'decimal'  => 'Geçerli bir tutar giriniz.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get milestones by project
     */
    public function getByProject(int $projectId): array
    {
        return $this->where('project_id', $projectId)
                    ->orderBy('expected_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get pending milestones
     */
    public function getPendingMilestones(): array
    {
        return $this->where('status', 'pending')
                    ->orderBy('expected_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get pending milestones with project info
     */
    public function getPendingWithProject(): array
    {
        return $this->select('project_milestones.*, projects.title as project_title, parties.name as party_name')
                    ->join('projects', 'projects.id = project_milestones.project_id')
                    ->join('parties', 'parties.id = projects.party_id', 'left')
                    ->where('project_milestones.status', 'pending')
                    ->orderBy('project_milestones.expected_date', 'ASC')
                    ->findAll();
    }

    /**
     * Get upcoming milestones (due in next X days)
     */
    public function getUpcoming(int $days = 30): array
    {
        $futureDate = date('Y-m-d', strtotime("+{$days} days"));

        return $this->select('project_milestones.*, projects.title as project_title, parties.name as party_name')
                    ->join('projects', 'projects.id = project_milestones.project_id')
                    ->join('parties', 'parties.id = projects.party_id', 'left')
                    ->where('project_milestones.status', 'pending')
                    ->where('project_milestones.expected_date <=', $futureDate)
                    ->where('project_milestones.expected_date >=', date('Y-m-d'))
                    ->orderBy('project_milestones.expected_date', 'ASC')
                    ->findAll();
    }

    /**
     * Calculate collected amount for milestone
     */
    public function getCollectedAmount(int $milestoneId): float
    {
        $transactionModel = new TransactionModel();
        $result = $transactionModel
            ->where('milestone_id', $milestoneId)
            ->where('type', 'income')
            ->selectSum('amount')
            ->first();

        return (float) ($result['amount'] ?? 0);
    }

    /**
     * Get milestones for dropdown
     */
    public function getForDropdown(int $projectId): array
    {
        $milestones = $this->where('project_id', $projectId)
                           ->where('status', 'pending')
                           ->orderBy('expected_date', 'ASC')
                           ->findAll();

        $result = [];
        foreach ($milestones as $milestone) {
            $date = $milestone['expected_date'] ? date('d.m.Y', strtotime($milestone['expected_date'])) : '';
            $result[$milestone['id']] = "{$milestone['title']} ({$date})";
        }
        return $result;
    }
}

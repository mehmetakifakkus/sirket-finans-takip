<?php

namespace App\Models;

use App\Libraries\Database;

class MilestoneModel extends BaseModel
{
    protected string $table = 'project_milestones';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'project_id', 'title', 'expected_date', 'expected_amount',
        'currency', 'status', 'notes'
    ];

    /**
     * Get milestones by project
     */
    public function getByProject(int $projectId): array
    {
        return Database::query(
            "SELECT * FROM project_milestones WHERE project_id = ? ORDER BY expected_date ASC",
            [$projectId]
        );
    }

    /**
     * Get milestone with project info
     */
    public function getWithProject(int $id): ?array
    {
        $sql = "SELECT m.*, p.title as project_name
                FROM project_milestones m
                LEFT JOIN projects p ON p.id = m.project_id
                WHERE m.id = ?";

        return Database::queryOne($sql, [$id]);
    }

    /**
     * Check if milestone has related transactions
     */
    public function hasRelatedRecords(int $id): bool
    {
        $result = Database::queryOne(
            "SELECT COUNT(*) as cnt FROM transactions WHERE milestone_id = ?",
            [$id]
        );
        return ((int)($result['cnt'] ?? 0)) > 0;
    }
}

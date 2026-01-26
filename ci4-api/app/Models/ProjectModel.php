<?php

namespace App\Models;

use App\Libraries\Database;

class ProjectModel extends BaseModel
{
    protected string $table = 'projects';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'title', 'party_id', 'start_date', 'end_date',
        'contract_amount', 'currency', 'status', 'notes'
    ];

    /**
     * Get all projects with details
     */
    public function getAll(?string $status = null): array
    {
        $sql = "SELECT p.*, pt.name as party_name,
                (SELECT COUNT(*) FROM project_milestones WHERE project_id = p.id) as milestone_count,
                (SELECT COUNT(*) FROM transactions WHERE project_id = p.id) as transaction_count,
                (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE -net_amount END), 0) FROM transactions WHERE project_id = p.id) as balance
                FROM projects p
                LEFT JOIN parties pt ON pt.id = p.party_id";

        $params = [];
        if ($status) {
            $sql .= " WHERE p.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY p.start_date DESC";

        return Database::query($sql, $params);
    }

    /**
     * Get project with full details
     */
    public function getWithDetails(int $id): ?array
    {
        $sql = "SELECT p.*, pt.name as party_name
                FROM projects p
                LEFT JOIN parties pt ON pt.id = p.party_id
                WHERE p.id = ?";

        $project = Database::queryOne($sql, [$id]);

        if ($project) {
            // Get milestones
            $project['milestones'] = Database::query(
                "SELECT * FROM project_milestones WHERE project_id = ? ORDER BY expected_date ASC",
                [$id]
            );

            // Get grants
            $project['grants'] = Database::query(
                "SELECT * FROM project_grants WHERE project_id = ?",
                [$id]
            );

            // Get transaction summary
            $project['transaction_summary'] = Database::query(
                "SELECT type, COUNT(*) as count, SUM(net_amount) as total
                 FROM transactions WHERE project_id = ? GROUP BY type",
                [$id]
            );
        }

        return $project;
    }

    /**
     * Get count of incomplete projects
     */
    public function getIncompleteCount(): int
    {
        $result = Database::queryOne(
            "SELECT COUNT(*) as cnt FROM projects WHERE status NOT IN ('completed', 'cancelled')"
        );
        return (int)($result['cnt'] ?? 0);
    }

    /**
     * Check if project has related records
     */
    public function hasRelatedRecords(int $id): bool
    {
        $result = Database::queryOne(
            "SELECT COUNT(*) as cnt FROM transactions WHERE project_id = ?",
            [$id]
        );
        return ((int)($result['cnt'] ?? 0)) > 0;
    }

    /**
     * Unassign all transactions from a project
     */
    public function unassignTransactions(int $id): void
    {
        Database::execute(
            "UPDATE transactions SET project_id = NULL, milestone_id = NULL WHERE project_id = ?",
            [$id]
        );
    }
}

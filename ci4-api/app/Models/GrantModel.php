<?php

namespace App\Models;

use App\Libraries\Database;

class GrantModel extends BaseModel
{
    protected string $table = 'project_grants';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'project_id', 'provider_name', 'provider_type', 'funding_rate', 'funding_amount',
        'vat_excluded', 'approved_amount', 'received_amount', 'currency', 'status', 'notes'
    ];

    /**
     * Get all grants with project info
     */
    public function getAll(?string $providerType = null): array
    {
        $sql = "SELECT g.*, p.title as project_name
                FROM project_grants g
                LEFT JOIN projects p ON p.id = g.project_id";

        $params = [];
        if ($providerType) {
            $sql .= " WHERE g.provider_type = ?";
            $params[] = $providerType;
        }

        $sql .= " ORDER BY g.created_at DESC";

        return Database::query($sql, $params);
    }

    /**
     * Get grants by project
     */
    public function getByProject(int $projectId): array
    {
        return Database::query(
            "SELECT * FROM project_grants WHERE project_id = ? ORDER BY created_at DESC",
            [$projectId]
        );
    }

    /**
     * Get grant with project info
     */
    public function getWithProject(int $id): ?array
    {
        $sql = "SELECT g.*, p.title as project_name
                FROM project_grants g
                LEFT JOIN projects p ON p.id = g.project_id
                WHERE g.id = ?";

        return Database::queryOne($sql, [$id]);
    }

    /**
     * Calculate grant amount based on project expenses
     */
    public function calculateAmount(int $grantId): float
    {
        $grant = $this->find($grantId);
        if (!$grant) {
            return 0;
        }

        // Get total eligible expenses for the project
        $expenses = Database::queryOne(
            "SELECT SUM(net_amount) as total FROM transactions WHERE project_id = ? AND type = 'expense'",
            [$grant['project_id']]
        );

        $totalExpenses = (float)($expenses['total'] ?? 0);
        $calculatedAmount = $totalExpenses * (($grant['funding_rate'] ?? 0) / 100);

        // Apply max limit if set
        if (!empty($grant['funding_amount']) && $grant['funding_amount'] > 0 && $calculatedAmount > $grant['funding_amount']) {
            $calculatedAmount = (float)$grant['funding_amount'];
        }

        return $calculatedAmount;
    }

    /**
     * Get grant totals by provider type
     */
    public function getTotals(): array
    {
        return Database::query(
            "SELECT provider_type, COUNT(*) as count, SUM(approved_amount) as total_approved, SUM(received_amount) as total_received
             FROM project_grants GROUP BY provider_type"
        );
    }
}

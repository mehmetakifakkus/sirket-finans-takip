<?php

namespace App\Models;

use App\Libraries\Database;

class TransactionModel extends BaseModel
{
    protected string $table = 'transactions';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'type', 'party_id', 'category_id', 'project_id', 'milestone_id',
        'date', 'amount', 'insurance_amount', 'currency', 'vat_rate', 'vat_amount',
        'withholding_rate', 'withholding_amount', 'net_amount', 'base_amount',
        'description', 'ref_no', 'document_path', 'created_by'
    ];

    /**
     * Get filtered transactions
     */
    public function getFiltered(array $filters = []): array
    {
        $sql = "SELECT t.*, p.name as party_name, c.name as category_name,
                pr.title as project_name,
                (SELECT COUNT(*) FROM transaction_documents td WHERE td.transaction_id = t.id) as document_count
                FROM transactions t
                LEFT JOIN parties p ON p.id = t.party_id
                LEFT JOIN categories c ON c.id = t.category_id
                LEFT JOIN projects pr ON pr.id = t.project_id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['type'])) {
            $sql .= " AND t.type = ?";
            $params[] = $filters['type'];
        }
        if (!empty($filters['party_id'])) {
            $sql .= " AND t.party_id = ?";
            $params[] = $filters['party_id'];
        }
        if (!empty($filters['category_id'])) {
            $sql .= " AND t.category_id = ?";
            $params[] = $filters['category_id'];
        }
        if (!empty($filters['project_id'])) {
            $sql .= " AND t.project_id = ?";
            $params[] = $filters['project_id'];
        }
        if (!empty($filters['currency'])) {
            $sql .= " AND t.currency = ?";
            $params[] = $filters['currency'];
        }
        if (!empty($filters['start_date'])) {
            $sql .= " AND t.date >= ?";
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $sql .= " AND t.date <= ?";
            $params[] = $filters['end_date'];
        }
        if (!empty($filters['search'])) {
            $sql .= " AND (t.description LIKE ? OR t.ref_no LIKE ? OR p.name LIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'date';
        $sortOrder = strtoupper($filters['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $allowedSortFields = ['date', 'amount', 'net_amount', 'created_at'];
        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'date';
        }
        $sql .= " ORDER BY t.$sortBy $sortOrder";

        // Pagination
        if (!empty($filters['limit'])) {
            $sql .= " LIMIT " . (int)$filters['limit'];
            if (!empty($filters['offset'])) {
                $sql .= " OFFSET " . (int)$filters['offset'];
            }
        }

        return Database::query($sql, $params);
    }

    /**
     * Get transaction with details
     */
    public function getWithDetails(int $id): ?array
    {
        $sql = "SELECT t.*, p.name as party_name, c.name as category_name,
                pr.title as project_name, m.title as milestone_name,
                (SELECT COUNT(*) FROM transaction_documents td WHERE td.transaction_id = t.id) as document_count
                FROM transactions t
                LEFT JOIN parties p ON p.id = t.party_id
                LEFT JOIN categories c ON c.id = t.category_id
                LEFT JOIN projects pr ON pr.id = t.project_id
                LEFT JOIN project_milestones m ON m.id = t.milestone_id
                WHERE t.id = ?";

        $transaction = Database::queryOne($sql, [$id]);

        if ($transaction) {
            $transaction['documents'] = Database::query(
                "SELECT * FROM transaction_documents WHERE transaction_id = ?",
                [$id]
            );
        }

        return $transaction;
    }

    /**
     * Get unassigned transactions (no project)
     */
    public function getUnassigned(): array
    {
        $sql = "SELECT t.*, p.name as party_name, c.name as category_name,
                (SELECT COUNT(*) FROM transaction_documents td WHERE td.transaction_id = t.id) as document_count
                FROM transactions t
                LEFT JOIN parties p ON p.id = t.party_id
                LEFT JOIN categories c ON c.id = t.category_id
                WHERE t.project_id IS NULL
                ORDER BY t.date DESC";

        return Database::query($sql);
    }

    /**
     * Get transactions by project
     */
    public function getByProject(int $projectId): array
    {
        return Database::query(
            "SELECT * FROM transactions WHERE project_id = ? ORDER BY date DESC",
            [$projectId]
        );
    }

    /**
     * Assign transactions to project
     */
    public function assignToProject(array $transactionIds, int $projectId, ?int $milestoneId = null): int
    {
        if (empty($transactionIds)) {
            return 0;
        }

        $placeholders = implode(',', array_fill(0, count($transactionIds), '?'));
        $sql = "UPDATE transactions SET project_id = ?";
        $params = [$projectId];

        if ($milestoneId) {
            $sql .= ", milestone_id = ?";
            $params[] = $milestoneId;
        }

        $sql .= ", updated_at = ? WHERE id IN ($placeholders)";
        $params[] = date('Y-m-d H:i:s');
        $params = array_merge($params, $transactionIds);

        Database::execute($sql, $params);
        return count($transactionIds);
    }

    /**
     * Export transactions to CSV
     */
    public function exportCsv(array $filters = []): string
    {
        $transactions = $this->getFiltered($filters);

        $csv = "\xEF\xBB\xBF"; // UTF-8 BOM
        $csv .= "Tarih,Tip,Taraf,Kategori,Proje,Tutar,Para Birimi,KDV,Stopaj,Net Tutar,Açıklama,Referans No\n";

        foreach ($transactions as $t) {
            $csv .= sprintf(
                "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                $t['date'],
                $t['type'] === 'income' ? 'Gelir' : 'Gider',
                $this->escapeCsv($t['party_name'] ?? ''),
                $this->escapeCsv($t['category_name'] ?? ''),
                $this->escapeCsv($t['project_name'] ?? ''),
                $t['amount'],
                $t['currency'],
                $t['vat_amount'] ?? 0,
                $t['withholding_amount'] ?? 0,
                $t['net_amount'],
                $this->escapeCsv($t['description'] ?? ''),
                $this->escapeCsv($t['ref_no'] ?? '')
            );
        }

        return $csv;
    }

    /**
     * Get count of transactions
     */
    public function getCount(array $filters = []): int
    {
        $sql = "SELECT COUNT(*) as cnt FROM transactions WHERE 1=1";
        $params = [];

        if (!empty($filters['type'])) {
            $sql .= " AND type = ?";
            $params[] = $filters['type'];
        }
        if (!empty($filters['party_id'])) {
            $sql .= " AND party_id = ?";
            $params[] = $filters['party_id'];
        }
        if (!empty($filters['start_date'])) {
            $sql .= " AND date >= ?";
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $sql .= " AND date <= ?";
            $params[] = $filters['end_date'];
        }

        $result = Database::queryOne($sql, $params);
        return (int)($result['cnt'] ?? 0);
    }
}

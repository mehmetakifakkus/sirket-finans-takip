<?php

namespace App\Models;

use App\Libraries\Database;

class DebtModel extends BaseModel
{
    protected string $table = 'debts';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'kind', 'party_id', 'principal_amount', 'currency', 'vat_rate',
        'start_date', 'due_date', 'status', 'notes'
    ];

    /**
     * Get filtered debts
     */
    public function getFiltered(array $filters = []): array
    {
        $sql = "SELECT d.*, p.name as party_name,
                (SELECT COUNT(*) FROM installments WHERE debt_id = d.id) as installment_count,
                (SELECT COUNT(*) FROM installments WHERE debt_id = d.id AND status = 'paid') as paid_installment_count,
                (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as paid_amount
                FROM debts d
                LEFT JOIN parties p ON p.id = d.party_id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['type']) || !empty($filters['kind'])) {
            $sql .= " AND d.kind = ?";
            $params[] = $filters['type'] ?? $filters['kind'];
        }
        if (!empty($filters['party_id'])) {
            $sql .= " AND d.party_id = ?";
            $params[] = $filters['party_id'];
        }
        if (!empty($filters['status'])) {
            $sql .= " AND d.status = ?";
            $params[] = $filters['status'];
        }
        if (!empty($filters['currency'])) {
            $sql .= " AND d.currency = ?";
            $params[] = $filters['currency'];
        }
        if (!empty($filters['start_date'])) {
            $sql .= " AND d.start_date >= ?";
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $sql .= " AND d.start_date <= ?";
            $params[] = $filters['end_date'];
        }
        if (!empty($filters['search'])) {
            $sql .= " AND (d.notes LIKE ? OR p.name LIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'due_date';
        $sortOrder = strtoupper($filters['sort_order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
        $allowedSortFields = ['start_date', 'due_date', 'principal_amount', 'created_at'];
        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'due_date';
        }
        $sql .= " ORDER BY d.$sortBy $sortOrder";

        return Database::query($sql, $params);
    }

    /**
     * Get debt with installments
     */
    public function getWithInstallments(int $id): ?array
    {
        $sql = "SELECT d.*, p.name as party_name
                FROM debts d
                LEFT JOIN parties p ON p.id = d.party_id
                WHERE d.id = ?";

        $debt = Database::queryOne($sql, [$id]);

        if ($debt) {
            $debt['installments'] = Database::query(
                "SELECT * FROM installments WHERE debt_id = ? ORDER BY due_date ASC",
                [$id]
            );
        }

        return $debt;
    }

    /**
     * Update paid amounts and status
     */
    public function updatePaidAmount(int $id): bool
    {
        $debt = $this->find($id);
        if (!$debt) {
            return false;
        }

        // Get total paid from installments
        $paidResult = Database::queryOne(
            "SELECT COALESCE(SUM(paid_amount), 0) as total FROM installments WHERE debt_id = ?",
            [$id]
        );
        $paid = (float)($paidResult['total'] ?? 0);

        // Calculate VAT
        $vatAmount = (float)$debt['principal_amount'] * ((float)$debt['vat_rate'] / 100);
        $totalAmount = (float)$debt['principal_amount'] + $vatAmount;

        // Determine status
        $status = ($paid >= $totalAmount) ? 'closed' : 'open';

        return Database::execute(
            "UPDATE debts SET status = ?, updated_at = ? WHERE id = ?",
            [$status, date('Y-m-d H:i:s'), $id]
        );
    }

    /**
     * Export debts to CSV
     */
    public function exportCsv(array $filters = []): string
    {
        $debts = $this->getFiltered($filters);

        $csv = "\xEF\xBB\xBF"; // UTF-8 BOM
        $csv .= "Tarih,Vade,Tip,Taraf,Tutar,KDV,Para Birimi,Durum,Notlar\n";

        foreach ($debts as $d) {
            $csv .= sprintf(
                "%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                $d['start_date'],
                $d['due_date'],
                $d['kind'] === 'debt' ? 'Borç' : 'Alacak',
                $this->escapeCsv($d['party_name'] ?? ''),
                $d['principal_amount'],
                $d['vat_rate'],
                $d['currency'],
                $this->getStatusLabel($d['status']),
                $this->escapeCsv($d['notes'] ?? '')
            );
        }

        return $csv;
    }

    private function getStatusLabel(string $status): string
    {
        $labels = [
            'open' => 'Açık',
            'closed' => 'Kapalı'
        ];
        return $labels[$status] ?? $status;
    }
}

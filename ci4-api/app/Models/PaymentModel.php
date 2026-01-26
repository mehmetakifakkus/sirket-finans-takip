<?php

namespace App\Models;

use App\Libraries\Database;

class PaymentModel extends BaseModel
{
    protected string $table = 'payments';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'related_type', 'related_id', 'transaction_id', 'date',
        'amount', 'currency', 'method', 'notes'
    ];

    /**
     * Get filtered payments
     */
    public function getFiltered(array $filters = []): array
    {
        $sql = "SELECT p.*,
                CASE
                    WHEN p.related_type = 'installment' THEN i.notes
                    WHEN p.related_type = 'debt' THEN d.notes
                    ELSE NULL
                END as related_description,
                CASE
                    WHEN p.related_type = 'installment' THEN d2.kind
                    WHEN p.related_type = 'debt' THEN d.kind
                    ELSE NULL
                END as debt_type,
                COALESCE(pa1.name, pa2.name) as party_name
                FROM payments p
                LEFT JOIN installments i ON p.related_type = 'installment' AND i.id = p.related_id
                LEFT JOIN debts d ON p.related_type = 'debt' AND d.id = p.related_id
                LEFT JOIN debts d2 ON i.debt_id = d2.id
                LEFT JOIN parties pa1 ON d.party_id = pa1.id
                LEFT JOIN parties pa2 ON d2.party_id = pa2.id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['related_type'])) {
            $sql .= " AND p.related_type = ?";
            $params[] = $filters['related_type'];
        }
        if (!empty($filters['related_id'])) {
            $sql .= " AND p.related_id = ?";
            $params[] = $filters['related_id'];
        }
        if (!empty($filters['start_date'])) {
            $sql .= " AND p.date >= ?";
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $sql .= " AND p.date <= ?";
            $params[] = $filters['end_date'];
        }

        $sql .= " ORDER BY p.date DESC";

        return Database::query($sql, $params);
    }

    /**
     * Get payments by installment
     */
    public function getByInstallment(int $installmentId): array
    {
        return Database::query(
            "SELECT * FROM payments WHERE related_type = 'installment' AND related_id = ? ORDER BY date DESC",
            [$installmentId]
        );
    }

    /**
     * Get payments by debt
     */
    public function getByDebt(int $debtId): array
    {
        return Database::query(
            "SELECT * FROM payments WHERE related_type = 'debt' AND related_id = ? ORDER BY date DESC",
            [$debtId]
        );
    }

    /**
     * Record a payment for an installment
     */
    public function recordInstallmentPayment(int $installmentId, float $amount, string $currency, ?string $date = null): int|false
    {
        $data = [
            'related_type' => 'installment',
            'related_id' => $installmentId,
            'amount' => $amount,
            'currency' => $currency,
            'date' => $date ?? date('Y-m-d'),
            'method' => 'bank'
        ];

        return $this->insert($data);
    }
}

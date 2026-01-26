<?php

namespace App\Models;

use App\Libraries\Database;

class InstallmentModel extends BaseModel
{
    protected string $table = 'installments';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'debt_id', 'due_date', 'amount', 'currency',
        'status', 'paid_amount', 'notes'
    ];

    /**
     * Get installments by debt
     */
    public function getByDebt(int $debtId): array
    {
        return Database::query(
            "SELECT * FROM installments WHERE debt_id = ? ORDER BY due_date ASC",
            [$debtId]
        );
    }

    /**
     * Get installment with debt info
     */
    public function getWithDebt(int $id): ?array
    {
        $sql = "SELECT i.*, d.kind as debt_type, d.currency as debt_currency, d.notes as debt_description, p.name as party_name
                FROM installments i
                LEFT JOIN debts d ON d.id = i.debt_id
                LEFT JOIN parties p ON p.id = d.party_id
                WHERE i.id = ?";

        return Database::queryOne($sql, [$id]);
    }

    /**
     * Mark installment as paid
     */
    public function markAsPaid(int $id, ?float $paidAmount = null): bool
    {
        $installment = $this->find($id);
        if (!$installment) {
            return false;
        }

        $amount = $paidAmount ?? (float)$installment['amount'];

        return $this->update($id, [
            'status' => 'paid',
            'paid_amount' => $amount
        ]);
    }

    /**
     * Mark installment as unpaid
     */
    public function markAsUnpaid(int $id): bool
    {
        return $this->update($id, [
            'status' => 'pending',
            'paid_amount' => 0
        ]);
    }

    /**
     * Create multiple installments for a debt
     */
    public function createInstallments(int $debtId, float $totalAmount, int $count, string $startDate, string $currency = 'TRY'): array
    {
        $amount = round($totalAmount / $count, 2);
        $remainder = $totalAmount - ($amount * $count);

        $installments = [];
        $currentDate = new \DateTime($startDate);

        for ($i = 1; $i <= $count; $i++) {
            $installmentAmount = $amount;
            // Add remainder to last installment
            if ($i === $count) {
                $installmentAmount += $remainder;
            }

            $data = [
                'debt_id' => $debtId,
                'due_date' => $currentDate->format('Y-m-d'),
                'amount' => $installmentAmount,
                'currency' => $currency,
                'status' => 'pending',
                'paid_amount' => 0
            ];

            $id = $this->insert($data);
            $data['id'] = $id;
            $installments[] = $data;

            $currentDate->modify('+1 month');
        }

        return $installments;
    }

    /**
     * Get upcoming installments
     */
    public function getUpcoming(int $days = 30): array
    {
        $endDate = date('Y-m-d', strtotime("+{$days} days"));

        $sql = "SELECT i.*, d.kind as debt_type, d.currency as debt_currency, p.name as party_name
                FROM installments i
                LEFT JOIN debts d ON d.id = i.debt_id
                LEFT JOIN parties p ON p.id = d.party_id
                WHERE i.status = 'pending' AND i.due_date <= ?
                ORDER BY i.due_date ASC";

        return Database::query($sql, [$endDate]);
    }
}

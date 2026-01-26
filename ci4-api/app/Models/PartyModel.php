<?php

namespace App\Models;

use App\Libraries\Database;

class PartyModel extends BaseModel
{
    protected string $table = 'parties';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'name', 'type', 'tax_no', 'phone', 'email', 'address', 'notes',
        'grant_rate', 'grant_limit', 'vat_included'
    ];

    /**
     * Get all parties with statistics
     */
    public function getWithStats(?string $type = null): array
    {
        $sql = "SELECT p.*,
                (SELECT COUNT(*) FROM transactions WHERE party_id = p.id) as transaction_count,
                (SELECT COUNT(*) FROM debts WHERE party_id = p.id) as debt_count,
                (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE -net_amount END), 0) FROM transactions WHERE party_id = p.id) as balance
                FROM parties p";

        $params = [];
        if ($type) {
            $sql .= " WHERE p.type = ?";
            $params[] = $type;
        }

        $sql .= " ORDER BY p.name ASC";

        return Database::query($sql, $params);
    }

    /**
     * Get party by ID with details
     */
    public function getWithDetails(int $id): ?array
    {
        $sql = "SELECT p.*,
                (SELECT COUNT(*) FROM transactions WHERE party_id = p.id) as transaction_count,
                (SELECT COUNT(*) FROM debts WHERE party_id = p.id) as debt_count
                FROM parties p WHERE p.id = ?";

        return Database::queryOne($sql, [$id]);
    }

    /**
     * Check if party has related records
     */
    public function hasRelatedRecords(int $id): bool
    {
        $result = Database::queryOne(
            "SELECT
                (SELECT COUNT(*) FROM transactions WHERE party_id = ?) +
                (SELECT COUNT(*) FROM debts WHERE party_id = ?) as total",
            [$id, $id]
        );
        return ((int)($result['total'] ?? 0)) > 0;
    }

    /**
     * Get remaining grant amount for a party
     */
    public function getRemainingGrant(int $partyId): ?float
    {
        $party = $this->find($partyId);
        if (!$party || !$party['grant_limit']) {
            return null;
        }

        // Calculate total expenses with this party (VAT excluded if vat_included = 0)
        $vatIncluded = (int)($party['vat_included'] ?? 1);

        if ($vatIncluded) {
            // Use net_amount (includes VAT)
            $sql = "SELECT COALESCE(SUM(net_amount), 0) as total
                    FROM transactions
                    WHERE party_id = ? AND type = 'expense'";
        } else {
            // Use amount without VAT
            $sql = "SELECT COALESCE(SUM(amount), 0) as total
                    FROM transactions
                    WHERE party_id = ? AND type = 'expense'";
        }

        $result = Database::queryOne($sql, [$partyId]);
        $totalExpenses = (float)($result['total'] ?? 0);

        // Calculate used grant amount
        $grantRate = (float)($party['grant_rate'] ?? 0);
        $usedAmount = $totalExpenses * $grantRate;

        return (float)$party['grant_limit'] - $usedAmount;
    }

    /**
     * Merge parties
     */
    public function mergeParties(int $sourceId, int $targetId): bool
    {
        $db = Database::connect();
        try {
            $db->beginTransaction();

            // Update transactions
            Database::execute(
                "UPDATE transactions SET party_id = ? WHERE party_id = ?",
                [$targetId, $sourceId]
            );

            // Update debts
            Database::execute(
                "UPDATE debts SET party_id = ? WHERE party_id = ?",
                [$targetId, $sourceId]
            );

            // Delete source party
            Database::execute(
                "DELETE FROM parties WHERE id = ?",
                [$sourceId]
            );

            $db->commit();
            return true;
        } catch (\Exception $e) {
            $db->rollBack();
            return false;
        }
    }
}

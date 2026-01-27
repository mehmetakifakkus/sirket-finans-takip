<?php

namespace App\Models;

use App\Libraries\Database;

class TemplateModel extends BaseModel
{
    protected string $table = 'transaction_templates';

    protected array $fillable = [
        'name',
        'type',
        'category_id',
        'party_id',
        'amount',
        'currency',
        'vat_rate',
        'withholding_rate',
        'description',
        'recurrence',
        'next_date',
        'is_active'
    ];

    /**
     * Get all templates with optional filters
     */
    public function getAll(array $filters = []): array
    {
        $sql = "SELECT t.*, c.name as category_name, p.name as party_name
                FROM {$this->table} t
                LEFT JOIN categories c ON t.category_id = c.id
                LEFT JOIN parties p ON t.party_id = p.id
                WHERE 1=1";
        $params = [];

        if (isset($filters['type']) && $filters['type']) {
            $sql .= " AND t.type = ?";
            $params[] = $filters['type'];
        }

        if (isset($filters['is_active'])) {
            $sql .= " AND t.is_active = ?";
            $params[] = (int)$filters['is_active'];
        }

        if (isset($filters['recurrence']) && $filters['recurrence']) {
            $sql .= " AND t.recurrence = ?";
            $params[] = $filters['recurrence'];
        }

        $sql .= " ORDER BY t.name ASC";

        return Database::query($sql, $params);
    }

    /**
     * Get single template by ID
     */
    public function getById(int $id): ?array
    {
        $result = Database::queryOne(
            "SELECT t.*, c.name as category_name, p.name as party_name
             FROM {$this->table} t
             LEFT JOIN categories c ON t.category_id = c.id
             LEFT JOIN parties p ON t.party_id = p.id
             WHERE t.id = ?",
            [$id]
        );

        return $result ?: null;
    }

    /**
     * Create new template
     */
    public function create(array $data): int
    {
        $fields = [];
        $placeholders = [];
        $values = [];

        foreach ($this->fillable as $field) {
            if (isset($data[$field])) {
                $fields[] = $field;
                $placeholders[] = '?';
                $values[] = $data[$field];
            }
        }

        // Add created_at
        $fields[] = 'created_at';
        $placeholders[] = '?';
        $values[] = date('Y-m-d H:i:s');

        $sql = "INSERT INTO {$this->table} (" . implode(', ', $fields) . ")
                VALUES (" . implode(', ', $placeholders) . ")";

        Database::execute($sql, $values);

        return (int)Database::lastInsertId();
    }

    /**
     * Update template
     */
    public function update(int $id, array $data): bool
    {
        $sets = [];
        $values = [];

        foreach ($this->fillable as $field) {
            if (array_key_exists($field, $data)) {
                $sets[] = "$field = ?";
                $values[] = $data[$field];
            }
        }

        if (empty($sets)) {
            return false;
        }

        $values[] = $id;
        $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE id = ?";

        return Database::execute($sql, $values) !== false;
    }

    /**
     * Delete template
     */
    public function delete(int $id): bool
    {
        return Database::execute(
            "DELETE FROM {$this->table} WHERE id = ?",
            [$id]
        ) !== false;
    }

    /**
     * Get templates that are due (based on next_date)
     */
    public function getDue(): array
    {
        $today = date('Y-m-d');

        return Database::query(
            "SELECT t.*, c.name as category_name, p.name as party_name
             FROM {$this->table} t
             LEFT JOIN categories c ON t.category_id = c.id
             LEFT JOIN parties p ON t.party_id = p.id
             WHERE t.is_active = 1
             AND t.recurrence != 'none'
             AND t.next_date IS NOT NULL
             AND t.next_date <= ?
             ORDER BY t.next_date ASC",
            [$today]
        );
    }

    /**
     * Update next_date based on recurrence
     */
    public function updateNextDate(int $id): bool
    {
        $template = $this->getById($id);
        if (!$template || $template['recurrence'] === 'none' || !$template['next_date']) {
            return false;
        }

        $currentDate = new \DateTime($template['next_date']);

        switch ($template['recurrence']) {
            case 'daily':
                $currentDate->modify('+1 day');
                break;
            case 'weekly':
                $currentDate->modify('+1 week');
                break;
            case 'monthly':
                $currentDate->modify('+1 month');
                break;
            case 'yearly':
                $currentDate->modify('+1 year');
                break;
            default:
                return false;
        }

        return $this->update($id, ['next_date' => $currentDate->format('Y-m-d')]);
    }
}

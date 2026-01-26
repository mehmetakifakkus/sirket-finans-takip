<?php

namespace App\Models;

use App\Libraries\Database;
use PDO;

abstract class BaseModel
{
    protected string $table = '';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [];
    protected bool $useTimestamps = true;
    protected string $createdField = 'created_at';
    protected string $updatedField = 'updated_at';

    /**
     * Get PDO connection
     */
    protected function db(): PDO
    {
        return Database::connect();
    }

    /**
     * Find by ID
     */
    public function find($id): ?array
    {
        return Database::queryOne(
            "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?",
            [$id]
        );
    }

    /**
     * Find all records
     */
    public function findAll(): array
    {
        return Database::query("SELECT * FROM {$this->table}");
    }

    /**
     * Insert a new record
     */
    public function insert(array $data): int|false
    {
        // Add timestamps
        if ($this->useTimestamps) {
            $now = date('Y-m-d H:i:s');
            if (!isset($data[$this->createdField])) {
                $data[$this->createdField] = $now;
            }
            if (!isset($data[$this->updatedField])) {
                $data[$this->updatedField] = $now;
            }
        }

        // Filter allowed fields
        $filteredData = array_intersect_key($data, array_flip($this->allowedFields));

        // Keep timestamp fields even if not in allowedFields
        if ($this->useTimestamps) {
            if (isset($data[$this->createdField])) {
                $filteredData[$this->createdField] = $data[$this->createdField];
            }
            if (isset($data[$this->updatedField])) {
                $filteredData[$this->updatedField] = $data[$this->updatedField];
            }
        }

        return Database::insert($this->table, $filteredData);
    }

    /**
     * Update a record
     */
    public function update($id, array $data): bool
    {
        // Add updated timestamp
        if ($this->useTimestamps) {
            $data[$this->updatedField] = date('Y-m-d H:i:s');
        }

        // Filter allowed fields
        $filteredData = array_intersect_key($data, array_flip($this->allowedFields));

        // Keep updated_at
        if ($this->useTimestamps && isset($data[$this->updatedField])) {
            $filteredData[$this->updatedField] = $data[$this->updatedField];
        }

        return Database::update($this->table, $filteredData, "{$this->primaryKey} = ?", [$id]);
    }

    /**
     * Delete a record
     */
    public function delete($id): bool
    {
        return Database::delete($this->table, "{$this->primaryKey} = ?", [$id]);
    }

    /**
     * Count all records
     */
    public function countAll(): int
    {
        return Database::count($this->table);
    }

    /**
     * Count with condition
     */
    public function countWhere(string $where, array $params = []): int
    {
        $result = Database::queryOne(
            "SELECT COUNT(*) as cnt FROM {$this->table} WHERE $where",
            $params
        );
        return (int)($result['cnt'] ?? 0);
    }

    /**
     * Find with where clause
     */
    public function where(string $column, $value): static
    {
        $this->whereClause = "$column = ?";
        $this->whereParams = [$value];
        return $this;
    }

    /**
     * Find with whereIn clause
     */
    public function whereIn(string $column, array $values): static
    {
        $placeholders = implode(',', array_fill(0, count($values), '?'));
        $this->whereClause = "$column IN ($placeholders)";
        $this->whereParams = $values;
        return $this;
    }

    protected string $whereClause = '';
    protected array $whereParams = [];
    protected string $orderByClause = '';

    /**
     * Order by
     */
    public function orderBy(string $column, string $direction = 'ASC'): static
    {
        $this->orderByClause = "ORDER BY $column $direction";
        return $this;
    }

    /**
     * Execute query chain for findAll
     */
    public function get(): array
    {
        $sql = "SELECT * FROM {$this->table}";
        if ($this->whereClause) {
            $sql .= " WHERE {$this->whereClause}";
        }
        if ($this->orderByClause) {
            $sql .= " {$this->orderByClause}";
        }

        $result = Database::query($sql, $this->whereParams);

        // Reset clauses
        $this->whereClause = '';
        $this->whereParams = [];
        $this->orderByClause = '';

        return $result;
    }

    /**
     * Set data for update in chain
     */
    public function set(array $data): static
    {
        $this->setData = $data;
        return $this;
    }

    protected array $setData = [];

    /**
     * Execute update in chain
     */
    public function chainUpdate(): int
    {
        if (empty($this->setData) || empty($this->whereClause)) {
            return 0;
        }

        // Add updated timestamp
        if ($this->useTimestamps) {
            $this->setData[$this->updatedField] = date('Y-m-d H:i:s');
        }

        $setClauses = [];
        $params = [];
        foreach ($this->setData as $key => $value) {
            if (in_array($key, $this->allowedFields) || $key === $this->updatedField) {
                $setClauses[] = "$key = ?";
                $params[] = $value;
            }
        }

        if (empty($setClauses)) {
            return 0;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $setClauses) . " WHERE {$this->whereClause}";
        $params = array_merge($params, $this->whereParams);

        Database::execute($sql, $params);
        $affected = Database::connect()->query("SELECT ROW_COUNT()")->fetchColumn();

        // Reset
        $this->setData = [];
        $this->whereClause = '';
        $this->whereParams = [];

        return (int)$affected;
    }

    /**
     * Execute delete in chain
     */
    public function chainDelete(): bool
    {
        if (empty($this->whereClause)) {
            return false;
        }

        $sql = "DELETE FROM {$this->table} WHERE {$this->whereClause}";
        Database::execute($sql, $this->whereParams);

        // Reset
        $this->whereClause = '';
        $this->whereParams = [];

        return true;
    }

    /**
     * Escape CSV field helper
     */
    protected function escapeCsv(?string $value): string
    {
        if ($value === null) {
            return '';
        }
        if (strpos($value, ',') !== false || strpos($value, '"') !== false || strpos($value, "\n") !== false) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }
}

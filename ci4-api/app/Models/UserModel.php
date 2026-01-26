<?php

namespace App\Models;

use App\Libraries\Database;

class UserModel extends BaseModel
{
    protected string $table = 'users';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'email', 'password', 'name', 'role', 'status'
    ];

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?array
    {
        return Database::queryOne(
            "SELECT * FROM users WHERE email = ?",
            [$email]
        );
    }

    /**
     * Get all users (without password)
     */
    public function getAllUsers(): array
    {
        return Database::query(
            "SELECT id, email, name, role, status, created_at, updated_at FROM users ORDER BY name ASC"
        );
    }

    /**
     * Get single user (without password)
     */
    public function getUserById(int $id): ?array
    {
        return Database::queryOne(
            "SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE id = ?",
            [$id]
        );
    }

    /**
     * Check if email exists (excluding given id)
     */
    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        $sql = "SELECT COUNT(*) as cnt FROM users WHERE email = ?";
        $params = [$email];

        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }

        $result = Database::queryOne($sql, $params);
        return ((int)($result['cnt'] ?? 0)) > 0;
    }
}

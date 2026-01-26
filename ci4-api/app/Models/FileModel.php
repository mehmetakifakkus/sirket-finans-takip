<?php

namespace App\Models;

use App\Libraries\Database;

class FileModel extends BaseModel
{
    protected string $table = 'files';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'name', 'original_name', 'file_path', 'file_type', 'file_size',
        'category', 'description', 'created_by'
    ];

    /**
     * Get all files
     */
    public function getAll(array $filters = []): array
    {
        $sql = "SELECT * FROM files WHERE 1=1";
        $params = [];

        if (!empty($filters['category'])) {
            $sql .= " AND category = ?";
            $params[] = $filters['category'];
        }
        if (!empty($filters['search'])) {
            $sql .= " AND (name LIKE ? OR original_name LIKE ? OR description LIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        $sql .= " ORDER BY created_at DESC";

        return Database::query($sql, $params);
    }

    /**
     * Get file with creator info
     */
    public function getWithCreator(int $id): ?array
    {
        $sql = "SELECT f.*, u.name as creator_name
                FROM files f
                LEFT JOIN users u ON u.id = f.created_by
                WHERE f.id = ?";

        return Database::queryOne($sql, [$id]);
    }
}

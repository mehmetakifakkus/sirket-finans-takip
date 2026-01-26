<?php

namespace App\Models;

use App\Libraries\Database;

class CategoryModel extends BaseModel
{
    protected string $table = 'categories';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'name', 'type', 'parent_id', 'description', 'is_active', 'created_by'
    ];

    /**
     * Get all categories with parent info
     */
    public function getAll(?string $type = null): array
    {
        $sql = "SELECT c.*, pc.name as parent_name
                FROM categories c
                LEFT JOIN categories pc ON pc.id = c.parent_id";

        $params = [];
        if ($type) {
            $sql .= " WHERE c.type = ?";
            $params[] = $type;
        }

        $sql .= " ORDER BY c.type ASC, c.parent_id ASC, c.name ASC";

        return Database::query($sql, $params);
    }

    /**
     * Get categories by type
     */
    public function getByType(string $type): array
    {
        return Database::query(
            "SELECT * FROM categories WHERE type = ? AND is_active = 1 ORDER BY name ASC",
            [$type]
        );
    }

    /**
     * Get category tree structure
     */
    public function getTree(?string $type = null): array
    {
        $sql = "SELECT * FROM categories";
        $params = [];

        if ($type) {
            $sql .= " WHERE type = ?";
            $params[] = $type;
        }

        $sql .= " ORDER BY name ASC";
        $categories = Database::query($sql, $params);

        return $this->buildTree($categories);
    }

    /**
     * Build hierarchical tree from flat array
     */
    private function buildTree(array $categories, ?int $parentId = null): array
    {
        $tree = [];
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $children = $this->buildTree($categories, (int)$category['id']);
                if ($children) {
                    $category['children'] = $children;
                }
                $tree[] = $category;
            }
        }
        return $tree;
    }

    /**
     * Check if category has related records
     */
    public function hasRelatedRecords(int $id): bool
    {
        $result = Database::queryOne(
            "SELECT
                (SELECT COUNT(*) FROM transactions WHERE category_id = ?) +
                (SELECT COUNT(*) FROM categories WHERE parent_id = ?) as total",
            [$id, $id]
        );
        return ((int)($result['total'] ?? 0)) > 0;
    }

    /**
     * Merge categories
     */
    public function mergeCategories(int $sourceId, int $targetId): bool
    {
        $db = Database::connect();
        try {
            $db->beginTransaction();

            // Update transactions
            Database::execute(
                "UPDATE transactions SET category_id = ? WHERE category_id = ?",
                [$targetId, $sourceId]
            );

            // Update children
            Database::execute(
                "UPDATE categories SET parent_id = ? WHERE parent_id = ?",
                [$targetId, $sourceId]
            );

            // Delete source
            Database::execute(
                "DELETE FROM categories WHERE id = ?",
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

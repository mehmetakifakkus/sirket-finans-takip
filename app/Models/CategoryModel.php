<?php

namespace App\Models;

use CodeIgniter\Model;

class CategoryModel extends Model
{
    protected $table            = 'categories';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'name',
        'type',
        'parent_id',
        'is_active',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'name'      => 'required|min_length[2]|max_length[100]',
        'type'      => 'required|in_list[income,expense]',
        'parent_id' => 'permit_empty|integer',
        'is_active' => 'permit_empty|in_list[0,1]',
    ];

    protected $validationMessages = [
        'name' => [
            'required'   => 'Kategori adı zorunludur.',
            'min_length' => 'Kategori adı en az 2 karakter olmalıdır.',
        ],
        'type' => [
            'required' => 'Kategori tipi zorunludur.',
            'in_list'  => 'Geçersiz kategori tipi.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get categories by type
     */
    public function getByType(string $type): array
    {
        return $this->where('type', $type)
                    ->where('is_active', 1)
                    ->orderBy('name', 'ASC')
                    ->findAll();
    }

    /**
     * Get income categories
     */
    public function getIncomeCategories(): array
    {
        return $this->getByType('income');
    }

    /**
     * Get expense categories
     */
    public function getExpenseCategories(): array
    {
        return $this->getByType('expense');
    }

    /**
     * Get category tree (hierarchical)
     */
    public function getTree(?string $type = null): array
    {
        $builder = $this->where('is_active', 1);

        if ($type) {
            $builder->where('type', $type);
        }

        $categories = $builder->orderBy('name', 'ASC')->findAll();

        return $this->buildTree($categories);
    }

    /**
     * Build hierarchical tree from flat array
     */
    protected function buildTree(array $categories, ?int $parentId = null): array
    {
        $tree = [];
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $children = $this->buildTree($categories, $category['id']);
                if ($children) {
                    $category['children'] = $children;
                }
                $tree[] = $category;
            }
        }
        return $tree;
    }

    /**
     * Get flat list for dropdown with hierarchy indication
     */
    public function getForDropdown(?string $type = null): array
    {
        $builder = $this->where('is_active', 1);

        if ($type) {
            $builder->where('type', $type);
        }

        $categories = $builder->orderBy('type', 'ASC')->orderBy('name', 'ASC')->findAll();

        $result = [];
        foreach ($categories as $category) {
            $prefix = '';
            if ($category['parent_id']) {
                $prefix = '-- ';
            }
            $typeLabel = $category['type'] === 'income' ? 'Gelir' : 'Gider';
            $result[$category['id']] = "[{$typeLabel}] {$prefix}{$category['name']}";
        }

        return $result;
    }

    /**
     * Get parent category
     */
    public function getParent(int $categoryId): ?array
    {
        $category = $this->find($categoryId);
        if ($category && $category['parent_id']) {
            return $this->find($category['parent_id']);
        }
        return null;
    }

    /**
     * Get children categories
     */
    public function getChildren(int $parentId): array
    {
        return $this->where('parent_id', $parentId)
                    ->where('is_active', 1)
                    ->orderBy('name', 'ASC')
                    ->findAll();
    }
}

<?php

namespace App\Controllers;

use App\Models\CategoryModel;

class CategoryController extends BaseController
{
    protected CategoryModel $categoryModel;

    public function __construct()
    {
        parent::__construct();
        $this->categoryModel = new CategoryModel();
    }

    /**
     * List categories
     * GET /api/categories
     */
    public function index()
    {
        $type = $this->getQueryParam('type');
        $tree = $this->getQueryParam('tree') === 'true';

        if ($tree) {
            $categories = $this->categoryModel->getTree($type);
        } else {
            $categories = $this->categoryModel->getAll($type);
        }

        return $this->success('Kategoriler listelendi', [
            'categories' => $categories,
            'count' => count($categories)
        ]);
    }

    /**
     * Get single category
     * GET /api/categories/{id}
     */
    public function show(int $id)
    {
        $category = $this->categoryModel->find($id);

        if (!$category) {
            return $this->notFound('Kategori bulunamadı');
        }

        // Get parent info
        if ($category['parent_id']) {
            $parent = $this->categoryModel->find($category['parent_id']);
            $category['parent_name'] = $parent ? $parent['name'] : null;
        }

        return $this->success('Kategori detayı', [
            'category' => $category
        ]);
    }

    /**
     * Create category
     * POST /api/categories
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['name', 'type']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        $insertData = [
            'name' => $data['name'],
            'type' => $data['type'],
            'parent_id' => $data['parent_id'] ?? null,
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? 1,
            'created_by' => $this->getUserId()
        ];

        $id = $this->categoryModel->insert($insertData);
        if (!$id) {
            return $this->error('Kategori oluşturulamadı', 500);
        }

        $category = $this->categoryModel->find($id);

        return $this->created('Kategori oluşturuldu', [
            'category' => $category
        ]);
    }

    /**
     * Update category
     * PUT /api/categories/{id}
     */
    public function update(int $id)
    {
        $category = $this->categoryModel->find($id);
        if (!$category) {
            return $this->notFound('Kategori bulunamadı');
        }

        $data = $this->getJsonInput();

        // Prevent setting self as parent
        if (isset($data['parent_id']) && (int)$data['parent_id'] === $id) {
            return $this->error('Kategori kendisinin alt kategorisi olamaz');
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at'], $data['created_by']);

        $this->categoryModel->update($id, $data);

        $category = $this->categoryModel->find($id);

        return $this->success('Kategori güncellendi', [
            'category' => $category
        ]);
    }

    /**
     * Delete category
     * DELETE /api/categories/{id}
     */
    public function delete(int $id)
    {
        $category = $this->categoryModel->find($id);
        if (!$category) {
            return $this->notFound('Kategori bulunamadı');
        }

        // Check for related records
        if ($this->categoryModel->hasRelatedRecords($id)) {
            return $this->error('Bu kategorinin alt kategorileri veya ilişkili işlemleri var', 409);
        }

        $this->categoryModel->delete($id);

        return $this->success('Kategori silindi');
    }

    /**
     * Merge categories
     * POST /api/categories/merge
     */
    public function merge()
    {
        $data = $this->getJsonInput();

        if (empty($data['source_id']) || empty($data['target_id'])) {
            return $this->validationError(['message' => 'source_id ve target_id zorunludur']);
        }

        $sourceId = (int)$data['source_id'];
        $targetId = (int)$data['target_id'];

        if ($sourceId === $targetId) {
            return $this->error('Kaynak ve hedef kategori aynı olamaz');
        }

        $source = $this->categoryModel->find($sourceId);
        $target = $this->categoryModel->find($targetId);

        if (!$source || !$target) {
            return $this->notFound('Kaynak veya hedef kategori bulunamadı');
        }

        if ($source['type'] !== $target['type']) {
            return $this->error('Farklı tipteki kategoriler birleştirilemez');
        }

        $success = $this->categoryModel->mergeCategories($sourceId, $targetId);

        if (!$success) {
            return $this->error('Kategoriler birleştirilemedi', 500);
        }

        $category = $this->categoryModel->find($targetId);

        return $this->success('Kategoriler birleştirildi', [
            'category' => $category
        ]);
    }
}

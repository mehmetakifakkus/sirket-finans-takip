<?php

namespace App\Controllers;

use App\Models\CategoryModel;
use App\Models\AuditLogModel;

class CategoryController extends BaseController
{
    protected CategoryModel $categoryModel;
    protected AuditLogModel $auditLogModel;

    public function __construct()
    {
        $this->categoryModel = new CategoryModel();
        $this->auditLogModel = new AuditLogModel();
    }

    /**
     * List all categories
     */
    public function index()
    {
        $type = $this->request->getGet('type');

        if ($type) {
            $categories = $this->categoryModel->getByType($type);
        } else {
            $categories = $this->categoryModel->orderBy('type', 'ASC')->orderBy('name', 'ASC')->findAll();
        }

        return $this->render('categories/index', [
            'title'       => 'Kategoriler',
            'categories'  => $categories,
            'currentType' => $type,
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        $parentCategories = $this->categoryModel->where('parent_id', null)->findAll();

        return $this->render('categories/form', [
            'title'            => 'Yeni Kategori',
            'category'         => null,
            'parentCategories' => $parentCategories,
            'action'           => 'create',
        ]);
    }

    /**
     * Store new category
     */
    public function store()
    {
        $rules = [
            'name' => 'required|min_length[2]|max_length[100]',
            'type' => 'required|in_list[income,expense]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'name'      => $this->request->getPost('name'),
            'type'      => $this->request->getPost('type'),
            'parent_id' => $this->request->getPost('parent_id') ?: null,
            'is_active' => $this->request->getPost('is_active') ?? 1,
        ];

        $id = $this->categoryModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'category', $id, null, $data);
            return $this->redirectWithSuccess('/categories', 'Kategori başarıyla oluşturuldu.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Kategori oluşturulamadı.');
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        $category = $this->categoryModel->find($id);

        if (!$category) {
            return $this->redirectWithError('/categories', 'Kategori bulunamadı.');
        }

        $parentCategories = $this->categoryModel
            ->where('parent_id', null)
            ->where('id !=', $id)
            ->findAll();

        return $this->render('categories/form', [
            'title'            => 'Kategori Düzenle',
            'category'         => $category,
            'parentCategories' => $parentCategories,
            'action'           => 'edit',
        ]);
    }

    /**
     * Update category
     */
    public function update(int $id)
    {
        $category = $this->categoryModel->find($id);

        if (!$category) {
            return $this->redirectWithError('/categories', 'Kategori bulunamadı.');
        }

        $rules = [
            'name' => 'required|min_length[2]|max_length[100]',
            'type' => 'required|in_list[income,expense]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'name'      => $this->request->getPost('name'),
            'type'      => $this->request->getPost('type'),
            'parent_id' => $this->request->getPost('parent_id') ?: null,
            'is_active' => $this->request->getPost('is_active') ?? 1,
        ];

        $oldData = $category;

        if ($this->categoryModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'category', $id, $oldData, $data);
            return $this->redirectWithSuccess('/categories', 'Kategori başarıyla güncellendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Kategori güncellenemedi.');
    }

    /**
     * Delete category
     */
    public function delete(int $id)
    {
        $category = $this->categoryModel->find($id);

        if (!$category) {
            return $this->redirectWithError('/categories', 'Kategori bulunamadı.');
        }

        // Check for child categories
        $children = $this->categoryModel->getChildren($id);
        if (!empty($children)) {
            return $this->redirectWithError('/categories', 'Alt kategorileri olan bir kategori silinemez.');
        }

        if ($this->categoryModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'category', $id, $category, null);
            return $this->redirectWithSuccess('/categories', 'Kategori başarıyla silindi.');
        }

        return $this->redirectWithError('/categories', 'Kategori silinemedi.');
    }
}

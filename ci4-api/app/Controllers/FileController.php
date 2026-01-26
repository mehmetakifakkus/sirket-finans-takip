<?php

namespace App\Controllers;

use App\Models\FileModel;

class FileController extends BaseController
{
    protected FileModel $fileModel;

    public function __construct()
    {
        parent::__construct();
        $this->fileModel = new FileModel();
    }

    /**
     * List files
     * GET /api/files
     */
    public function index()
    {
        $filters = $this->getQueryParams(['category', 'search']);
        $files = $this->fileModel->getAll($filters);

        return $this->success('Dosyalar listelendi', [
            'files' => $files,
            'count' => count($files)
        ]);
    }

    /**
     * Get single file info
     * GET /api/files/{id}
     */
    public function show(int $id)
    {
        $file = $this->fileModel->getWithCreator($id);

        if (!$file) {
            return $this->notFound('Dosya bulunamadı');
        }

        return $this->success('Dosya detayı', [
            'file' => $file
        ]);
    }

    /**
     * Upload file
     * POST /api/files
     */
    public function create()
    {
        $category = $this->request->getPost('category') ?? 'general';
        $description = $this->request->getPost('description');

        // Handle file upload
        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->validationError(['file' => 'Geçerli bir dosya yükleyin']);
        }

        // Check file size (10MB max)
        if ($file->getSize() > 10 * 1024 * 1024) {
            return $this->validationError(['file' => 'Dosya boyutu 10MB\'dan büyük olamaz']);
        }

        // Generate unique filename
        $newName = $file->getRandomName();
        $uploadPath = $this->getUploadPath() . $category . '/';

        // Create category folder if not exists
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        // Move file
        $file->move($uploadPath, $newName);

        // Save to database
        $insertData = [
            'name' => pathinfo($file->getClientName(), PATHINFO_FILENAME),
            'original_name' => $file->getClientName(),
            'file_path' => $category . '/' . $newName,
            'file_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'category' => $category,
            'description' => $description,
            'created_by' => $this->getUserId()
        ];

        $id = $this->fileModel->insert($insertData);
        if (!$id) {
            @unlink($uploadPath . $newName);
            return $this->error('Dosya kaydedilemedi', 500);
        }

        $file = $this->fileModel->getWithCreator($id);

        return $this->created('Dosya yüklendi', [
            'file' => $file
        ]);
    }

    /**
     * Delete file
     * DELETE /api/files/{id}
     */
    public function delete(int $id)
    {
        $file = $this->fileModel->find($id);
        if (!$file) {
            return $this->notFound('Dosya bulunamadı');
        }

        // Delete physical file
        $filePath = $this->getUploadPath() . $file['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $this->fileModel->delete($id);

        return $this->success('Dosya silindi');
    }

    /**
     * Open/download file
     * GET /api/files/{id}/open
     */
    public function open(int $id)
    {
        $file = $this->fileModel->find($id);
        if (!$file) {
            return $this->notFound('Dosya bulunamadı');
        }

        $filePath = $this->getUploadPath() . $file['file_path'];
        if (!file_exists($filePath)) {
            return $this->notFound('Dosya bulunamadı');
        }

        $download = $this->getQueryParam('download') === 'true';

        return $this->response
            ->setHeader('Content-Type', $file['file_type'])
            ->setHeader('Content-Disposition', ($download ? 'attachment' : 'inline') . '; filename="' . $file['original_name'] . '"')
            ->setBody(file_get_contents($filePath));
    }
}

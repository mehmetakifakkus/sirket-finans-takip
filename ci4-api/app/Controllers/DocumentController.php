<?php

namespace App\Controllers;

use App\Models\DocumentModel;
use App\Models\TransactionModel;

class DocumentController extends BaseController
{
    protected DocumentModel $documentModel;
    protected TransactionModel $transactionModel;

    public function __construct()
    {
        parent::__construct();
        $this->documentModel = new DocumentModel();
        $this->transactionModel = new TransactionModel();
    }

    /**
     * List documents
     * GET /api/documents
     */
    public function index()
    {
        $filters = $this->getQueryParams(['transaction_id', 'search']);
        $documents = $this->documentModel->getAll($filters);

        return $this->success('Belgeler listelendi', [
            'documents' => $documents,
            'count' => count($documents)
        ]);
    }

    /**
     * Get single document
     * GET /api/documents/{id}
     */
    public function show(int $id)
    {
        $document = $this->documentModel->getWithTransaction($id);

        if (!$document) {
            return $this->notFound('Belge bulunamadı');
        }

        return $this->success('Belge detayı', [
            'document' => $document
        ]);
    }

    /**
     * Upload document
     * POST /api/documents
     */
    public function create()
    {
        // Get POST data (works with both CI4 and SimpleRouter)
        $transactionId = $_POST['transaction_id'] ?? null;
        $description = $_POST['description'] ?? '';

        if (!$transactionId) {
            return $this->validationError(['transaction_id' => 'İşlem ID zorunludur']);
        }

        // Check transaction exists
        $transaction = $this->transactionModel->find($transactionId);
        if (!$transaction) {
            return $this->notFound('İşlem bulunamadı');
        }

        // Handle file upload (works with both CI4 and SimpleRouter)
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = 'Geçerli bir dosya yükleyin';
            if (isset($_FILES['file'])) {
                switch ($_FILES['file']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = 'Dosya boyutu çok büyük';
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = 'Dosya seçilmedi';
                        break;
                }
            }
            return $this->validationError(['file' => $errorMsg]);
        }

        $file = $_FILES['file'];
        $fileMimeType = mime_content_type($file['tmp_name']) ?: $file['type'];
        $fileSize = $file['size'];
        $originalName = $file['name'];

        // Validate file type
        $allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!in_array($fileMimeType, $allowedTypes)) {
            return $this->validationError(['file' => 'Desteklenmeyen dosya türü: ' . $fileMimeType]);
        }

        // Check file size (10MB max)
        if ($fileSize > 10 * 1024 * 1024) {
            return $this->validationError(['file' => 'Dosya boyutu 10MB\'dan büyük olamaz']);
        }

        // Generate unique filename
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $newName = uniqid() . '_' . time() . '.' . $extension;
        $uploadPath = $this->getUploadPath();

        // Move file
        if (!move_uploaded_file($file['tmp_name'], $uploadPath . $newName)) {
            return $this->error('Dosya yüklenemedi', 500);
        }

        // Save to database
        $insertData = [
            'transaction_id' => $transactionId,
            'file_name' => $originalName,
            'file_path' => $newName,
            'file_type' => $fileMimeType,
            'file_size' => $fileSize,
            'description' => $description,
            'created_by' => $this->getUserId()
        ];

        $id = $this->documentModel->insert($insertData);
        if (!$id) {
            // Delete uploaded file
            @unlink($uploadPath . $newName);
            return $this->error('Belge kaydedilemedi', 500);
        }

        $document = $this->documentModel->getWithTransaction($id);

        return $this->created('Belge yüklendi', [
            'document' => $document
        ]);
    }

    /**
     * Delete document
     * DELETE /api/documents/{id}
     */
    public function delete(int $id)
    {
        $document = $this->documentModel->find($id);
        if (!$document) {
            return $this->notFound('Belge bulunamadı');
        }

        // Delete file
        $filePath = $this->getUploadPath() . $document['file_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $this->documentModel->delete($id);

        return $this->success('Belge silindi');
    }

    /**
     * Preview/download document (raw file)
     * GET /api/documents/{id}/preview
     */
    public function preview(int $id)
    {
        $document = $this->documentModel->find($id);
        if (!$document) {
            return $this->notFound('Belge bulunamadı');
        }

        $filePath = $this->getUploadPath() . $document['file_path'];
        if (!file_exists($filePath)) {
            return $this->notFound('Dosya bulunamadı');
        }

        $download = $this->getQueryParam('download') === 'true';

        return $this->response
            ->setHeader('Content-Type', $document['file_type'])
            ->setHeader('Content-Disposition', ($download ? 'attachment' : 'inline') . '; filename="' . $document['file_name'] . '"')
            ->setBody(file_get_contents($filePath));
    }

    /**
     * Get document data as base64 (for thumbnails)
     * GET /api/documents/{id}/data
     */
    public function data(int $id)
    {
        $document = $this->documentModel->find($id);
        if (!$document) {
            return $this->notFound('Belge bulunamadı');
        }

        $filePath = $this->getUploadPath() . $document['file_path'];
        if (!file_exists($filePath)) {
            return $this->notFound('Dosya bulunamadı');
        }

        $content = file_get_contents($filePath);
        $base64 = base64_encode($content);

        return $this->success('Belge verisi', [
            'data' => $base64,
            'mimeType' => $document['file_type']
        ]);
    }

    /**
     * Get document count
     * GET /api/documents/count
     */
    public function count()
    {
        $transactionId = $this->getQueryParam('transaction_id');

        if ($transactionId) {
            $count = $this->documentModel->getCountByTransaction((int)$transactionId);
        } else {
            $count = $this->documentModel->getTotalCount();
        }

        return $this->success('Belge sayısı', [
            'count' => $count
        ]);
    }
}

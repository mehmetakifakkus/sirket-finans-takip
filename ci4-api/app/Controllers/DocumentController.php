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
        $transactionId = $this->request->getPost('transaction_id');
        $description = $this->request->getPost('description');

        if (!$transactionId) {
            return $this->validationError(['transaction_id' => 'İşlem ID zorunludur']);
        }

        // Check transaction exists
        $transaction = $this->transactionModel->find($transactionId);
        if (!$transaction) {
            return $this->notFound('İşlem bulunamadı');
        }

        // Handle file upload
        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->validationError(['file' => 'Geçerli bir dosya yükleyin']);
        }

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return $this->validationError(['file' => 'Desteklenmeyen dosya türü']);
        }

        // Check file size (10MB max)
        if ($file->getSize() > 10 * 1024 * 1024) {
            return $this->validationError(['file' => 'Dosya boyutu 10MB\'dan büyük olamaz']);
        }

        // Generate unique filename
        $newName = $file->getRandomName();
        $uploadPath = $this->getUploadPath();

        // Move file
        $file->move($uploadPath, $newName);

        // Save to database
        $insertData = [
            'transaction_id' => $transactionId,
            'file_name' => $file->getClientName(),
            'file_path' => $newName,
            'file_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
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
     * Preview/download document
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

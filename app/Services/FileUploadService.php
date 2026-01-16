<?php

namespace App\Services;

use CodeIgniter\HTTP\Files\UploadedFile;

class FileUploadService
{
    /**
     * Upload directory path
     */
    protected string $uploadPath;

    /**
     * Allowed file types
     */
    protected array $allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    /**
     * Allowed extensions
     */
    protected array $allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif',
        'pdf',
        'doc', 'docx',
        'xls', 'xlsx',
    ];

    /**
     * Max file size in bytes (10MB)
     */
    protected int $maxSize = 10485760;

    public function __construct()
    {
        $this->uploadPath = FCPATH . 'uploads/documents/';

        // Ensure upload directory exists
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    /**
     * Upload a document file
     */
    public function uploadDocument(?UploadedFile $file): array
    {
        if ($file === null || !$file->isValid()) {
            return [
                'success' => false,
                'message' => 'Geçersiz dosya.',
            ];
        }

        // Check if file was actually uploaded
        if ($file->getError() !== UPLOAD_ERR_OK) {
            return [
                'success' => false,
                'message' => $this->getUploadErrorMessage($file->getError()),
            ];
        }

        // Validate file size
        if ($file->getSize() > $this->maxSize) {
            return [
                'success' => false,
                'message' => 'Dosya boyutu çok büyük. Maksimum: ' . $this->formatBytes($this->maxSize),
            ];
        }

        // Validate mime type
        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, $this->allowedTypes)) {
            return [
                'success' => false,
                'message' => 'Bu dosya tipi desteklenmiyor.',
            ];
        }

        // Validate extension
        $extension = strtolower($file->getExtension());
        if (!in_array($extension, $this->allowedExtensions)) {
            return [
                'success' => false,
                'message' => 'Bu dosya uzantısı desteklenmiyor.',
            ];
        }

        // Generate unique filename
        $newName = $this->generateFileName($extension);

        // Move file
        try {
            if ($file->move($this->uploadPath, $newName)) {
                return [
                    'success'   => true,
                    'message'   => 'Dosya başarıyla yüklendi.',
                    'file_name' => $newName,
                    'file_path' => 'uploads/documents/' . $newName,
                    'full_path' => $this->uploadPath . $newName,
                    'mime_type' => $mimeType,
                    'size'      => $file->getSize(),
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Dosya yüklenirken hata oluştu: ' . $e->getMessage(),
            ];
        }

        return [
            'success' => false,
            'message' => 'Dosya yüklenemedi.',
        ];
    }

    /**
     * Delete a document file
     */
    public function deleteDocument(string $filePath): bool
    {
        $fullPath = FCPATH . $filePath;

        if (file_exists($fullPath)) {
            return @unlink($fullPath);
        }

        return true; // File doesn't exist, consider it deleted
    }

    /**
     * Generate a unique filename
     */
    protected function generateFileName(string $extension): string
    {
        $timestamp = date('Ymd_His');
        $random = bin2hex(random_bytes(8));

        return "{$timestamp}_{$random}.{$extension}";
    }

    /**
     * Get human-readable upload error message
     */
    protected function getUploadErrorMessage(int $error): string
    {
        return match($error) {
            UPLOAD_ERR_INI_SIZE   => 'Dosya boyutu sunucu limitini aşıyor.',
            UPLOAD_ERR_FORM_SIZE  => 'Dosya boyutu form limitini aşıyor.',
            UPLOAD_ERR_PARTIAL    => 'Dosya kısmen yüklendi.',
            UPLOAD_ERR_NO_FILE    => 'Dosya seçilmedi.',
            UPLOAD_ERR_NO_TMP_DIR => 'Geçici klasör bulunamadı.',
            UPLOAD_ERR_CANT_WRITE => 'Dosya yazılamadı.',
            UPLOAD_ERR_EXTENSION  => 'Dosya yükleme uzantı tarafından durduruldu.',
            default               => 'Bilinmeyen yükleme hatası.',
        };
    }

    /**
     * Format bytes to human readable
     */
    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;

        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get file icon class based on extension
     */
    public static function getFileIcon(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match($extension) {
            'pdf'          => 'file-pdf',
            'doc', 'docx'  => 'file-word',
            'xls', 'xlsx'  => 'file-excel',
            'jpg', 'jpeg', 'png', 'gif' => 'file-image',
            default        => 'file',
        };
    }

    /**
     * Check if file is an image
     */
    public static function isImage(string $path): bool
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($extension, ['jpg', 'jpeg', 'png', 'gif']);
    }

    /**
     * Get allowed types for form validation message
     */
    public function getAllowedTypesText(): string
    {
        return implode(', ', array_map('strtoupper', $this->allowedExtensions));
    }

    /**
     * Get max size text
     */
    public function getMaxSizeText(): string
    {
        return $this->formatBytes($this->maxSize);
    }
}

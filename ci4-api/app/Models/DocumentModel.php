<?php

namespace App\Models;

use App\Libraries\Database;

class DocumentModel extends BaseModel
{
    protected string $table = 'transaction_documents';
    protected string $primaryKey = 'id';
    protected array $allowedFields = [
        'transaction_id', 'file_name', 'file_path', 'file_type',
        'file_size', 'description', 'created_by'
    ];

    /**
     * Get documents by transaction
     */
    public function getByTransaction(int $transactionId): array
    {
        return Database::query(
            "SELECT id, transaction_id, file_name as original_name, file_path as filename,
                    file_type as mime_type, file_size, description, created_by, created_at as uploaded_at
             FROM transaction_documents WHERE transaction_id = ? ORDER BY created_at DESC",
            [$transactionId]
        );
    }

    /**
     * Get all documents with transaction info
     */
    public function getAll(array $filters = []): array
    {
        $sql = "SELECT d.id, d.transaction_id, d.file_name as original_name, d.file_path as filename,
                d.file_type as mime_type, d.file_size, d.description, d.created_by, d.created_at as uploaded_at,
                t.date as transaction_date, t.type as transaction_type,
                t.description as transaction_description, p.name as party_name
                FROM transaction_documents d
                LEFT JOIN transactions t ON t.id = d.transaction_id
                LEFT JOIN parties p ON p.id = t.party_id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['transaction_id'])) {
            $sql .= " AND d.transaction_id = ?";
            $params[] = $filters['transaction_id'];
        }
        if (!empty($filters['search'])) {
            $sql .= " AND (d.file_name LIKE ? OR d.description LIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
        }

        $sql .= " ORDER BY d.created_at DESC";

        return Database::query($sql, $params);
    }

    /**
     * Get document count by transaction
     */
    public function getCountByTransaction(int $transactionId): int
    {
        $result = Database::queryOne(
            "SELECT COUNT(*) as cnt FROM transaction_documents WHERE transaction_id = ?",
            [$transactionId]
        );
        return (int)($result['cnt'] ?? 0);
    }

    /**
     * Get total document count
     */
    public function getTotalCount(): int
    {
        $result = Database::queryOne("SELECT COUNT(*) as cnt FROM transaction_documents");
        return (int)($result['cnt'] ?? 0);
    }

    /**
     * Get document with transaction info
     */
    public function getWithTransaction(int $id): ?array
    {
        $sql = "SELECT d.id, d.transaction_id, d.file_name as original_name, d.file_path as filename,
                d.file_type as mime_type, d.file_size, d.description, d.created_by, d.created_at as uploaded_at,
                t.date as transaction_date, t.type as transaction_type, t.description as transaction_description
                FROM transaction_documents d
                LEFT JOIN transactions t ON t.id = d.transaction_id
                WHERE d.id = ?";

        return Database::queryOne($sql, [$id]);
    }
}

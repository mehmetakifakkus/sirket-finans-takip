<?php

namespace App\Controllers;

class DatabaseController extends BaseController
{
    /**
     * Get database statistics
     * GET /api/database/stats
     */
    public function stats()
    {
        $db = \Config\Database::connect();

        $tables = [
            'users', 'parties', 'categories', 'projects', 'project_milestones',
            'project_grants', 'transactions', 'transaction_documents', 'debts',
            'installments', 'payments', 'exchange_rates', 'files'
        ];

        $stats = [];
        foreach ($tables as $table) {
            if ($db->tableExists($table)) {
                $stats[$table] = $db->table($table)->countAllResults();
            }
        }

        // Get database size
        $dbName = $db->database;
        $sizeQuery = $db->query("SELECT
            SUM(data_length + index_length) as size
            FROM information_schema.tables
            WHERE table_schema = ?", [$dbName]);
        $sizeResult = $sizeQuery->getRowArray();
        $dbSize = $sizeResult ? (int)$sizeResult['size'] : 0;

        return $this->success('Veritabanı istatistikleri', [
            'tables' => $stats,
            'total_records' => array_sum($stats),
            'database_size' => $dbSize,
            'database_size_formatted' => $this->formatBytes($dbSize)
        ]);
    }

    /**
     * Export database
     * GET /api/database/export
     */
    public function export()
    {
        $db = \Config\Database::connect();

        $tables = [
            'users', 'parties', 'categories', 'projects', 'project_milestones',
            'project_grants', 'transactions', 'transaction_documents', 'debts',
            'installments', 'payments', 'exchange_rates', 'files'
        ];

        $exportData = [];
        foreach ($tables as $table) {
            if ($db->tableExists($table)) {
                $exportData[$table] = $db->table($table)->get()->getResultArray();
            }
        }

        $json = json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $filename = 'sirket_finans_export_' . date('Y-m-d_His') . '.json';

        return $this->response
            ->setHeader('Content-Type', 'application/json')
            ->setHeader('Content-Disposition', "attachment; filename=\"$filename\"")
            ->setBody($json);
    }

    /**
     * Backup database
     * POST /api/database/backup
     */
    public function backup()
    {
        $db = \Config\Database::connect();

        $tables = [
            'users', 'parties', 'categories', 'projects', 'project_milestones',
            'project_grants', 'transactions', 'transaction_documents', 'debts',
            'installments', 'payments', 'exchange_rates', 'files'
        ];

        $exportData = [
            'version' => '1.0',
            'created_at' => date('Y-m-d H:i:s'),
            'tables' => []
        ];

        foreach ($tables as $table) {
            if ($db->tableExists($table)) {
                $exportData['tables'][$table] = $db->table($table)->get()->getResultArray();
            }
        }

        $backupPath = $this->getBackupPath();
        $filename = 'backup_' . date('Y-m-d_His') . '.json';
        $filePath = $backupPath . $filename;

        file_put_contents($filePath, json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return $this->success('Yedek oluşturuldu', [
            'filename' => $filename,
            'size' => filesize($filePath),
            'path' => $filePath
        ]);
    }

    /**
     * Restore database from backup
     * POST /api/database/restore
     */
    public function restore()
    {
        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->validationError(['file' => 'Geçerli bir yedek dosyası yükleyin']);
        }

        $content = file_get_contents($file->getTempName());
        $data = json_decode($content, true);

        if (!$data || !isset($data['tables'])) {
            return $this->error('Geçersiz yedek dosyası formatı');
        }

        $db = \Config\Database::connect();

        try {
            $db->transStart();

            foreach ($data['tables'] as $table => $rows) {
                if ($db->tableExists($table)) {
                    // Clear existing data
                    $db->table($table)->truncate();

                    // Insert backup data
                    foreach ($rows as $row) {
                        $db->table($table)->insert($row);
                    }
                }
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->error('Geri yükleme başarısız oldu', 500);
            }

            return $this->success('Veritabanı geri yüklendi');

        } catch (\Exception $e) {
            return $this->error('Geri yükleme hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Clear all data
     * POST /api/database/clear
     */
    public function clear()
    {
        $data = $this->getJsonInput();

        // Require confirmation
        if (empty($data['confirm']) || $data['confirm'] !== 'CLEAR_ALL_DATA') {
            return $this->error('Onay gerekli. confirm: "CLEAR_ALL_DATA" gönderilmeli.');
        }

        $db = \Config\Database::connect();

        $tables = [
            'payments', 'installments', 'debts', 'transaction_documents',
            'transactions', 'project_grants', 'project_milestones', 'projects',
            'exchange_rates', 'files'
        ];

        try {
            $db->transStart();

            foreach ($tables as $table) {
                if ($db->tableExists($table)) {
                    $db->table($table)->truncate();
                }
            }

            $db->transComplete();

            return $this->success('Tüm veriler silindi');

        } catch (\Exception $e) {
            return $this->error('Silme hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Format bytes to human readable
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, 2) . ' ' . $units[$pow];
    }
}

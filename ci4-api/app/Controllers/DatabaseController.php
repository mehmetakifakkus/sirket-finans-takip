<?php

namespace App\Controllers;

use App\Libraries\Database;

class DatabaseController extends BaseController
{
    /**
     * Get database statistics
     * GET /api/database/stats
     */
    public function stats()
    {
        $tables = [
            'users', 'parties', 'categories', 'projects', 'project_milestones',
            'project_grants', 'transactions', 'transaction_documents', 'debts',
            'installments', 'payments', 'exchange_rates', 'files'
        ];

        $stats = [];
        foreach ($tables as $table) {
            if (Database::tableExists($table)) {
                $stats[$table] = [
                    'label' => $table,
                    'count' => Database::count($table)
                ];
            }
        }

        // Get database size
        $dbName = getenv('database.default.database') ?: 'sirket_finans';
        $sizeResult = Database::queryOne(
            "SELECT SUM(data_length + index_length) as size FROM information_schema.tables WHERE table_schema = ?",
            [$dbName]
        );
        $dbSize = $sizeResult ? (int)$sizeResult['size'] : 0;

        return $this->success('Veritabanı istatistikleri', [
            'stats' => $stats,
            'database_size' => $this->formatBytes($dbSize)
        ]);
    }

    /**
     * Export database as SQL
     * GET /api/database/export
     */
    public function export()
    {
        $tables = [
            'categories', 'parties', 'users', 'projects', 'project_milestones',
            'project_grants', 'exchange_rates', 'transactions', 'transaction_documents',
            'debts', 'installments', 'payments', 'files'
        ];

        $sql = "-- Şirket Finans Takip - Database Export\n";
        $sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
        $sql .= "-- ----------------------------------------------\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

        foreach ($tables as $table) {
            if (!Database::tableExists($table)) {
                continue;
            }

            $rows = Database::query("SELECT * FROM $table");

            if (empty($rows)) {
                $sql .= "-- Table `$table` is empty\n\n";
                continue;
            }

            $sql .= "-- Table: $table (" . count($rows) . " rows)\n";
            $sql .= "TRUNCATE TABLE `$table`;\n";

            foreach ($rows as $row) {
                $columns = array_keys($row);
                $values = array_map(function($val) {
                    if ($val === null) {
                        return 'NULL';
                    }
                    return "'" . addslashes($val) . "'";
                }, array_values($row));

                $sql .= "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $values) . ");\n";
            }
            $sql .= "\n";
        }

        $sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";

        $filename = 'sirket_finans_export_' . date('Y-m-d_His') . '.sql';

        return $this->response
            ->setHeader('Content-Type', 'application/sql')
            ->setHeader('Content-Disposition', "attachment; filename=\"$filename\"")
            ->setBody($sql);
    }

    /**
     * Backup database
     * POST /api/database/backup
     */
    public function backup()
    {
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
            if (Database::tableExists($table)) {
                $exportData['tables'][$table] = Database::query("SELECT * FROM $table");
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
     * Restore database from SQL file
     * POST /api/database/restore
     */
    public function restore()
    {
        // Handle file upload in standalone mode
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            return $this->validationError(['file' => 'Geçerli bir SQL dosyası yükleyin']);
        }

        $content = file_get_contents($_FILES['file']['tmp_name']);

        if (empty($content)) {
            return $this->error('Dosya boş');
        }

        // Parse SQL statements
        $statements = $this->parseSqlStatements($content);

        if (empty($statements)) {
            return $this->error('Geçerli SQL ifadesi bulunamadı');
        }

        try {
            $executedCount = 0;
            $errors = [];

            foreach ($statements as $statement) {
                $statement = trim($statement);
                if (empty($statement)) {
                    continue;
                }

                // Skip comments
                if (strpos($statement, '--') === 0) {
                    continue;
                }

                try {
                    Database::execute($statement);
                    $executedCount++;
                } catch (\Exception $e) {
                    $errors[] = substr($statement, 0, 50) . '... - ' . $e->getMessage();
                }
            }

            if (!empty($errors) && $executedCount === 0) {
                return $this->error('SQL çalıştırılamadı', 500, $errors);
            }

            return $this->success('Veritabanı geri yüklendi', [
                'executed_statements' => $executedCount,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            return $this->error('Geri yükleme hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Parse SQL content into individual statements
     */
    private function parseSqlStatements(string $content): array
    {
        $statements = [];
        $currentStatement = '';
        $inString = false;
        $stringChar = '';

        $lines = explode("\n", $content);

        foreach ($lines as $line) {
            $line = trim($line);

            // Skip empty lines and comments
            if (empty($line) || strpos($line, '--') === 0 || strpos($line, '#') === 0) {
                continue;
            }

            $currentStatement .= ' ' . $line;

            // Check if statement ends with semicolon (simple check)
            if (substr(rtrim($line), -1) === ';') {
                $statements[] = trim($currentStatement);
                $currentStatement = '';
            }
        }

        // Add any remaining statement
        if (!empty(trim($currentStatement))) {
            $statements[] = trim($currentStatement);
        }

        return $statements;
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

        $tables = [
            'payments', 'installments', 'debts', 'transaction_documents',
            'transactions', 'project_grants', 'project_milestones', 'projects',
            'exchange_rates', 'files'
        ];

        try {
            // Disable foreign key checks
            Database::execute("SET FOREIGN_KEY_CHECKS = 0");

            foreach ($tables as $table) {
                if (Database::tableExists($table)) {
                    Database::execute("TRUNCATE TABLE $table");
                }
            }

            // Re-enable foreign key checks
            Database::execute("SET FOREIGN_KEY_CHECKS = 1");

            return $this->success('Tüm veriler silindi');

        } catch (\Exception $e) {
            // Make sure to re-enable foreign key checks even on error
            try {
                Database::execute("SET FOREIGN_KEY_CHECKS = 1");
            } catch (\Exception $ignored) {}

            return $this->error('Silme hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Clear a single table
     * POST /api/database/clear/:tableName
     */
    public function clearTable($tableName = null)
    {
        // Handle table name from parameter or request body
        if (empty($tableName)) {
            $data = $this->getJsonInput();
            $tableName = $data['table'] ?? null;
        }

        if (empty($tableName) || !is_string($tableName)) {
            return $this->error('Tablo adı belirtilmeli', 400);
        }

        $allowedTables = [
            'payments', 'installments', 'debts', 'transaction_documents',
            'transactions', 'project_grants', 'project_milestones',
            'projects', 'exchange_rates', 'files'
        ];

        if (!in_array($tableName, $allowedTables)) {
            return $this->error('Geçersiz tablo adı: ' . $tableName, 400);
        }

        try {
            // Get count before deletion
            $count = 0;
            if (Database::tableExists($tableName)) {
                $count = Database::count($tableName);

                // Disable foreign key checks, truncate, then re-enable
                Database::execute("SET FOREIGN_KEY_CHECKS = 0");
                Database::execute("TRUNCATE TABLE $tableName");
                Database::execute("SET FOREIGN_KEY_CHECKS = 1");
            }

            return $this->success('Tablo silindi', [
                'table' => $tableName,
                'deleted_count' => $count
            ]);

        } catch (\Exception $e) {
            // Make sure to re-enable foreign key checks even on error
            try {
                Database::execute("SET FOREIGN_KEY_CHECKS = 1");
            } catch (\Exception $ignored) {}

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

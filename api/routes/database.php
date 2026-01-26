<?php
/**
 * Database Routes - Stats, Export, Import
 */

function handleDatabase($db, $method, $action) {
    requireAdmin();

    switch ($action) {
        case 'stats':
            getDatabaseStats($db);
            break;

        case 'export':
            if ($method === 'GET') {
                exportDatabase($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        case 'backup':
            if ($method === 'POST') {
                backupDatabase($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        case 'restore':
            if ($method === 'POST') {
                restoreDatabase($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        case 'clear':
            if ($method === 'POST') {
                clearDatabase($db);
            } else {
                jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
            }
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Endpoint bulunamadı'], 404);
    }
}

function getDatabaseStats($db) {
    $stats = [];

    $tables = [
        'users' => 'Kullanıcılar',
        'parties' => 'Cariler',
        'categories' => 'Kategoriler',
        'projects' => 'Projeler',
        'project_milestones' => 'Kilometre Taşları',
        'project_grants' => 'Hibeler',
        'transactions' => 'İşlemler',
        'debts' => 'Borç/Alacaklar',
        'installments' => 'Taksitler',
        'payments' => 'Ödemeler',
        'exchange_rates' => 'Döviz Kurları',
        'transaction_documents' => 'Belgeler'
    ];

    foreach ($tables as $table => $label) {
        try {
            $stmt = $db->query("SELECT COUNT(*) as count FROM $table");
            $result = $stmt->fetch();
            $stats[$table] = [
                'label' => $label,
                'count' => (int)$result['count']
            ];
        } catch (PDOException $e) {
            $stats[$table] = [
                'label' => $label,
                'count' => 0,
                'error' => true
            ];
        }
    }

    // Get database size (MySQL specific)
    try {
        $dbName = DB_NAME;
        $stmt = $db->query("
            SELECT
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
            FROM information_schema.tables
            WHERE table_schema = '$dbName'
        ");
        $result = $stmt->fetch();
        $stats['database_size'] = $result['size_mb'] . ' MB';
    } catch (PDOException $e) {
        $stats['database_size'] = 'N/A';
    }

    jsonResponse([
        'success' => true,
        'stats' => $stats
    ]);
}

function exportDatabase($db) {
    $format = $_GET['format'] ?? 'json';
    $tables = $_GET['tables'] ?? 'all';

    $tablesToExport = [
        'users', 'parties', 'categories', 'projects', 'project_milestones',
        'project_grants', 'transactions', 'debts', 'installments',
        'payments', 'exchange_rates', 'transaction_documents'
    ];

    if ($tables !== 'all') {
        $tablesToExport = array_intersect($tablesToExport, explode(',', $tables));
    }

    $data = [];
    foreach ($tablesToExport as $table) {
        try {
            $stmt = $db->query("SELECT * FROM $table");
            $data[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $data[$table] = [];
        }
    }

    if ($format === 'json') {
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename=veritabani-yedek-' . date('Y-m-d-His') . '.json');
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    } elseif ($format === 'sql') {
        header('Content-Type: text/plain');
        header('Content-Disposition: attachment; filename=veritabani-yedek-' . date('Y-m-d-His') . '.sql');

        $sql = "-- Database backup created at " . date('Y-m-d H:i:s') . "\n\n";

        foreach ($data as $table => $rows) {
            if (empty($rows)) continue;

            $columns = array_keys($rows[0]);
            $sql .= "-- Table: $table\n";

            foreach ($rows as $row) {
                $values = array_map(function($v) use ($db) {
                    if ($v === null) return 'NULL';
                    return $db->quote($v);
                }, array_values($row));

                $sql .= "INSERT INTO $table (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ");\n";
            }
            $sql .= "\n";
        }

        echo $sql;
        exit;
    } else {
        jsonResponse(['success' => false, 'message' => 'Geçersiz format']);
    }
}

function backupDatabase($db) {
    // Create backup directory if not exists
    $backupDir = __DIR__ . '/../backups/';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    $tables = [
        'users', 'parties', 'categories', 'projects', 'project_milestones',
        'project_grants', 'transactions', 'debts', 'installments',
        'payments', 'exchange_rates', 'transaction_documents', 'audit_logs'
    ];

    $data = ['backup_date' => date('c')];
    foreach ($tables as $table) {
        try {
            $stmt = $db->query("SELECT * FROM $table");
            $data[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $data[$table] = [];
        }
    }

    $filename = 'backup-' . date('Y-m-d-His') . '.json';
    $filepath = $backupDir . $filename;

    file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Clean old backups (keep last 10)
    $backups = glob($backupDir . 'backup-*.json');
    if (count($backups) > 10) {
        usort($backups, function($a, $b) {
            return filemtime($a) - filemtime($b);
        });
        for ($i = 0; $i < count($backups) - 10; $i++) {
            unlink($backups[$i]);
        }
    }

    jsonResponse([
        'success' => true,
        'message' => 'Yedekleme başarılı',
        'filename' => $filename,
        'size' => filesize($filepath)
    ]);
}

function restoreDatabase($db) {
    if (!isset($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => 'Yedek dosyası yüklenmedi']);
        return;
    }

    $file = $_FILES['file'];
    $content = file_get_contents($file['tmp_name']);
    $data = json_decode($content, true);

    if (!$data) {
        jsonResponse(['success' => false, 'message' => 'Geçersiz yedek dosyası']);
        return;
    }

    $db->beginTransaction();
    try {
        // Restore order matters for foreign keys
        $restoreOrder = [
            'users', 'parties', 'categories', 'projects', 'project_milestones',
            'project_grants', 'transactions', 'debts', 'installments',
            'payments', 'exchange_rates', 'transaction_documents', 'audit_logs'
        ];

        // Disable foreign key checks
        $db->exec("SET FOREIGN_KEY_CHECKS = 0");

        foreach ($restoreOrder as $table) {
            if (!isset($data[$table]) || empty($data[$table])) continue;

            // Clear existing data
            $db->exec("TRUNCATE TABLE $table");

            // Insert new data
            $columns = array_keys($data[$table][0]);
            $placeholders = str_repeat('?,', count($columns) - 1) . '?';
            $stmt = $db->prepare("INSERT INTO $table (" . implode(',', $columns) . ") VALUES ($placeholders)");

            foreach ($data[$table] as $row) {
                $stmt->execute(array_values($row));
            }
        }

        // Re-enable foreign key checks
        $db->exec("SET FOREIGN_KEY_CHECKS = 1");

        $db->commit();
        jsonResponse([
            'success' => true,
            'message' => 'Veritabanı başarıyla geri yüklendi'
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        $db->exec("SET FOREIGN_KEY_CHECKS = 1");
        jsonResponse(['success' => false, 'message' => 'Geri yükleme hatası: ' . $e->getMessage()]);
    }
}

function clearDatabase($db) {
    $data = getRequestBody();
    $confirm = $data['confirm'] ?? false;

    if ($confirm !== 'CLEAR_ALL_DATA') {
        jsonResponse(['success' => false, 'message' => 'Silme işlemi onaylanmadı. confirm: "CLEAR_ALL_DATA" gönderin.']);
        return;
    }

    $db->beginTransaction();
    try {
        // Clear order matters for foreign keys
        $tables = [
            'audit_logs', 'transaction_documents', 'payments', 'installments',
            'debts', 'transactions', 'project_grants', 'project_milestones',
            'projects', 'exchange_rates', 'categories', 'parties'
        ];
        // Note: users table is not cleared to keep admin account

        $db->exec("SET FOREIGN_KEY_CHECKS = 0");

        foreach ($tables as $table) {
            $db->exec("TRUNCATE TABLE $table");
        }

        $db->exec("SET FOREIGN_KEY_CHECKS = 1");

        $db->commit();
        jsonResponse([
            'success' => true,
            'message' => 'Tüm veriler silindi (kullanıcılar hariç)'
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        $db->exec("SET FOREIGN_KEY_CHECKS = 1");
        jsonResponse(['success' => false, 'message' => 'Silme hatası: ' . $e->getMessage()]);
    }
}

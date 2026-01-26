<?php
/**
 * Import Routes - Excel/CSV Import
 */

function handleImport($db, $method, $type) {
    requireAuth();

    if ($method !== 'POST') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }

    switch ($type) {
        case 'transactions':
            importTransactions($db);
            break;

        case 'parties':
            importParties($db);
            break;

        case 'categories':
            importCategories($db);
            break;

        case 'preview':
            previewImport($db);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Geçersiz import türü'], 400);
    }
}

function previewImport($db) {
    if (!isset($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenmedi']);
        return;
    }

    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($ext, ['csv', 'xlsx', 'xls'])) {
        jsonResponse(['success' => false, 'message' => 'Sadece CSV veya Excel dosyaları kabul edilir']);
        return;
    }

    if ($ext === 'csv') {
        $data = parseCsv($file['tmp_name']);
    } else {
        // For Excel files, we need PhpSpreadsheet or similar library
        // For now, only CSV is supported in pure PHP
        jsonResponse(['success' => false, 'message' => 'Excel desteği için PhpSpreadsheet gerekli. Lütfen CSV kullanın.']);
        return;
    }

    $headers = array_shift($data);
    $preview = array_slice($data, 0, 10);

    jsonResponse([
        'success' => true,
        'headers' => $headers,
        'preview' => $preview,
        'totalRows' => count($data)
    ]);
}

function importTransactions($db) {
    if (!isset($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenmedi']);
        return;
    }

    $file = $_FILES['file'];
    $mapping = isset($_POST['mapping']) ? json_decode($_POST['mapping'], true) : null;

    $data = parseCsv($file['tmp_name']);
    if (empty($data)) {
        jsonResponse(['success' => false, 'message' => 'Dosya boş veya okunamadı']);
        return;
    }

    $headers = array_shift($data);
    $imported = 0;
    $errors = [];

    // Default column mapping
    $defaultMapping = [
        'date' => findColumn($headers, ['tarih', 'date', 'işlem tarihi']),
        'type' => findColumn($headers, ['tür', 'type', 'işlem türü']),
        'amount' => findColumn($headers, ['tutar', 'amount', 'miktar']),
        'currency' => findColumn($headers, ['para birimi', 'currency', 'döviz']),
        'description' => findColumn($headers, ['açıklama', 'description', 'not']),
        'party' => findColumn($headers, ['cari', 'party', 'müşteri', 'tedarikçi']),
        'category' => findColumn($headers, ['kategori', 'category'])
    ];

    $columnMap = $mapping ?? $defaultMapping;

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            INSERT INTO transactions (type, party_id, category_id, date, amount, currency, vat_rate, vat_amount, withholding_rate, withholding_amount, net_amount, description, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, 1, NOW(), NOW())
        ");

        foreach ($data as $index => $row) {
            try {
                $date = getColumnValue($row, $columnMap['date'], $headers);
                $type = strtolower(getColumnValue($row, $columnMap['type'], $headers));
                $amount = floatval(str_replace([',', ' '], ['.', ''], getColumnValue($row, $columnMap['amount'], $headers)));
                $currency = getColumnValue($row, $columnMap['currency'], $headers) ?: 'TRY';
                $description = getColumnValue($row, $columnMap['description'], $headers);

                // Normalize type
                if (in_array($type, ['gelir', 'income', 'giriş', '+'])) {
                    $type = 'income';
                } elseif (in_array($type, ['gider', 'expense', 'çıkış', '-'])) {
                    $type = 'expense';
                } else {
                    throw new Exception("Geçersiz işlem türü: $type");
                }

                // Find party if provided
                $partyName = getColumnValue($row, $columnMap['party'], $headers);
                $partyId = null;
                if ($partyName) {
                    $partyStmt = $db->prepare("SELECT id FROM parties WHERE name LIKE ?");
                    $partyStmt->execute(['%' . $partyName . '%']);
                    $party = $partyStmt->fetch();
                    $partyId = $party ? $party['id'] : null;
                }

                // Find category if provided
                $categoryName = getColumnValue($row, $columnMap['category'], $headers);
                $categoryId = null;
                if ($categoryName) {
                    $catStmt = $db->prepare("SELECT id FROM categories WHERE name LIKE ?");
                    $catStmt->execute(['%' . $categoryName . '%']);
                    $category = $catStmt->fetch();
                    $categoryId = $category ? $category['id'] : null;
                }

                // Parse date
                $parsedDate = parseDate($date);
                if (!$parsedDate) {
                    throw new Exception("Geçersiz tarih formatı: $date");
                }

                $stmt->execute([
                    $type,
                    $partyId,
                    $categoryId,
                    $parsedDate,
                    $amount,
                    $currency,
                    $amount, // net_amount same as amount when no VAT
                    $description
                ]);
                $imported++;
            } catch (Exception $e) {
                $errors[] = "Satır " . ($index + 2) . ": " . $e->getMessage();
            }
        }

        $db->commit();
        jsonResponse([
            'success' => true,
            'message' => "$imported işlem başarıyla içe aktarıldı",
            'imported' => $imported,
            'errors' => $errors
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['success' => false, 'message' => 'İçe aktarma hatası: ' . $e->getMessage()]);
    }
}

function importParties($db) {
    if (!isset($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenmedi']);
        return;
    }

    $file = $_FILES['file'];
    $data = parseCsv($file['tmp_name']);
    if (empty($data)) {
        jsonResponse(['success' => false, 'message' => 'Dosya boş veya okunamadı']);
        return;
    }

    $headers = array_shift($data);
    $imported = 0;
    $errors = [];

    $columnMap = [
        'name' => findColumn($headers, ['ad', 'name', 'unvan', 'firma']),
        'type' => findColumn($headers, ['tür', 'type', 'tip']),
        'tax_no' => findColumn($headers, ['vergi no', 'tax_no', 'vergi numarası']),
        'phone' => findColumn($headers, ['telefon', 'phone', 'tel']),
        'email' => findColumn($headers, ['e-posta', 'email', 'mail']),
        'address' => findColumn($headers, ['adres', 'address'])
    ];

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            INSERT INTO parties (type, name, tax_no, phone, email, address, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        foreach ($data as $index => $row) {
            try {
                $name = getColumnValue($row, $columnMap['name'], $headers);
                if (empty($name)) continue;

                $type = strtolower(getColumnValue($row, $columnMap['type'], $headers) ?: 'customer');
                if (in_array($type, ['müşteri', 'customer'])) {
                    $type = 'customer';
                } elseif (in_array($type, ['tedarikçi', 'vendor'])) {
                    $type = 'vendor';
                } else {
                    $type = 'other';
                }

                $stmt->execute([
                    $type,
                    $name,
                    getColumnValue($row, $columnMap['tax_no'], $headers),
                    getColumnValue($row, $columnMap['phone'], $headers),
                    getColumnValue($row, $columnMap['email'], $headers),
                    getColumnValue($row, $columnMap['address'], $headers)
                ]);
                $imported++;
            } catch (Exception $e) {
                $errors[] = "Satır " . ($index + 2) . ": " . $e->getMessage();
            }
        }

        $db->commit();
        jsonResponse([
            'success' => true,
            'message' => "$imported cari başarıyla içe aktarıldı",
            'imported' => $imported,
            'errors' => $errors
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['success' => false, 'message' => 'İçe aktarma hatası: ' . $e->getMessage()]);
    }
}

function importCategories($db) {
    if (!isset($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenmedi']);
        return;
    }

    $file = $_FILES['file'];
    $data = parseCsv($file['tmp_name']);
    if (empty($data)) {
        jsonResponse(['success' => false, 'message' => 'Dosya boş veya okunamadı']);
        return;
    }

    $headers = array_shift($data);
    $imported = 0;
    $errors = [];

    $columnMap = [
        'name' => findColumn($headers, ['ad', 'name', 'kategori']),
        'type' => findColumn($headers, ['tür', 'type', 'tip'])
    ];

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("
            INSERT INTO categories (name, type, is_active, created_at, updated_at)
            VALUES (?, ?, 1, NOW(), NOW())
        ");

        foreach ($data as $index => $row) {
            try {
                $name = getColumnValue($row, $columnMap['name'], $headers);
                if (empty($name)) continue;

                $type = strtolower(getColumnValue($row, $columnMap['type'], $headers) ?: 'expense');
                if (in_array($type, ['gelir', 'income'])) {
                    $type = 'income';
                } else {
                    $type = 'expense';
                }

                $stmt->execute([$name, $type]);
                $imported++;
            } catch (Exception $e) {
                $errors[] = "Satır " . ($index + 2) . ": " . $e->getMessage();
            }
        }

        $db->commit();
        jsonResponse([
            'success' => true,
            'message' => "$imported kategori başarıyla içe aktarıldı",
            'imported' => $imported,
            'errors' => $errors
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['success' => false, 'message' => 'İçe aktarma hatası: ' . $e->getMessage()]);
    }
}

// Helper functions
function parseCsv($filepath) {
    $data = [];
    if (($handle = fopen($filepath, 'r')) !== false) {
        // Try to detect delimiter
        $firstLine = fgets($handle);
        rewind($handle);

        $delimiter = ',';
        if (substr_count($firstLine, ';') > substr_count($firstLine, ',')) {
            $delimiter = ';';
        } elseif (substr_count($firstLine, "\t") > substr_count($firstLine, ',')) {
            $delimiter = "\t";
        }

        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            // Skip empty rows
            if (count($row) === 1 && empty($row[0])) continue;
            $data[] = $row;
        }
        fclose($handle);
    }
    return $data;
}

function findColumn($headers, $possibleNames) {
    foreach ($headers as $index => $header) {
        $normalized = strtolower(trim($header));
        foreach ($possibleNames as $name) {
            if ($normalized === strtolower($name)) {
                return $index;
            }
        }
    }
    return null;
}

function getColumnValue($row, $columnIndex, $headers) {
    if ($columnIndex === null || !isset($row[$columnIndex])) {
        return null;
    }
    return trim($row[$columnIndex]);
}

function parseDate($dateStr) {
    if (empty($dateStr)) return null;

    // Try various date formats
    $formats = [
        'Y-m-d',
        'd.m.Y',
        'd/m/Y',
        'd-m-Y',
        'Y/m/d',
        'd.m.y',
        'd/m/y'
    ];

    foreach ($formats as $format) {
        $date = DateTime::createFromFormat($format, $dateStr);
        if ($date !== false) {
            return $date->format('Y-m-d');
        }
    }

    // Try strtotime as fallback
    $timestamp = strtotime($dateStr);
    if ($timestamp !== false) {
        return date('Y-m-d', $timestamp);
    }

    return null;
}

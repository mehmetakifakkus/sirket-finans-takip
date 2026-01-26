<?php
/**
 * Files Routes - General File Operations
 */

function handleFiles($db, $method, $id) {
    requireAuth();

    if ($id === 'open' && $method === 'POST') {
        openFile($db);
        return;
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                downloadFile($db, $id);
            } else {
                listFiles($db);
            }
            break;

        case 'POST':
            uploadFile($db);
            break;

        case 'DELETE':
            deleteFile($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function listFiles($db) {
    $type = $_GET['type'] ?? null;

    $sql = "SELECT * FROM files WHERE 1=1";
    $params = [];

    if ($type) {
        $sql .= " AND file_type = ?";
        $params[] = $type;
    }

    $sql .= " ORDER BY uploaded_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function uploadFile($db) {
    if (!isset($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenmedi']);
        return;
    }

    $file = $_FILES['file'];
    $fileType = $_POST['type'] ?? 'general';
    $relatedType = $_POST['relatedType'] ?? null;
    $relatedId = $_POST['relatedId'] ?? null;

    if ($file['size'] > MAX_FILE_SIZE) {
        jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük (max: ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB)']);
        return;
    }

    if (!in_array($file['type'], ALLOWED_MIME_TYPES)) {
        jsonResponse(['success' => false, 'message' => 'Desteklenmeyen dosya türü']);
        return;
    }

    $uploadDir = UPLOAD_DIR . $fileType . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'file-' . time() . '-' . mt_rand(100000, 999999) . '.' . $ext;
    $filepath = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenemedi']);
        return;
    }

    $stmt = $db->prepare("
        INSERT INTO files (filename, original_name, mime_type, file_size, file_type, related_type, related_id, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $filename,
        $file['name'],
        $file['type'],
        $file['size'],
        $fileType,
        $relatedType,
        $relatedId
    ]);

    $fileId = $db->lastInsertId();
    $stmt = $db->prepare("SELECT * FROM files WHERE id = ?");
    $stmt->execute([$fileId]);
    $savedFile = $stmt->fetch();

    jsonResponse(['success' => true, 'message' => 'Dosya yüklendi', 'file' => $savedFile]);
}

function downloadFile($db, $id) {
    $stmt = $db->prepare("SELECT * FROM files WHERE id = ?");
    $stmt->execute([$id]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonResponse(['success' => false, 'message' => 'Dosya bulunamadı'], 404);
        return;
    }

    $filepath = UPLOAD_DIR . $file['file_type'] . '/' . $file['filename'];

    if (!file_exists($filepath)) {
        jsonResponse(['success' => false, 'message' => 'Dosya bulunamadı'], 404);
        return;
    }

    header('Content-Type: ' . $file['mime_type']);
    header('Content-Disposition: attachment; filename="' . $file['original_name'] . '"');
    header('Content-Length: ' . filesize($filepath));
    readfile($filepath);
    exit;
}

function deleteFile($db, $id) {
    $stmt = $db->prepare("SELECT filename, file_type FROM files WHERE id = ?");
    $stmt->execute([$id]);
    $file = $stmt->fetch();

    if (!$file) {
        jsonResponse(['success' => false, 'message' => 'Dosya bulunamadı'], 404);
        return;
    }

    $filepath = UPLOAD_DIR . $file['file_type'] . '/' . $file['filename'];
    if (file_exists($filepath)) {
        unlink($filepath);
    }

    $db->prepare("DELETE FROM files WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Dosya silindi']);
}

function openFile($db) {
    $data = getRequestBody();
    $filepath = $data['path'] ?? null;

    if (!$filepath) {
        jsonResponse(['success' => false, 'message' => 'Dosya yolu belirtilmedi']);
        return;
    }

    // For web, we can't open files directly like in Electron
    // Instead, return the file URL for the frontend to handle
    jsonResponse([
        'success' => true,
        'message' => 'Web tarayıcısında dosya açılamaz, lütfen indirin',
        'url' => '/api/files/' . basename($filepath)
    ]);
}

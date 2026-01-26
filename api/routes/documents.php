<?php
/**
 * Documents Routes
 */

function handleDocuments($db, $method, $id, $action) {
    requireAuth();

    if ($id === 'transaction' && $action) {
        if ($method === 'GET') {
            $segments = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
            $lastSegment = end($segments);
            if ($lastSegment === 'count') {
                // Remove 'count' and get the transaction id
                array_pop($segments);
                $transactionId = end($segments);
                getDocumentCount($db, $transactionId);
            } else {
                getDocumentsByTransaction($db, $action);
            }
        }
        return;
    }

    if ($id === 'file' && $action && $method === 'GET') {
        downloadDocument($db, $action);
        return;
    }

    if ($action === 'preview' && $method === 'GET') {
        getDocumentPreview($db, $id);
        return;
    }

    switch ($method) {
        case 'POST':
            uploadDocument($db);
            break;

        case 'DELETE':
            deleteDocument($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function uploadDocument($db) {
    if (!isset($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenmedi']);
        return;
    }

    $file = $_FILES['file'];
    $transactionId = $_POST['transactionId'] ?? null;

    if (!$transactionId) {
        jsonResponse(['success' => false, 'message' => 'İşlem ID gerekli']);
        return;
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        jsonResponse(['success' => false, 'message' => 'Dosya boyutu çok büyük']);
        return;
    }

    if (!in_array($file['type'], ALLOWED_MIME_TYPES)) {
        jsonResponse(['success' => false, 'message' => 'Desteklenmeyen dosya türü']);
        return;
    }

    $uploadDir = UPLOAD_DIR . 'documents/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'doc-' . time() . '-' . mt_rand(100000, 999999) . '.' . $ext;
    $filepath = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        jsonResponse(['success' => false, 'message' => 'Dosya yüklenemedi']);
        return;
    }

    $stmt = $db->prepare("
        INSERT INTO transaction_documents (transaction_id, filename, original_name, mime_type, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $transactionId,
        $filename,
        $file['name'],
        $file['type'],
        $file['size']
    ]);

    $docId = $db->lastInsertId();
    $stmt = $db->prepare("SELECT * FROM transaction_documents WHERE id = ?");
    $stmt->execute([$docId]);
    $document = $stmt->fetch();

    jsonResponse(['success' => true, 'message' => 'Dosya yüklendi', 'document' => $document]);
}

function getDocumentsByTransaction($db, $transactionId) {
    $stmt = $db->prepare("SELECT * FROM transaction_documents WHERE transaction_id = ? ORDER BY uploaded_at DESC");
    $stmt->execute([$transactionId]);
    jsonResponse($stmt->fetchAll());
}

function getDocumentCount($db, $transactionId) {
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM transaction_documents WHERE transaction_id = ?");
    $stmt->execute([$transactionId]);
    $result = $stmt->fetch();
    jsonResponse((int)$result['count']);
}

function getDocumentPreview($db, $id) {
    $stmt = $db->prepare("SELECT filename, mime_type FROM transaction_documents WHERE id = ?");
    $stmt->execute([$id]);
    $document = $stmt->fetch();

    if (!$document) {
        jsonResponse(['success' => false, 'message' => 'Belge bulunamadı'], 404);
        return;
    }

    $filepath = UPLOAD_DIR . 'documents/' . $document['filename'];

    if (!file_exists($filepath)) {
        jsonResponse(['success' => false, 'message' => 'Dosya bulunamadı']);
        return;
    }

    if (strpos($document['mime_type'], 'image/') === 0) {
        $data = base64_encode(file_get_contents($filepath));
        jsonResponse([
            'success' => true,
            'data' => 'data:' . $document['mime_type'] . ';base64,' . $data,
            'mimeType' => $document['mime_type']
        ]);
    } else {
        jsonResponse(['success' => true, 'mimeType' => $document['mime_type']]);
    }
}

function downloadDocument($db, $filename) {
    $stmt = $db->prepare("SELECT original_name, mime_type FROM transaction_documents WHERE filename = ?");
    $stmt->execute([$filename]);
    $document = $stmt->fetch();

    if (!$document) {
        jsonResponse(['success' => false, 'message' => 'Belge bulunamadı'], 404);
        return;
    }

    $filepath = UPLOAD_DIR . 'documents/' . $filename;

    if (!file_exists($filepath)) {
        jsonResponse(['success' => false, 'message' => 'Dosya bulunamadı'], 404);
        return;
    }

    header('Content-Type: ' . $document['mime_type']);
    header('Content-Disposition: inline; filename="' . $document['original_name'] . '"');
    readfile($filepath);
    exit;
}

function deleteDocument($db, $id) {
    $stmt = $db->prepare("SELECT filename FROM transaction_documents WHERE id = ?");
    $stmt->execute([$id]);
    $document = $stmt->fetch();

    if (!$document) {
        jsonResponse(['success' => false, 'message' => 'Belge bulunamadı'], 404);
        return;
    }

    $filepath = UPLOAD_DIR . 'documents/' . $document['filename'];
    if (file_exists($filepath)) {
        unlink($filepath);
    }

    $db->prepare("DELETE FROM transaction_documents WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Belge silindi']);
}

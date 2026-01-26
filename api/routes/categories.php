<?php
/**
 * Categories Routes
 */

function handleCategories($db, $method, $id, $action) {
    requireAuth();

    if ($id === 'merge' && $method === 'POST') {
        mergeCategories($db);
        return;
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                getCategory($db, $id);
            } else {
                getCategories($db);
            }
            break;

        case 'POST':
            createCategory($db);
            break;

        case 'PUT':
            updateCategory($db, $id);
            break;

        case 'DELETE':
            deleteCategory($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getCategories($db) {
    $type = $_GET['type'] ?? null;

    $sql = "SELECT * FROM categories WHERE 1=1";
    $params = [];

    if ($type) {
        $sql .= " AND type = ?";
        $params[] = $type;
    }

    $sql .= " ORDER BY name ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getCategory($db, $id) {
    $stmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
    $stmt->execute([$id]);
    $category = $stmt->fetch();

    if (!$category) {
        jsonResponse(['success' => false, 'message' => 'Kategori bulunamadı'], 404);
        return;
    }

    jsonResponse($category);
}

function createCategory($db) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO categories (name, type, parent_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['name'],
        $data['type'],
        $data['parent_id'] ?? null,
        isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : 1
    ]);

    jsonResponse(['success' => true, 'message' => 'Kategori oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function updateCategory($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE categories SET name = ?, type = ?, parent_id = ?, is_active = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['name'],
        $data['type'],
        $data['parent_id'] ?? null,
        isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : 1,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Kategori güncellendi']);
}

function deleteCategory($db, $id) {
    $stmt = $db->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Kategori silindi']);
}

function mergeCategories($db) {
    $data = getRequestBody();
    $sourceId = $data['sourceId'];
    $targetId = $data['targetId'];

    $stmt = $db->prepare("UPDATE transactions SET category_id = ?, updated_at = NOW() WHERE category_id = ?");
    $stmt->execute([$targetId, $sourceId]);
    $moved = $stmt->rowCount();

    $db->prepare("DELETE FROM categories WHERE id = ?")->execute([$sourceId]);

    jsonResponse(['success' => true, 'message' => 'Kategoriler birleştirildi', 'transactionsMoved' => $moved]);
}

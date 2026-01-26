<?php
/**
 * Parties Routes
 */

function handleParties($db, $method, $id, $action) {
    requireAuth();

    if ($id === 'merge' && $method === 'POST') {
        mergeParties($db);
        return;
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                getParty($db, $id);
            } else {
                getParties($db);
            }
            break;

        case 'POST':
            createParty($db);
            break;

        case 'PUT':
            updateParty($db, $id);
            break;

        case 'DELETE':
            deleteParty($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getParties($db) {
    $type = $_GET['type'] ?? null;
    $search = $_GET['search'] ?? null;

    $sql = "SELECT * FROM parties WHERE 1=1";
    $params = [];

    if ($type) {
        $sql .= " AND type = ?";
        $params[] = $type;
    }
    if ($search) {
        $sql .= " AND (name LIKE ? OR tax_no LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $sql .= " ORDER BY name ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getParty($db, $id) {
    $stmt = $db->prepare("SELECT * FROM parties WHERE id = ?");
    $stmt->execute([$id]);
    $party = $stmt->fetch();

    if (!$party) {
        jsonResponse(['success' => false, 'message' => 'Cari bulunamadı'], 404);
        return;
    }

    jsonResponse($party);
}

function createParty($db) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO parties (type, name, tax_no, phone, email, address, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['type'] ?? 'customer',
        $data['name'],
        $data['tax_no'] ?? null,
        $data['phone'] ?? null,
        $data['email'] ?? null,
        $data['address'] ?? null,
        $data['notes'] ?? null
    ]);

    jsonResponse(['success' => true, 'message' => 'Cari oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function updateParty($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE parties SET type = ?, name = ?, tax_no = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['type'] ?? 'customer',
        $data['name'],
        $data['tax_no'] ?? null,
        $data['phone'] ?? null,
        $data['email'] ?? null,
        $data['address'] ?? null,
        $data['notes'] ?? null,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Cari güncellendi']);
}

function deleteParty($db, $id) {
    $stmt = $db->prepare("DELETE FROM parties WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Cari silindi']);
}

function mergeParties($db) {
    $data = getRequestBody();
    $sourceId = $data['sourceId'];
    $targetId = $data['targetId'];

    $stmt = $db->prepare("UPDATE transactions SET party_id = ?, updated_at = NOW() WHERE party_id = ?");
    $stmt->execute([$targetId, $sourceId]);
    $moved = $stmt->rowCount();

    $db->prepare("UPDATE debts SET party_id = ?, updated_at = NOW() WHERE party_id = ?")->execute([$targetId, $sourceId]);
    $db->prepare("UPDATE projects SET party_id = ?, updated_at = NOW() WHERE party_id = ?")->execute([$targetId, $sourceId]);
    $db->prepare("DELETE FROM parties WHERE id = ?")->execute([$sourceId]);

    jsonResponse(['success' => true, 'message' => 'Cariler birleştirildi', 'recordsMoved' => $moved]);
}

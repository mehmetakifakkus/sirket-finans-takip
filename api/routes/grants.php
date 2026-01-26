<?php
/**
 * Grants Routes
 */

function handleGrants($db, $method, $id, $action) {
    requireAuth();

    if ($id === 'calculate' && $method === 'POST') {
        calculateGrantAmount($db);
        return;
    }

    switch ($method) {
        case 'GET':
            getGrant($db, $id);
            break;

        case 'POST':
            createGrant($db);
            break;

        case 'PUT':
            updateGrant($db, $id);
            break;

        case 'DELETE':
            deleteGrant($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getGrant($db, $id) {
    $stmt = $db->prepare("SELECT g.*, p.title as project_title FROM project_grants g LEFT JOIN projects p ON g.project_id = p.id WHERE g.id = ?");
    $stmt->execute([$id]);
    $grant = $stmt->fetch();

    if (!$grant) {
        jsonResponse(['success' => false, 'message' => 'Hibe bulunamadı'], 404);
        return;
    }

    jsonResponse($grant);
}

function createGrant($db) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO project_grants (project_id, provider_name, provider_type, funding_rate, funding_amount,
        vat_excluded, approved_amount, received_amount, currency, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['project_id'],
        $data['provider_name'],
        $data['provider_type'],
        $data['funding_rate'] ?? null,
        $data['funding_amount'] ?? null,
        isset($data['vat_excluded']) ? ($data['vat_excluded'] ? 1 : 0) : 1,
        $data['approved_amount'] ?? 0,
        $data['received_amount'] ?? 0,
        $data['currency'] ?? 'TRY',
        $data['status'] ?? 'pending',
        $data['notes'] ?? null
    ]);

    jsonResponse(['success' => true, 'message' => 'Hibe oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function updateGrant($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE project_grants SET provider_name = ?, provider_type = ?, funding_rate = ?, funding_amount = ?,
        vat_excluded = ?, approved_amount = ?, received_amount = ?, currency = ?, status = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['provider_name'],
        $data['provider_type'],
        $data['funding_rate'] ?? null,
        $data['funding_amount'] ?? null,
        isset($data['vat_excluded']) ? ($data['vat_excluded'] ? 1 : 0) : 1,
        $data['approved_amount'] ?? 0,
        $data['received_amount'] ?? 0,
        $data['currency'] ?? 'TRY',
        $data['status'] ?? 'pending',
        $data['notes'] ?? null,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Hibe güncellendi']);
}

function deleteGrant($db, $id) {
    $stmt = $db->prepare("DELETE FROM project_grants WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Hibe silindi']);
}

function calculateGrantAmount($db) {
    $data = getRequestBody();
    $projectId = $data['projectId'];
    $rate = $data['rate'];
    $vatExcluded = $data['vatExcluded'];

    $amountField = $vatExcluded ? 'amount' : 'net_amount';
    $stmt = $db->prepare("SELECT COALESCE(SUM($amountField), 0) as total FROM transactions WHERE project_id = ? AND type = 'expense'");
    $stmt->execute([$projectId]);
    $result = $stmt->fetch();

    $grantAmount = $result['total'] * ($rate / 100);
    jsonResponse($grantAmount);
}

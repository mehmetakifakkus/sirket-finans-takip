<?php
/**
 * Milestones Routes
 */

function handleMilestones($db, $method, $id) {
    requireAuth();

    switch ($method) {
        case 'GET':
            getMilestone($db, $id);
            break;

        case 'POST':
            createMilestone($db);
            break;

        case 'PUT':
            updateMilestone($db, $id);
            break;

        case 'DELETE':
            deleteMilestone($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getMilestone($db, $id) {
    $stmt = $db->prepare("
        SELECT m.*, p.title as project_title
        FROM project_milestones m
        LEFT JOIN projects p ON m.project_id = p.id
        WHERE m.id = ?
    ");
    $stmt->execute([$id]);
    $milestone = $stmt->fetch();

    if (!$milestone) {
        jsonResponse(['success' => false, 'message' => 'Kilometre taşı bulunamadı'], 404);
        return;
    }

    jsonResponse($milestone);
}

function createMilestone($db) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO project_milestones (project_id, title, expected_date, expected_amount, currency, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['project_id'],
        $data['title'],
        $data['expected_date'] ?? null,
        $data['expected_amount'] ?? 0,
        $data['currency'] ?? 'TRY',
        $data['status'] ?? 'pending',
        $data['notes'] ?? null
    ]);

    jsonResponse(['success' => true, 'message' => 'Kilometre taşı oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function updateMilestone($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE project_milestones SET title = ?, expected_date = ?, expected_amount = ?, currency = ?, status = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['title'],
        $data['expected_date'] ?? null,
        $data['expected_amount'] ?? 0,
        $data['currency'] ?? 'TRY',
        $data['status'] ?? 'pending',
        $data['notes'] ?? null,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Kilometre taşı güncellendi']);
}

function deleteMilestone($db, $id) {
    $stmt = $db->prepare("DELETE FROM project_milestones WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Kilometre taşı silindi']);
}

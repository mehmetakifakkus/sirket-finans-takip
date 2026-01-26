<?php
/**
 * Installments Routes
 */

function handleInstallments($db, $method, $id, $action) {
    requireAuth();

    if ($action === 'payment' && $method === 'POST') {
        addPayment($db, $id);
        return;
    }

    switch ($method) {
        case 'GET':
            getInstallment($db, $id);
            break;

        case 'PUT':
            updateInstallment($db, $id);
            break;

        case 'DELETE':
            deleteInstallment($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getInstallment($db, $id) {
    $stmt = $db->prepare("
        SELECT i.*, d.kind as debt_kind, d.party_id, p.name as party_name
        FROM installments i
        LEFT JOIN debts d ON i.debt_id = d.id
        LEFT JOIN parties p ON d.party_id = p.id
        WHERE i.id = ?
    ");
    $stmt->execute([$id]);
    $installment = $stmt->fetch();

    if (!$installment) {
        jsonResponse(['success' => false, 'message' => 'Taksit bulunamadı'], 404);
        return;
    }

    jsonResponse($installment);
}

function updateInstallment($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE installments SET due_date = ?, amount = ?, currency = ?, status = ?,
        paid_amount = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['due_date'],
        $data['amount'],
        $data['currency'] ?? 'TRY',
        $data['status'] ?? 'pending',
        $data['paid_amount'] ?? 0,
        $data['notes'] ?? null,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Taksit güncellendi']);
}

function deleteInstallment($db, $id) {
    $stmt = $db->prepare("DELETE FROM installments WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Taksit silindi']);
}

function addPayment($db, $installmentId) {
    $data = getRequestBody();

    $stmt = $db->prepare("SELECT debt_id, amount, paid_amount, currency FROM installments WHERE id = ?");
    $stmt->execute([$installmentId]);
    $installment = $stmt->fetch();

    if (!$installment) {
        jsonResponse(['success' => false, 'message' => 'Taksit bulunamadı'], 404);
        return;
    }

    $newPaidAmount = $installment['paid_amount'] + $data['amount'];
    $newStatus = $newPaidAmount >= $installment['amount'] ? 'paid' : 'partial';

    // Update installment
    $stmt = $db->prepare("UPDATE installments SET paid_amount = ?, status = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$newPaidAmount, $newStatus, $installmentId]);

    // Create payment record
    $stmt = $db->prepare("
        INSERT INTO payments (related_type, related_id, date, amount, currency, method, notes, created_at, updated_at)
        VALUES ('installment', ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    $stmt->execute([
        $installmentId,
        $data['date'],
        $data['amount'],
        $installment['currency'],
        $data['method'] ?? 'bank',
        $data['notes'] ?? null
    ]);

    // Check if all installments are paid
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM installments WHERE debt_id = ? AND status != 'paid'");
    $stmt->execute([$installment['debt_id']]);
    $unpaid = $stmt->fetch();

    if ($unpaid['count'] == 0) {
        $stmt = $db->prepare("UPDATE debts SET status = 'closed', updated_at = NOW() WHERE id = ?");
        $stmt->execute([$installment['debt_id']]);
    }

    jsonResponse(['success' => true, 'message' => 'Ödeme kaydedildi']);
}

<?php
/**
 * Payments Routes
 */

function handlePayments($db, $method, $id) {
    requireAuth();

    switch ($method) {
        case 'GET':
            getPayments($db);
            break;

        case 'DELETE':
            deletePayment($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getPayments($db) {
    $relatedType = $_GET['relatedType'] ?? null;
    $relatedId = $_GET['relatedId'] ?? null;
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;

    $sql = "SELECT * FROM payments WHERE 1=1";
    $params = [];

    if ($relatedType) {
        $sql .= " AND related_type = ?";
        $params[] = $relatedType;
    }
    if ($relatedId) {
        $sql .= " AND related_id = ?";
        $params[] = $relatedId;
    }
    if ($startDate) {
        $sql .= " AND date >= ?";
        $params[] = $startDate;
    }
    if ($endDate) {
        $sql .= " AND date <= ?";
        $params[] = $endDate;
    }

    $sql .= " ORDER BY date DESC, id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function deletePayment($db, $id) {
    $stmt = $db->prepare("SELECT related_type, related_id, amount FROM payments WHERE id = ?");
    $stmt->execute([$id]);
    $payment = $stmt->fetch();

    if ($payment && $payment['related_type'] === 'installment') {
        $db->prepare("
            UPDATE installments SET
                paid_amount = paid_amount - ?,
                status = CASE WHEN paid_amount - ? <= 0 THEN 'pending' ELSE 'partial' END,
                updated_at = NOW()
            WHERE id = ?
        ")->execute([$payment['amount'], $payment['amount'], $payment['related_id']]);
    }

    $db->prepare("DELETE FROM payments WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Ödeme silindi']);
}

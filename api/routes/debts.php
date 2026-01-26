<?php
/**
 * Debts Routes
 */

function handleDebts($db, $method, $id, $action) {
    requireAuth();

    if ($id === 'export') {
        exportDebts($db);
        return;
    }

    if ($action === 'installments' && $method === 'POST') {
        createInstallments($db, $id);
        return;
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                getDebt($db, $id);
            } else {
                getDebts($db);
            }
            break;

        case 'POST':
            createDebt($db);
            break;

        case 'PUT':
            updateDebt($db, $id);
            break;

        case 'DELETE':
            deleteDebt($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getDebts($db) {
    $kind = $_GET['kind'] ?? null;
    $status = $_GET['status'] ?? null;
    $partyId = $_GET['partyId'] ?? null;

    $sql = "SELECT d.*, p.name as party_name,
                   (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as paid_amount,
                   (SELECT COUNT(*) FROM installments WHERE debt_id = d.id) as installment_count
            FROM debts d
            LEFT JOIN parties p ON d.party_id = p.id
            WHERE 1=1";
    $params = [];

    if ($kind) {
        $sql .= " AND d.kind = ?";
        $params[] = $kind;
    }
    if ($status) {
        $sql .= " AND d.status = ?";
        $params[] = $status;
    }
    if ($partyId) {
        $sql .= " AND d.party_id = ?";
        $params[] = $partyId;
    }

    $sql .= " ORDER BY d.due_date ASC, d.id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getDebt($db, $id) {
    $stmt = $db->prepare("SELECT d.*, p.name as party_name FROM debts d LEFT JOIN parties p ON d.party_id = p.id WHERE d.id = ?");
    $stmt->execute([$id]);
    $debt = $stmt->fetch();

    if (!$debt) {
        jsonResponse(['success' => false, 'message' => 'Borç/alacak bulunamadı'], 404);
        return;
    }

    $stmt = $db->prepare("SELECT * FROM installments WHERE debt_id = ? ORDER BY due_date ASC");
    $stmt->execute([$id]);
    $debt['installments'] = $stmt->fetchAll();

    jsonResponse($debt);
}

function createDebt($db) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO debts (kind, party_id, principal_amount, currency, vat_rate, start_date, due_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['kind'],
        $data['party_id'],
        $data['principal_amount'],
        $data['currency'] ?? 'TRY',
        $data['vat_rate'] ?? 0,
        $data['start_date'] ?? null,
        $data['due_date'] ?? null,
        $data['status'] ?? 'open',
        $data['notes'] ?? null
    ]);

    jsonResponse(['success' => true, 'message' => 'Borç/alacak oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function updateDebt($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE debts SET kind = ?, party_id = ?, principal_amount = ?, currency = ?,
        vat_rate = ?, start_date = ?, due_date = ?, status = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['kind'],
        $data['party_id'],
        $data['principal_amount'],
        $data['currency'] ?? 'TRY',
        $data['vat_rate'] ?? 0,
        $data['start_date'] ?? null,
        $data['due_date'] ?? null,
        $data['status'] ?? 'open',
        $data['notes'] ?? null,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Borç/alacak güncellendi']);
}

function deleteDebt($db, $id) {
    $stmt = $db->prepare("DELETE FROM debts WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Borç/alacak silindi']);
}

function createInstallments($db, $debtId) {
    $data = getRequestBody();
    $count = (int)$data['count'];
    $startDate = $data['startDate'] ?? date('Y-m-d');

    $stmt = $db->prepare("SELECT principal_amount, vat_rate, currency FROM debts WHERE id = ?");
    $stmt->execute([$debtId]);
    $debt = $stmt->fetch();

    if (!$debt) {
        jsonResponse(['success' => false, 'message' => 'Borç/alacak bulunamadı'], 404);
        return;
    }

    $totalAmount = $debt['principal_amount'] * (1 + $debt['vat_rate'] / 100);
    $installmentAmount = $totalAmount / $count;

    // Delete existing installments
    $stmt = $db->prepare("DELETE FROM installments WHERE debt_id = ?");
    $stmt->execute([$debtId]);

    // Create new installments
    $stmt = $db->prepare("
        INSERT INTO installments (debt_id, due_date, amount, currency, status, paid_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', 0, NOW(), NOW())
    ");

    $date = new DateTime($startDate);
    for ($i = 0; $i < $count; $i++) {
        $stmt->execute([
            $debtId,
            $date->format('Y-m-d'),
            $installmentAmount,
            $debt['currency']
        ]);
        $date->modify('+1 month');
    }

    jsonResponse(['success' => true, 'message' => "$count taksit oluşturuldu"]);
}

function exportDebts($db) {
    $kind = $_GET['kind'] ?? null;
    $status = $_GET['status'] ?? null;

    $sql = "SELECT d.*, p.name as party_name,
                   (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as paid_amount
            FROM debts d LEFT JOIN parties p ON d.party_id = p.id WHERE 1=1";
    $params = [];

    if ($kind) {
        $sql .= " AND d.kind = ?";
        $params[] = $kind;
    }
    if ($status) {
        $sql .= " AND d.status = ?";
        $params[] = $status;
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $debts = $stmt->fetchAll();

    $csv = "\xEF\xBB\xBF";
    $csv .= "Tür,Cari,Ana Para,Para Birimi,KDV Oranı,Başlangıç,Vade,Durum,Ödenen,Notlar\n";

    foreach ($debts as $d) {
        $csv .= sprintf(
            '"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
            $d['kind'] === 'debt' ? 'Borç' : 'Alacak',
            $d['party_name'] ?? '',
            $d['principal_amount'],
            $d['currency'],
            $d['vat_rate'],
            $d['start_date'] ?? '',
            $d['due_date'] ?? '',
            $d['status'] === 'open' ? 'Açık' : 'Kapalı',
            $d['paid_amount'],
            $d['notes'] ?? ''
        );
    }

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=borc_alacak_' . date('Y-m-d') . '.csv');
    echo $csv;
    exit;
}

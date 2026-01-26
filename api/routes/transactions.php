<?php
/**
 * Transactions Routes
 */

function handleTransactions($db, $method, $id, $action) {
    $user = requireAuth();

    // Handle special routes
    if ($id === 'export') {
        exportTransactions($db);
        return;
    }

    if ($id === 'unassigned') {
        getUnassignedTransactions($db);
        return;
    }

    if ($id === 'assign-to-project' && $method === 'POST') {
        assignToProject($db);
        return;
    }

    if ($id === 'project' && $action) {
        getTransactionsByProject($db, $action);
        return;
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                getTransaction($db, $id);
            } else {
                getTransactions($db);
            }
            break;

        case 'POST':
            createTransaction($db, $user);
            break;

        case 'PUT':
            updateTransaction($db, $id);
            break;

        case 'DELETE':
            deleteTransaction($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getTransactions($db) {
    $type = $_GET['type'] ?? null;
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;
    $partyId = $_GET['partyId'] ?? null;
    $categoryId = $_GET['categoryId'] ?? null;
    $projectId = $_GET['projectId'] ?? null;
    $search = $_GET['search'] ?? null;

    $sql = "SELECT t.*, p.name as party_name, c.name as category_name, pr.title as project_title
            FROM transactions t
            LEFT JOIN parties p ON t.party_id = p.id
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN projects pr ON t.project_id = pr.id
            WHERE 1=1";
    $params = [];

    if ($type) {
        $sql .= " AND t.type = ?";
        $params[] = $type;
    }
    if ($startDate) {
        $sql .= " AND t.date >= ?";
        $params[] = $startDate;
    }
    if ($endDate) {
        $sql .= " AND t.date <= ?";
        $params[] = $endDate;
    }
    if ($partyId) {
        $sql .= " AND t.party_id = ?";
        $params[] = $partyId;
    }
    if ($categoryId) {
        $sql .= " AND t.category_id = ?";
        $params[] = $categoryId;
    }
    if ($projectId) {
        $sql .= " AND t.project_id = ?";
        $params[] = $projectId;
    }
    if ($search) {
        $sql .= " AND (t.description LIKE ? OR t.ref_no LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $sql .= " ORDER BY t.date DESC, t.id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();

    jsonResponse($transactions);
}

function getTransaction($db, $id) {
    $stmt = $db->prepare("
        SELECT t.*, p.name as party_name, c.name as category_name,
               pr.title as project_title, m.title as milestone_title
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN projects pr ON t.project_id = pr.id
        LEFT JOIN project_milestones m ON t.milestone_id = m.id
        WHERE t.id = ?
    ");
    $stmt->execute([$id]);
    $transaction = $stmt->fetch();

    if (!$transaction) {
        jsonResponse(['success' => false, 'message' => 'İşlem bulunamadı'], 404);
        return;
    }

    jsonResponse($transaction);
}

function getUnassignedTransactions($db) {
    $type = $_GET['type'] ?? null;
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;

    $sql = "SELECT t.*, p.name as party_name, c.name as category_name
            FROM transactions t
            LEFT JOIN parties p ON t.party_id = p.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.project_id IS NULL";
    $params = [];

    if ($type) {
        $sql .= " AND t.type = ?";
        $params[] = $type;
    }
    if ($startDate) {
        $sql .= " AND t.date >= ?";
        $params[] = $startDate;
    }
    if ($endDate) {
        $sql .= " AND t.date <= ?";
        $params[] = $endDate;
    }

    $sql .= " ORDER BY t.date DESC, t.id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getTransactionsByProject($db, $projectId) {
    $stmt = $db->prepare("
        SELECT t.*, p.name as party_name, c.name as category_name, m.title as milestone_title
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN project_milestones m ON t.milestone_id = m.id
        WHERE t.project_id = ?
        ORDER BY t.date DESC, t.id DESC
    ");
    $stmt->execute([$projectId]);
    jsonResponse($stmt->fetchAll());
}

function createTransaction($db, $user) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO transactions (
            type, party_id, category_id, project_id, milestone_id, date,
            amount, currency, vat_rate, vat_amount, withholding_rate,
            withholding_amount, net_amount, description, ref_no, document_path,
            created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['type'],
        $data['party_id'] ?? null,
        $data['category_id'] ?? null,
        $data['project_id'] ?? null,
        $data['milestone_id'] ?? null,
        $data['date'],
        $data['amount'],
        $data['currency'] ?? 'TRY',
        $data['vat_rate'] ?? 0,
        $data['vat_amount'] ?? 0,
        $data['withholding_rate'] ?? 0,
        $data['withholding_amount'] ?? 0,
        $data['net_amount'],
        $data['description'] ?? null,
        $data['ref_no'] ?? null,
        $data['document_path'] ?? null,
        $user['userId']
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'İşlem oluşturuldu',
        'id' => (int)$db->lastInsertId()
    ]);
}

function updateTransaction($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE transactions SET
            type = ?, party_id = ?, category_id = ?, project_id = ?,
            milestone_id = ?, date = ?, amount = ?, currency = ?,
            vat_rate = ?, vat_amount = ?, withholding_rate = ?,
            withholding_amount = ?, net_amount = ?, description = ?,
            ref_no = ?, document_path = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['type'],
        $data['party_id'] ?? null,
        $data['category_id'] ?? null,
        $data['project_id'] ?? null,
        $data['milestone_id'] ?? null,
        $data['date'],
        $data['amount'],
        $data['currency'] ?? 'TRY',
        $data['vat_rate'] ?? 0,
        $data['vat_amount'] ?? 0,
        $data['withholding_rate'] ?? 0,
        $data['withholding_amount'] ?? 0,
        $data['net_amount'],
        $data['description'] ?? null,
        $data['ref_no'] ?? null,
        $data['document_path'] ?? null,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'İşlem güncellendi']);
}

function deleteTransaction($db, $id) {
    $stmt = $db->prepare("DELETE FROM transactions WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true, 'message' => 'İşlem silindi']);
}

function assignToProject($db) {
    $data = getRequestBody();
    $transactionIds = $data['transactionIds'] ?? [];
    $projectId = $data['projectId'];

    if (empty($transactionIds)) {
        jsonResponse(['success' => false, 'message' => 'İşlem seçilmedi', 'count' => 0]);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($transactionIds), '?'));
    $params = array_merge([$projectId], $transactionIds);

    $stmt = $db->prepare("UPDATE transactions SET project_id = ?, updated_at = NOW() WHERE id IN ($placeholders)");
    $stmt->execute($params);

    jsonResponse([
        'success' => true,
        'message' => 'İşlemler projeye atandı',
        'count' => count($transactionIds)
    ]);
}

function exportTransactions($db) {
    $type = $_GET['type'] ?? null;
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;

    $sql = "SELECT t.date, t.type, t.amount, t.currency, t.vat_rate, t.vat_amount,
                   t.withholding_rate, t.withholding_amount, t.net_amount,
                   t.description, t.ref_no, p.name as party_name, c.name as category_name
            FROM transactions t
            LEFT JOIN parties p ON t.party_id = p.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE 1=1";
    $params = [];

    if ($type) {
        $sql .= " AND t.type = ?";
        $params[] = $type;
    }
    if ($startDate) {
        $sql .= " AND t.date >= ?";
        $params[] = $startDate;
    }
    if ($endDate) {
        $sql .= " AND t.date <= ?";
        $params[] = $endDate;
    }

    $sql .= " ORDER BY t.date DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll();

    // Generate CSV
    $csv = "\xEF\xBB\xBF"; // UTF-8 BOM
    $csv .= "Tarih,Tür,Tutar,Para Birimi,KDV Oranı,KDV Tutarı,Stopaj Oranı,Stopaj Tutarı,Net Tutar,Açıklama,Referans No,Cari,Kategori\n";

    foreach ($transactions as $t) {
        $csv .= sprintf(
            '"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
            $t['date'],
            $t['type'] === 'income' ? 'Gelir' : 'Gider',
            $t['amount'],
            $t['currency'],
            $t['vat_rate'],
            $t['vat_amount'],
            $t['withholding_rate'],
            $t['withholding_amount'],
            $t['net_amount'],
            $t['description'] ?? '',
            $t['ref_no'] ?? '',
            $t['party_name'] ?? '',
            $t['category_name'] ?? ''
        );
    }

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=islemler_' . date('Y-m-d') . '.csv');
    echo $csv;
    exit;
}

<?php
/**
 * Projects Routes
 */

function handleProjects($db, $method, $id, $action) {
    requireAuth();

    if ($id === 'incomplete-count' && $method === 'GET') {
        getIncompleteCount($db);
        return;
    }

    if ($action === 'grants' && $method === 'GET') {
        getProjectGrants($db, $id);
        return;
    }

    if ($action === 'totals' && $method === 'GET') {
        // grants/totals route handling
        $segments = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
        if (in_array('grants', $segments)) {
            getGrantTotals($db, $id);
            return;
        }
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                getProject($db, $id);
            } else {
                getProjects($db);
            }
            break;

        case 'POST':
            createProject($db);
            break;

        case 'PUT':
            updateProject($db, $id);
            break;

        case 'DELETE':
            deleteProject($db, $id);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getProjects($db) {
    $status = $_GET['status'] ?? null;
    $partyId = $_GET['partyId'] ?? null;
    $search = $_GET['search'] ?? null;

    $sql = "SELECT p.*, pa.name as party_name,
                   (SELECT COUNT(*) FROM project_milestones WHERE project_id = p.id) as milestone_count,
                   (SELECT COUNT(*) FROM transactions WHERE project_id = p.id) as transaction_count,
                   (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE -net_amount END), 0) FROM transactions WHERE project_id = p.id) as balance
            FROM projects p
            LEFT JOIN parties pa ON p.party_id = pa.id
            WHERE 1=1";
    $params = [];

    if ($status) {
        $sql .= " AND p.status = ?";
        $params[] = $status;
    }
    if ($partyId) {
        $sql .= " AND p.party_id = ?";
        $params[] = $partyId;
    }
    if ($search) {
        $sql .= " AND p.title LIKE ?";
        $params[] = "%$search%";
    }

    $sql .= " ORDER BY p.created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getProject($db, $id) {
    $stmt = $db->prepare("SELECT p.*, pa.name as party_name FROM projects p LEFT JOIN parties pa ON p.party_id = pa.id WHERE p.id = ?");
    $stmt->execute([$id]);
    $project = $stmt->fetch();

    if (!$project) {
        jsonResponse(['success' => false, 'message' => 'Proje bulunamadı'], 404);
        return;
    }

    $stmt = $db->prepare("SELECT * FROM project_milestones WHERE project_id = ? ORDER BY expected_date ASC");
    $stmt->execute([$id]);
    $project['milestones'] = $stmt->fetchAll();

    $stmt = $db->prepare("
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as total_income,
               COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as total_expense,
               COUNT(*) as transaction_count
        FROM transactions WHERE project_id = ?
    ");
    $stmt->execute([$id]);
    $project['summary'] = $stmt->fetch();

    jsonResponse($project);
}

function getIncompleteCount($db) {
    // Count external projects (has party_id) with missing start_date or end_date
    $stmt = $db->prepare("
        SELECT COUNT(*) as count FROM projects
        WHERE status NOT IN ('completed', 'cancelled')
        AND party_id IS NOT NULL
        AND (start_date IS NULL OR end_date IS NULL)
    ");
    $stmt->execute();
    $result = $stmt->fetch();
    jsonResponse((int)$result['count']);
}

function getProjectGrants($db, $projectId) {
    $stmt = $db->prepare("SELECT * FROM project_grants WHERE project_id = ? ORDER BY created_at DESC");
    $stmt->execute([$projectId]);
    jsonResponse($stmt->fetchAll());
}

function getGrantTotals($db, $projectId) {
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(approved_amount), 0) as total_approved,
               COALESCE(SUM(received_amount), 0) as total_received
        FROM project_grants WHERE project_id = ?
    ");
    $stmt->execute([$projectId]);
    $result = $stmt->fetch();
    jsonResponse([
        'total_approved' => (float)$result['total_approved'],
        'total_received' => (float)$result['total_received']
    ]);
}

function createProject($db) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        INSERT INTO projects (party_id, title, contract_amount, currency, start_date, end_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['party_id'] ?? null,
        $data['title'],
        $data['contract_amount'] ?? 0,
        $data['currency'] ?? 'TRY',
        $data['start_date'] ?? null,
        $data['end_date'] ?? null,
        $data['status'] ?? 'active',
        $data['notes'] ?? null
    ]);

    jsonResponse(['success' => true, 'message' => 'Proje oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function updateProject($db, $id) {
    $data = getRequestBody();

    $stmt = $db->prepare("
        UPDATE projects SET party_id = ?, title = ?, contract_amount = ?, currency = ?,
        start_date = ?, end_date = ?, status = ?, notes = ?, updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $data['party_id'] ?? null,
        $data['title'],
        $data['contract_amount'] ?? 0,
        $data['currency'] ?? 'TRY',
        $data['start_date'] ?? null,
        $data['end_date'] ?? null,
        $data['status'] ?? 'active',
        $data['notes'] ?? null,
        $id
    ]);

    jsonResponse(['success' => true, 'message' => 'Proje güncellendi']);
}

function deleteProject($db, $id) {
    $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Proje silindi']);
}

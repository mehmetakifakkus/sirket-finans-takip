<?php
/**
 * Reports Routes
 */

function handleReports($db, $method, $action, $subAction) {
    requireAuth();

    if ($method !== 'GET') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }

    switch ($action) {
        case 'dashboard':
            getDashboard($db);
            break;

        case 'summary':
            getSummary($db);
            break;

        case 'transactions':
            getTransactionReport($db);
            break;

        case 'debts':
            getDebtReport($db);
            break;

        case 'projects':
            getProjectReport($db);
            break;

        case 'export':
            exportReport($db, $subAction);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Endpoint bulunamadı'], 404);
    }
}

function getDashboard($db) {
    $today = date('Y-m-d');
    $monthStart = date('Y-m-01');
    $monthEnd = date('Y-m-t');
    $lastMonthStart = date('Y-m-01', strtotime('-1 month'));
    $lastMonthEnd = date('Y-m-t', strtotime('-1 month'));

    // Current month
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as income,
               COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as expense
        FROM transactions WHERE date >= ? AND date <= ?
    ");
    $stmt->execute([$monthStart, $monthEnd]);
    $currentMonth = $stmt->fetch();

    // Last month
    $stmt->execute([$lastMonthStart, $lastMonthEnd]);
    $lastMonth = $stmt->fetch();

    // Open debts
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(CASE WHEN kind = 'debt' THEN principal_amount ELSE 0 END), 0) as total_debt,
               COALESCE(SUM(CASE WHEN kind = 'receivable' THEN principal_amount ELSE 0 END), 0) as total_receivable
        FROM debts WHERE status = 'open'
    ");
    $stmt->execute();
    $debts = $stmt->fetch();

    // Upcoming installments
    $stmt = $db->prepare("
        SELECT i.*, d.kind, p.name as party_name
        FROM installments i
        JOIN debts d ON i.debt_id = d.id
        JOIN parties p ON d.party_id = p.id
        WHERE i.status != 'paid' AND i.due_date >= ? AND i.due_date <= DATE_ADD(?, INTERVAL 30 DAY)
        ORDER BY i.due_date ASC LIMIT 10
    ");
    $stmt->execute([$today, $today]);
    $upcomingInstallments = $stmt->fetchAll();

    // Recent transactions
    $stmt = $db->prepare("
        SELECT t.*, p.name as party_name, c.name as category_name
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        ORDER BY t.date DESC, t.id DESC LIMIT 10
    ");
    $stmt->execute();
    $recentTransactions = $stmt->fetchAll();

    // Active projects
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'");
    $stmt->execute();
    $activeProjects = $stmt->fetch();

    jsonResponse([
        'currentMonth' => [
            'income' => (float)$currentMonth['income'],
            'expense' => (float)$currentMonth['expense'],
            'balance' => (float)$currentMonth['income'] - (float)$currentMonth['expense']
        ],
        'lastMonth' => [
            'income' => (float)$lastMonth['income'],
            'expense' => (float)$lastMonth['expense']
        ],
        'debts' => [
            'totalDebt' => (float)$debts['total_debt'],
            'totalReceivable' => (float)$debts['total_receivable']
        ],
        'upcomingInstallments' => $upcomingInstallments,
        'recentTransactions' => $recentTransactions,
        'activeProjectsCount' => (int)$activeProjects['count']
    ]);
}

function getSummary($db) {
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;

    $sql = "SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as total_income,
                   COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as total_expense,
                   COUNT(*) as transaction_count
            FROM transactions WHERE 1=1";
    $params = [];

    if ($startDate) {
        $sql .= " AND date >= ?";
        $params[] = $startDate;
    }
    if ($endDate) {
        $sql .= " AND date <= ?";
        $params[] = $endDate;
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $summary = $stmt->fetch();

    jsonResponse([
        'totalIncome' => (float)$summary['total_income'],
        'totalExpense' => (float)$summary['total_expense'],
        'balance' => (float)$summary['total_income'] - (float)$summary['total_expense'],
        'transactionCount' => (int)$summary['transaction_count']
    ]);
}

function getTransactionReport($db) {
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;
    $groupBy = $_GET['groupBy'] ?? 'month';

    $params = [];

    if ($groupBy === 'category') {
        $sql = "SELECT c.name as category_name, c.type,
                       COALESCE(SUM(t.net_amount), 0) as total, COUNT(*) as count
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id WHERE 1=1";
        if ($startDate) { $sql .= " AND t.date >= ?"; $params[] = $startDate; }
        if ($endDate) { $sql .= " AND t.date <= ?"; $params[] = $endDate; }
        $sql .= " GROUP BY c.name, c.type ORDER BY total DESC";
    } elseif ($groupBy === 'party') {
        $sql = "SELECT p.name as party_name,
                       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.net_amount ELSE 0 END), 0) as income,
                       COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.net_amount ELSE 0 END), 0) as expense,
                       COUNT(*) as count
                FROM transactions t
                LEFT JOIN parties p ON t.party_id = p.id WHERE 1=1";
        if ($startDate) { $sql .= " AND t.date >= ?"; $params[] = $startDate; }
        if ($endDate) { $sql .= " AND t.date <= ?"; $params[] = $endDate; }
        $sql .= " GROUP BY p.name ORDER BY income DESC";
    } else {
        $sql = "SELECT DATE_FORMAT(date, '%Y-%m-01') as month,
                       COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as income,
                       COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as expense
                FROM transactions WHERE 1=1";
        if ($startDate) { $sql .= " AND date >= ?"; $params[] = $startDate; }
        if ($endDate) { $sql .= " AND date <= ?"; $params[] = $endDate; }
        $sql .= " GROUP BY month ORDER BY month DESC";
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getDebtReport($db) {
    $kind = $_GET['kind'] ?? null;
    $status = $_GET['status'] ?? null;

    $sql = "SELECT d.*, p.name as party_name,
                   (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as paid_amount
            FROM debts d LEFT JOIN parties p ON d.party_id = p.id WHERE 1=1";
    $params = [];

    if ($kind) { $sql .= " AND d.kind = ?"; $params[] = $kind; }
    if ($status) { $sql .= " AND d.status = ?"; $params[] = $status; }

    $sql .= " ORDER BY d.due_date ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function getProjectReport($db) {
    $status = $_GET['status'] ?? null;

    $sql = "SELECT p.*, pa.name as party_name,
                   COALESCE((SELECT SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END) FROM transactions WHERE project_id = p.id), 0) as total_income,
                   COALESCE((SELECT SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END) FROM transactions WHERE project_id = p.id), 0) as total_expense
            FROM projects p LEFT JOIN parties pa ON p.party_id = pa.id WHERE 1=1";
    $params = [];

    if ($status) { $sql .= " AND p.status = ?"; $params[] = $status; }

    $sql .= " ORDER BY p.created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

function exportReport($db, $type) {
    $startDate = $_GET['startDate'] ?? null;
    $endDate = $_GET['endDate'] ?? null;

    $csv = "\xEF\xBB\xBF";
    $params = [];

    if ($type === 'transactions') {
        $sql = "SELECT t.date, t.type, t.amount, t.currency, t.net_amount, t.description,
                       p.name as party_name, c.name as category_name
                FROM transactions t
                LEFT JOIN parties p ON t.party_id = p.id
                LEFT JOIN categories c ON t.category_id = c.id WHERE 1=1";
        if ($startDate) { $sql .= " AND t.date >= ?"; $params[] = $startDate; }
        if ($endDate) { $sql .= " AND t.date <= ?"; $params[] = $endDate; }
        $sql .= " ORDER BY t.date DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();

        $csv .= "Tarih,Tür,Tutar,Para Birimi,Net Tutar,Açıklama,Cari,Kategori\n";
        foreach ($data as $row) {
            $csv .= sprintf('"%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
                $row['date'], $row['type'], $row['amount'], $row['currency'],
                $row['net_amount'], $row['description'] ?? '', $row['party_name'] ?? '', $row['category_name'] ?? '');
        }
        $filename = 'islemler';
    } else {
        jsonResponse(['success' => false, 'message' => 'Geçersiz rapor tipi'], 400);
        return;
    }

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=' . $filename . '_' . date('Y-m-d') . '.csv');
    echo $csv;
    exit;
}

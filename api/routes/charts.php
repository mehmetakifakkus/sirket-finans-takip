<?php
/**
 * Charts Routes - Dashboard chart data endpoints
 */

function handleCharts($db, $method, $action, $subAction) {
    requireAuth();

    if ($method !== 'GET') {
        jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        return;
    }

    switch ($action) {
        case 'monthly':
            getMonthlyChartData($db);
            break;

        case 'category':
            getCategoryChartData($db);
            break;

        case 'debt-summary':
            getDebtSummaryChartData($db);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Endpoint bulunamadı'], 404);
    }
}

function getMonthlyChartData($db) {
    $months = isset($_GET['months']) ? (int)$_GET['months'] : 12;
    $monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    $result = [];

    if ($months === 0) {
        // All time: find earliest transaction date
        $stmt = $db->prepare("SELECT MIN(date) as min_date FROM transactions");
        $stmt->execute();
        $earliest = $stmt->fetch();

        if (!$earliest || !$earliest['min_date']) {
            jsonResponse(['data' => []]);
            return;
        }

        $startDate = new DateTime($earliest['min_date']);
        $startDate->modify('first day of this month');
    } else {
        // Go back specified number of months from today
        $startDate = new DateTime('first day of this month');
        $startDate->modify('-' . ($months - 1) . ' months');
    }

    $endDate = new DateTime('first day of this month');
    $endDate->modify('+1 month'); // Go one month ahead so we include current month

    // Use DatePeriod for reliable month iteration
    $interval = new DateInterval('P1M');
    $period = new DatePeriod($startDate, $interval, $endDate);

    foreach ($period as $date) {
        $year = (int)$date->format('Y');
        $month = (int)$date->format('n');
        $monthKey = $date->format('Y-m');

        $firstDay = $date->format('Y-m-01');
        $lastDay = $date->format('Y-m-t');

        $stmt = $db->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as expense
            FROM transactions
            WHERE date >= ? AND date <= ?
        ");
        $stmt->execute([$firstDay, $lastDay]);
        $row = $stmt->fetch();

        $result[] = [
            'month' => $monthKey,
            'month_label' => $monthNames[$month - 1] . ' ' . substr((string)$year, -2),
            'income' => round((float)$row['income'], 2),
            'expense' => round((float)$row['expense'], 2)
        ];
    }

    jsonResponse(['data' => $result]);
}

function getCategoryChartData($db) {
    $type = $_GET['type'] ?? 'expense';
    $months = isset($_GET['months']) ? (int)$_GET['months'] : 6;

    $today = new DateTime();

    if ($months === 0) {
        $startDate = '1900-01-01';
    } else {
        $start = new DateTime();
        $start->modify('first day of this month');
        $start->modify('-' . ($months - 1) . ' months');
        $startDate = $start->format('Y-m-d');
    }

    $endDate = $today->format('Y-m-d');

    $stmt = $db->prepare("
        SELECT
            t.category_id,
            c.name as category_name,
            COALESCE(SUM(t.net_amount), 0) as total
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.type = ? AND t.date >= ? AND t.date <= ?
        GROUP BY t.category_id, c.name
        ORDER BY total DESC
    ");
    $stmt->execute([$type, $startDate, $endDate]);
    $categories = $stmt->fetchAll();

    $grandTotal = 0;
    foreach ($categories as $cat) {
        $grandTotal += (float)$cat['total'];
    }

    $result = [];
    $othersTotal = 0;

    foreach ($categories as $index => $cat) {
        if ($index < 5) {
            $result[] = [
                'category_id' => (int)$cat['category_id'],
                'category_name' => $cat['category_name'] ?? 'Kategorisiz',
                'total' => round((float)$cat['total'], 2),
                'percentage' => $grandTotal > 0 ? ((float)$cat['total'] / $grandTotal) * 100 : 0
            ];
        } else {
            $othersTotal += (float)$cat['total'];
        }
    }

    if ($othersTotal > 0) {
        $result[] = [
            'category_id' => -1,
            'category_name' => 'Diğerleri',
            'total' => round($othersTotal, 2),
            'percentage' => $grandTotal > 0 ? ($othersTotal / $grandTotal) * 100 : 0
        ];
    }

    jsonResponse(['data' => $result]);
}

function getDebtSummaryChartData($db) {
    $today = date('Y-m-d');

    $stmt = $db->prepare("
        SELECT
            d.id,
            d.kind,
            d.principal_amount,
            d.currency,
            d.due_date,
            COALESCE((
                SELECT SUM(p.amount)
                FROM payments p
                JOIN installments i ON p.related_id = i.id AND p.related_type = 'installment'
                WHERE i.debt_id = d.id
            ), 0) as total_paid
        FROM debts d
        WHERE d.status = 'open'
    ");
    $stmt->execute();
    $debts = $stmt->fetchAll();

    $summary = [
        'debt_total' => 0,
        'debt_paid' => 0,
        'debt_remaining' => 0,
        'debt_overdue' => 0,
        'receivable_total' => 0,
        'receivable_paid' => 0,
        'receivable_remaining' => 0,
        'receivable_overdue' => 0
    ];

    foreach ($debts as $debt) {
        $principal = (float)$debt['principal_amount'];
        $paid = (float)$debt['total_paid'];
        $remaining = $principal - $paid;
        $isOverdue = $debt['due_date'] && $debt['due_date'] < $today;

        if ($debt['kind'] === 'debt') {
            $summary['debt_total'] += $principal;
            $summary['debt_paid'] += $paid;
            $summary['debt_remaining'] += $remaining;
            if ($isOverdue) $summary['debt_overdue'] += $remaining;
        } else {
            $summary['receivable_total'] += $principal;
            $summary['receivable_paid'] += $paid;
            $summary['receivable_remaining'] += $remaining;
            if ($isOverdue) $summary['receivable_overdue'] += $remaining;
        }
    }

    // Round all values
    foreach ($summary as $key => $value) {
        $summary[$key] = round($value, 2);
    }

    jsonResponse($summary);
}

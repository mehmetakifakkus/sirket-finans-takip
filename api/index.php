<?php
/**
 * API Router - Main Entry Point
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/auth.php';

// Set CORS headers
setCorsHeaders();

// Get request URI and method
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string and base path
$basePath = '/api';
$uri = parse_url($requestUri, PHP_URL_PATH);
$uri = str_replace($basePath, '', $uri);
$uri = trim($uri, '/');

// Split URI into segments
$segments = $uri ? explode('/', $uri) : [];
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// Initialize database
$database = new Database();
$db = $database->getConnection();

// Route to appropriate handler
switch ($resource) {
    case 'auth':
        require_once __DIR__ . '/routes/auth.php';
        handleAuth($db, $requestMethod, $id);
        break;

    case 'transactions':
        require_once __DIR__ . '/routes/transactions.php';
        handleTransactions($db, $requestMethod, $id, $action);
        break;

    case 'debts':
        require_once __DIR__ . '/routes/debts.php';
        handleDebts($db, $requestMethod, $id, $action);
        break;

    case 'installments':
        require_once __DIR__ . '/routes/installments.php';
        handleInstallments($db, $requestMethod, $id, $action);
        break;

    case 'parties':
        require_once __DIR__ . '/routes/parties.php';
        handleParties($db, $requestMethod, $id, $action);
        break;

    case 'categories':
        require_once __DIR__ . '/routes/categories.php';
        handleCategories($db, $requestMethod, $id, $action);
        break;

    case 'projects':
        require_once __DIR__ . '/routes/projects.php';
        handleProjects($db, $requestMethod, $id, $action);
        break;

    case 'milestones':
        require_once __DIR__ . '/routes/milestones.php';
        handleMilestones($db, $requestMethod, $id);
        break;

    case 'grants':
        require_once __DIR__ . '/routes/grants.php';
        handleGrants($db, $requestMethod, $id, $action);
        break;

    case 'payments':
        require_once __DIR__ . '/routes/payments.php';
        handlePayments($db, $requestMethod, $id);
        break;

    case 'exchange-rates':
        require_once __DIR__ . '/routes/exchange-rates.php';
        handleExchangeRates($db, $requestMethod, $id, $action);
        break;

    case 'users':
        require_once __DIR__ . '/routes/users.php';
        handleUsers($db, $requestMethod, $id);
        break;

    case 'reports':
        require_once __DIR__ . '/routes/reports.php';
        handleReports($db, $requestMethod, $id, $action);
        break;

    case 'documents':
        require_once __DIR__ . '/routes/documents.php';
        handleDocuments($db, $requestMethod, $id, $action);
        break;

    case 'files':
        require_once __DIR__ . '/routes/files.php';
        handleFiles($db, $requestMethod, $id);
        break;

    case 'setup':
        require_once __DIR__ . '/routes/setup.php';
        handleSetup($db, $requestMethod, $id);
        break;

    case 'import':
        require_once __DIR__ . '/routes/import.php';
        handleImport($db, $requestMethod, $id);
        break;

    case 'database':
        require_once __DIR__ . '/routes/database.php';
        handleDatabase($db, $requestMethod, $id);
        break;

    case 'health':
        jsonResponse(['status' => 'ok', 'timestamp' => date('c')]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Endpoint bulunamadı'], 404);
}

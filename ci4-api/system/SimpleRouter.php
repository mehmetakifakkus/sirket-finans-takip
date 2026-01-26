<?php

/**
 * Simple Standalone Router
 * Fallback when CodeIgniter is not fully installed via Composer
 */

// Constants
defined('APPPATH') || define('APPPATH', dirname(__DIR__) . '/app/');
defined('WRITEPATH') || define('WRITEPATH', dirname(__DIR__) . '/writable/');
defined('ROOTPATH') || define('ROOTPATH', dirname(__DIR__) . '/');

// Load config
require_once APPPATH . 'Config/Constants.php';

// Autoloader
spl_autoload_register(function ($class) {
    $prefixes = [
        'App\\' => APPPATH,
        'Config\\' => APPPATH . 'Config/',
    ];

    foreach ($prefixes as $prefix => $baseDir) {
        if (strpos($class, $prefix) === 0) {
            $relativeClass = substr($class, strlen($prefix));
            $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
            if (file_exists($file)) {
                require_once $file;
                return true;
            }
        }
    }
    return false;
});

// Handle CORS
$origin = getenv('CORS_ORIGIN') ?: '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Parse request
$uri = $_SERVER['REQUEST_URI'];
$basePath = '/ci4-api/public';
if (strpos($uri, $basePath) === 0) {
    $uri = substr($uri, strlen($basePath));
}
$uri = parse_url($uri, PHP_URL_PATH);
$uri = trim($uri, '/');
// Strip index.php from URI if present
if (strpos($uri, 'index.php/') === 0) {
    $uri = substr($uri, 10); // 'index.php/' is 10 characters
} elseif ($uri === 'index.php') {
    $uri = '';
}
$method = $_SERVER['REQUEST_METHOD'];

// Route mapping
$routes = [
    'GET' => [
        'api/setup/check' => ['SetupController', 'check'],
        'api/auth/me' => ['AuthController', 'me', true],
        'api/transactions' => ['TransactionController', 'index', true],
        'api/transactions/unassigned' => ['TransactionController', 'unassigned', true],
        'api/transactions/export/csv' => ['TransactionController', 'export', true],
        'api/debts' => ['DebtController', 'index', true],
        'api/debts/export/csv' => ['DebtController', 'export', true],
        'api/parties' => ['PartyController', 'index', true],
        'api/categories' => ['CategoryController', 'index', true],
        'api/projects' => ['ProjectController', 'index', true],
        'api/projects/incomplete-count' => ['ProjectController', 'incompleteCount', true],
        'api/grants' => ['GrantController', 'index', true],
        'api/grants/totals' => ['GrantController', 'totals', true],
        'api/payments' => ['PaymentController', 'index', true],
        'api/exchange-rates' => ['ExchangeRateController', 'index', true],
        'api/exchange-rates/latest' => ['ExchangeRateController', 'latest', true],
        'api/users' => ['UserController', 'index', true, true],
        'api/reports/dashboard' => ['ReportController', 'dashboard', true],
        'api/reports/summary' => ['ReportController', 'summary', true],
        'api/reports/transactions' => ['ReportController', 'transactions', true],
        'api/reports/debts' => ['ReportController', 'debts', true],
        'api/reports/projects' => ['ReportController', 'projects', true],
        'api/reports/export' => ['ReportController', 'export', true],
        'api/documents' => ['DocumentController', 'index', true],
        'api/documents/count' => ['DocumentController', 'count', true],
        'api/files' => ['FileController', 'index', true],
        'api/database/stats' => ['DatabaseController', 'stats', true],
        'api/database/export' => ['DatabaseController', 'export', true],
    ],
    'POST' => [
        'api/auth/login' => ['AuthController', 'login'],
        'api/auth/logout' => ['AuthController', 'logout', true],
        'api/setup/initialize' => ['SetupController', 'initialize'],
        'api/setup/create-admin' => ['SetupController', 'createAdmin'],
        'api/setup/seed-categories' => ['SetupController', 'seedCategories'],
        'api/setup/seed-rates' => ['SetupController', 'seedRates'],
        'api/setup/seed-demo' => ['SetupController', 'seedDemo'],
        'api/setup/fix-grants-table' => ['SetupController', 'fixGrantsTable'],
        'api/setup/migrate-party-grants' => ['SetupController', 'migratePartyGrants'],
        'api/transactions' => ['TransactionController', 'create', true],
        'api/transactions/assign' => ['TransactionController', 'assignToProject', true],
        'api/debts' => ['DebtController', 'create', true],
        'api/parties' => ['PartyController', 'create', true],
        'api/parties/merge' => ['PartyController', 'merge', true],
        'api/categories' => ['CategoryController', 'create', true],
        'api/categories/merge' => ['CategoryController', 'merge', true],
        'api/projects' => ['ProjectController', 'create', true],
        'api/milestones' => ['MilestoneController', 'create', true],
        'api/grants' => ['GrantController', 'create', true],
        'api/grants/calculate' => ['GrantController', 'calculate', true],
        'api/exchange-rates' => ['ExchangeRateController', 'create', true],
        'api/exchange-rates/fetch-tcmb' => ['ExchangeRateController', 'fetchTcmb', true],
        'api/exchange-rates/fetch-gold' => ['ExchangeRateController', 'fetchGold', true],
        'api/users' => ['UserController', 'create', true, true],
        'api/documents' => ['DocumentController', 'create', true],
        'api/files' => ['FileController', 'create', true],
        'api/import/preview' => ['ImportController', 'preview', true],
        'api/import/transactions' => ['ImportController', 'transactions', true],
        'api/import/parties' => ['ImportController', 'parties', true],
        'api/import/categories' => ['ImportController', 'categories', true],
        'api/database/backup' => ['DatabaseController', 'backup', true, true],
        'api/database/restore' => ['DatabaseController', 'restore', true, true],
        'api/database/clear' => ['DatabaseController', 'clear', true, true],
    ],
];

// Dynamic routes with ID
$dynamicRoutes = [
    'GET' => [
        'api/transactions/(\d+)' => ['TransactionController', 'show', true],
        'api/debts/(\d+)' => ['DebtController', 'show', true],
        'api/installments/(\d+)' => ['InstallmentController', 'show', true],
        'api/parties/grant-defaults/([a-z]+)' => ['PartyController', 'grantDefaults', true],
        'api/parties/(\d+)/remaining-grant' => ['PartyController', 'remainingGrant', true],
        'api/parties/(\d+)' => ['PartyController', 'show', true],
        'api/categories/(\d+)' => ['CategoryController', 'show', true],
        'api/projects/(\d+)' => ['ProjectController', 'show', true],
        'api/milestones/(\d+)' => ['MilestoneController', 'show', true],
        'api/grants/(\d+)' => ['GrantController', 'show', true],
        'api/exchange-rates/(\d+)' => ['ExchangeRateController', 'show', true],
        'api/users/(\d+)' => ['UserController', 'show', true, true],
        'api/documents/(\d+)' => ['DocumentController', 'show', true],
        'api/documents/(\d+)/preview' => ['DocumentController', 'preview', true],
        'api/files/(\d+)' => ['FileController', 'show', true],
        'api/files/(\d+)/open' => ['FileController', 'open', true],
    ],
    'PUT' => [
        'api/transactions/(\d+)' => ['TransactionController', 'update', true],
        'api/debts/(\d+)' => ['DebtController', 'update', true],
        'api/installments/(\d+)' => ['InstallmentController', 'update', true],
        'api/parties/(\d+)' => ['PartyController', 'update', true],
        'api/categories/(\d+)' => ['CategoryController', 'update', true],
        'api/projects/(\d+)' => ['ProjectController', 'update', true],
        'api/milestones/(\d+)' => ['MilestoneController', 'update', true],
        'api/grants/(\d+)' => ['GrantController', 'update', true],
        'api/exchange-rates/(\d+)' => ['ExchangeRateController', 'update', true],
        'api/users/(\d+)' => ['UserController', 'update', true, true],
    ],
    'DELETE' => [
        'api/transactions/(\d+)' => ['TransactionController', 'delete', true],
        'api/debts/(\d+)' => ['DebtController', 'delete', true],
        'api/installments/(\d+)' => ['InstallmentController', 'delete', true],
        'api/parties/(\d+)' => ['PartyController', 'delete', true],
        'api/categories/(\d+)' => ['CategoryController', 'delete', true],
        'api/projects/(\d+)' => ['ProjectController', 'delete', true],
        'api/milestones/(\d+)' => ['MilestoneController', 'delete', true],
        'api/grants/(\d+)' => ['GrantController', 'delete', true],
        'api/payments/(\d+)' => ['PaymentController', 'delete', true],
        'api/exchange-rates/(\d+)' => ['ExchangeRateController', 'delete', true],
        'api/users/(\d+)' => ['UserController', 'delete', true, true],
        'api/documents/(\d+)' => ['DocumentController', 'delete', true],
        'api/files/(\d+)' => ['FileController', 'delete', true],
    ],
    'POST' => [
        'api/debts/(\d+)/installments' => ['DebtController', 'createInstallments', true],
        'api/installments/(\d+)/pay' => ['InstallmentController', 'pay', true],
        'api/database/clear/([a-z_]+)' => ['DatabaseController', 'clearTable', true, true],
    ],
];

// JWT Helper
function verifyToken() {
    // Try multiple sources for Authorization header
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        // Apache might strip the header - try REDIRECT version
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    }
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? '';
    }
    if (empty($authHeader) && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
    }
    if (empty($authHeader)) {
        return null;
    }

    $token = str_replace('Bearer ', '', $authHeader);
    if (empty($token)) {
        return null;
    }

    $secret = getenv('JWT_SECRET') ?: 'default-secret-key-change-in-production';
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$header, $payload, $signature] = $parts;
    $expectedSig = rtrim(strtr(base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true)), '+/', '-_'), '=');

    if (!hash_equals($expectedSig, $signature)) {
        return null;
    }

    $data = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
    if (!$data || (isset($data['exp']) && $data['exp'] < time())) {
        return null;
    }

    return $data;
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function errorResponse($message, $status = 400) {
    jsonResponse(['success' => false, 'message' => $message], $status);
}

// Find route
$handler = null;
$params = [];
$requireAuth = false;
$requireAdmin = false;

// Check static routes
if (isset($routes[$method][$uri])) {
    $handler = $routes[$method][$uri];
    $requireAuth = $handler[2] ?? false;
    $requireAdmin = $handler[3] ?? false;
}

// Check dynamic routes
if (!$handler && isset($dynamicRoutes[$method])) {
    foreach ($dynamicRoutes[$method] as $pattern => $routeHandler) {
        if (preg_match("#^$pattern$#", $uri, $matches)) {
            $handler = $routeHandler;
            $requireAuth = $handler[2] ?? false;
            $requireAdmin = $handler[3] ?? false;
            array_shift($matches);
            $params = $matches;
            break;
        }
    }
}

// Not found
if (!$handler) {
    errorResponse('Endpoint bulunamadı', 404);
}

// Auth check
$user = null;
if ($requireAuth) {
    $user = verifyToken();
    if (!$user) {
        errorResponse('Yetkilendirme gerekli', 401);
    }

    if ($requireAdmin && ($user['role'] ?? '') !== 'admin') {
        errorResponse('Admin yetkisi gerekli', 403);
    }
}

// Load and execute controller
$controllerName = "App\\Controllers\\" . $handler[0];
$methodName = $handler[1];

try {
    $controller = new $controllerName();

    // Inject user and request data
    $controller->user = $user;
    $controller->request = (object)[
        'user' => $user,
        'getJSON' => function($assoc = false) {
            $body = file_get_contents('php://input');
            return json_decode($body, $assoc);
        },
        'getGet' => function($key = null) {
            return $key ? ($_GET[$key] ?? null) : $_GET;
        },
        'getPost' => function($key = null) {
            return $key ? ($_POST[$key] ?? null) : $_POST;
        },
        'getFile' => function($key) {
            return isset($_FILES[$key]) ? new SimpleUploadedFile($_FILES[$key]) : null;
        },
        'getHeaderLine' => function($name) {
            $name = strtoupper(str_replace('-', '_', $name));
            return $_SERVER["HTTP_$name"] ?? '';
        },
        'getMethod' => function() {
            return $_SERVER['REQUEST_METHOD'];
        }
    ];

    // Call method
    $result = call_user_func_array([$controller, $methodName], $params);

    // Handle response
    if (is_array($result)) {
        jsonResponse($result);
    } elseif (is_object($result) && method_exists($result, 'getBody')) {
        // Response object
        http_response_code($result->getStatusCode());
        foreach ($result->getHeaders() as $name => $value) {
            header("$name: $value");
        }
        echo $result->getBody();
    }

} catch (\Exception $e) {
    errorResponse('Sunucu hatası: ' . $e->getMessage(), 500);
}

/**
 * Simple uploaded file wrapper
 */
class SimpleUploadedFile {
    private $data;

    public function __construct($fileData) {
        $this->data = $fileData;
    }

    public function isValid() {
        return isset($this->data['error']) && $this->data['error'] === UPLOAD_ERR_OK;
    }

    public function getSize() {
        return $this->data['size'] ?? 0;
    }

    public function getMimeType() {
        return $this->data['type'] ?? '';
    }

    public function getClientName() {
        return $this->data['name'] ?? '';
    }

    public function getTempName() {
        return $this->data['tmp_name'] ?? '';
    }

    public function getExtension() {
        return pathinfo($this->data['name'] ?? '', PATHINFO_EXTENSION);
    }

    public function getRandomName() {
        return bin2hex(random_bytes(16)) . '.' . $this->getExtension();
    }

    public function move($targetPath, $name = null) {
        $destination = rtrim($targetPath, '/') . '/' . ($name ?: $this->getClientName());
        if (!is_dir($targetPath)) {
            mkdir($targetPath, 0755, true);
        }
        return move_uploaded_file($this->data['tmp_name'], $destination);
    }
}

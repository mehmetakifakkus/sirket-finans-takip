<?php
/**
 * Application Configuration
 */

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', getenv('APP_DEBUG') === 'true' ? 1 : 0);

// Timezone
date_default_timezone_set('Europe/Istanbul');

// Database Configuration (for stats queries)
define('DB_NAME', getenv('DB_NAME') ?: 'sirket_finans');

// JWT Configuration
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-super-secret-jwt-key-change-in-production');
define('JWT_EXPIRY', 60 * 60 * 24 * 7); // 7 days in seconds

// CORS Configuration
define('CORS_ORIGIN', getenv('CORS_ORIGIN') ?: 'http://localhost:5173');

// Upload Configuration
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB

// Allowed file types
define('ALLOWED_MIME_TYPES', [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
]);

/**
 * Simple JWT functions (no external library required)
 */
function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function createJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['exp'] = time() + JWT_EXPIRY;
    $payload['iat'] = time();

    $base64Header = base64UrlEncode($header);
    $base64Payload = base64UrlEncode(json_encode($payload));

    $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, JWT_SECRET, true);
    $base64Signature = base64UrlEncode($signature);

    return $base64Header . '.' . $base64Payload . '.' . $base64Signature;
}

function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($base64Header, $base64Payload, $base64Signature) = $parts;

    $signature = hash_hmac('sha256', $base64Header . '.' . $base64Payload, JWT_SECRET, true);
    $expectedSignature = base64UrlEncode($signature);

    if (!hash_equals($expectedSignature, $base64Signature)) {
        return false;
    }

    $payload = json_decode(base64UrlDecode($base64Payload), true);

    if ($payload['exp'] < time()) {
        return false;
    }

    return $payload;
}

/**
 * Send JSON response
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Get request body as array
 */
function getRequestBody() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?: [];
}

/**
 * Set CORS headers
 */
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

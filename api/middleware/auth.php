<?php
/**
 * Authentication Middleware
 */

require_once __DIR__ . '/../config/config.php';

function getAuthUser() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $payload = verifyJWT($token);

    if (!$payload) {
        return null;
    }

    return $payload;
}

function requireAuth() {
    $user = getAuthUser();

    if (!$user) {
        jsonResponse([
            'success' => false,
            'message' => 'Yetkilendirme gerekli'
        ], 401);
    }

    return $user;
}

function requireAdmin() {
    $user = requireAuth();

    if ($user['role'] !== 'admin') {
        jsonResponse([
            'success' => false,
            'message' => 'Bu işlem için yönetici yetkisi gerekli'
        ], 403);
    }

    return $user;
}

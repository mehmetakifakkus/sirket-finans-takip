<?php
/**
 * Auth Routes
 */

function handleAuth($db, $method, $action) {
    switch ($action) {
        case 'login':
            if ($method === 'POST') {
                login($db);
            }
            break;

        case 'logout':
            if ($method === 'POST') {
                logout();
            }
            break;

        case 'me':
            if ($method === 'GET') {
                getCurrentUser($db);
            }
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Endpoint bulunamadı'], 404);
    }
}

function login($db) {
    $data = getRequestBody();
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'E-posta ve şifre gerekli']);
        return;
    }

    $stmt = $db->prepare('SELECT id, email, name, password, role, status FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'E-posta veya şifre hatalı']);
        return;
    }

    if ($user['status'] !== 'active') {
        jsonResponse(['success' => false, 'message' => 'Hesabınız aktif değil']);
        return;
    }

    if (!password_verify($password, $user['password'])) {
        jsonResponse(['success' => false, 'message' => 'E-posta veya şifre hatalı']);
        return;
    }

    $token = createJWT([
        'userId' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role']
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Giriş başarılı',
        'token' => $token,
        'user' => [
            'id' => (int)$user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role']
        ]
    ]);
}

function logout() {
    // JWT is stateless, logout is handled on client side
    jsonResponse(['success' => true, 'message' => 'Çıkış başarılı']);
}

function getCurrentUser($db) {
    $authUser = requireAuth();

    $stmt = $db->prepare('SELECT id, email, name, role, status, created_at FROM users WHERE id = ?');
    $stmt->execute([$authUser['userId']]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(null);
        return;
    }

    jsonResponse([
        'id' => (int)$user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'status' => $user['status'],
        'created_at' => $user['created_at']
    ]);
}

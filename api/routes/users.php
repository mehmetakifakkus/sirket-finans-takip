<?php
/**
 * Users Routes
 */

function handleUsers($db, $method, $id) {
    $user = requireAdmin();

    switch ($method) {
        case 'GET':
            if ($id) {
                getUser($db, $id);
            } else {
                getUsers($db);
            }
            break;

        case 'POST':
            createUser($db);
            break;

        case 'PUT':
            updateUser($db, $id);
            break;

        case 'DELETE':
            deleteUser($db, $id, $user);
            break;

        default:
            jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}

function getUsers($db) {
    $stmt = $db->prepare("SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY name ASC");
    $stmt->execute();
    jsonResponse($stmt->fetchAll());
}

function getUser($db, $id) {
    $stmt = $db->prepare("SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Kullanıcı bulunamadı'], 404);
        return;
    }

    jsonResponse($user);
}

function createUser($db) {
    $data = getRequestBody();

    // Check if email exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Bu e-posta adresi zaten kullanımda']);
        return;
    }

    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

    $stmt = $db->prepare("
        INSERT INTO users (name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    ");

    $stmt->execute([
        $data['name'],
        $data['email'],
        $hashedPassword,
        $data['role'] ?? 'staff',
        $data['status'] ?? 'active'
    ]);

    jsonResponse(['success' => true, 'message' => 'Kullanıcı oluşturuldu', 'id' => (int)$db->lastInsertId()]);
}

function updateUser($db, $id) {
    $data = getRequestBody();

    // Check if email exists for another user
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmt->execute([$data['email'], $id]);
    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Bu e-posta adresi zaten kullanımda']);
        return;
    }

    if (!empty($data['password'])) {
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt = $db->prepare("
            UPDATE users SET name = ?, email = ?, password = ?, role = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $data['name'],
            $data['email'],
            $hashedPassword,
            $data['role'] ?? 'staff',
            $data['status'] ?? 'active',
            $id
        ]);
    } else {
        $stmt = $db->prepare("
            UPDATE users SET name = ?, email = ?, role = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $data['name'],
            $data['email'],
            $data['role'] ?? 'staff',
            $data['status'] ?? 'active',
            $id
        ]);
    }

    jsonResponse(['success' => true, 'message' => 'Kullanıcı güncellendi']);
}

function deleteUser($db, $id, $currentUser) {
    if ($currentUser['userId'] == $id) {
        jsonResponse(['success' => false, 'message' => 'Kendinizi silemezsiniz']);
        return;
    }

    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Kullanıcı silindi']);
}

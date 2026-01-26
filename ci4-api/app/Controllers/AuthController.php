<?php

namespace App\Controllers;

use App\Libraries\Database;
use App\Libraries\JwtHelper;

class AuthController extends BaseController
{
    protected JwtHelper $jwt;

    public function __construct()
    {
        parent::__construct();
        $this->jwt = new JwtHelper();
    }

    /**
     * Login
     * POST /api/auth/login
     */
    public function login()
    {
        $data = $this->getJsonInput();

        // Validate input
        $errors = $this->validateRequired($data, ['email', 'password']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        try {
            // Find user
            $user = Database::queryOne(
                "SELECT * FROM users WHERE email = ?",
                [$data['email']]
            );

            if (!$user) {
                return $this->error('E-posta veya şifre hatalı', 401);
            }

            // Check if user is active
            if (isset($user['status']) && $user['status'] !== 'active') {
                return $this->error('Hesabınız devre dışı bırakılmış', 403);
            }

            // Verify password
            if (!password_verify($data['password'], $user['password'])) {
                return $this->error('E-posta veya şifre hatalı', 401);
            }

            // Create JWT token
            $payload = [
                'userId' => (int)$user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role']
            ];

            $token = $this->jwt->create($payload);

            return $this->success('Giriş başarılı', [
                'token' => $token,
                'user' => [
                    'id' => (int)$user['id'],
                    'email' => $user['email'],
                    'name' => $user['name'],
                    'role' => $user['role']
                ]
            ]);

        } catch (\Exception $e) {
            return $this->error('Giriş hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Logout
     * POST /api/auth/logout
     */
    public function logout()
    {
        // JWT is stateless, so we just return success
        // Client should remove the token
        return $this->success('Çıkış başarılı');
    }

    /**
     * Get current user
     * GET /api/auth/me
     */
    public function me()
    {
        $userId = $this->getUserId();
        if (!$userId) {
            return $this->unauthorized();
        }

        try {
            $user = Database::queryOne(
                "SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE id = ?",
                [$userId]
            );

            if (!$user) {
                return $this->notFound('Kullanıcı bulunamadı');
            }

            return $this->success('Kullanıcı bilgileri', [
                'user' => $user
            ]);

        } catch (\Exception $e) {
            return $this->error('Kullanıcı bilgileri alınamadı: ' . $e->getMessage(), 500);
        }
    }
}

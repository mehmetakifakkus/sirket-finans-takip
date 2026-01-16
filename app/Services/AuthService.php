<?php

namespace App\Services;

use App\Models\UserModel;
use App\Models\AuditLogModel;

class AuthService
{
    protected UserModel $userModel;
    protected AuditLogModel $auditLogModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        $this->auditLogModel = new AuditLogModel();
    }

    /**
     * Attempt to login user
     */
    public function attemptLogin(string $email, string $password): array
    {
        $user = $this->userModel->findByEmail($email);

        if (!$user) {
            return [
                'success' => false,
                'message' => 'E-posta adresi veya şifre hatalı.',
            ];
        }

        if ($user['status'] !== 'active') {
            return [
                'success' => false,
                'message' => 'Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.',
            ];
        }

        if (!password_verify($password, $user['password'])) {
            return [
                'success' => false,
                'message' => 'E-posta adresi veya şifre hatalı.',
            ];
        }

        // Login successful - set session
        $session = session();
        $session->set([
            'user_id'    => $user['id'],
            'user_name'  => $user['name'],
            'user_email' => $user['email'],
            'role'       => $user['role'],
            'isLoggedIn' => true,
        ]);

        // Regenerate session ID for security
        $session->regenerate();

        // Log the login
        $this->auditLogModel->logAction('login', 'user', $user['id']);

        return [
            'success' => true,
            'message' => 'Giriş başarılı.',
            'user'    => $user,
        ];
    }

    /**
     * Logout user
     */
    public function logout(): void
    {
        $session = session();

        // Log the logout before destroying session
        $this->auditLogModel->logAction('logout', 'user', $session->get('user_id'));

        $session->destroy();
    }

    /**
     * Check if user is logged in
     */
    public function isLoggedIn(): bool
    {
        return session()->get('isLoggedIn') === true;
    }

    /**
     * Check if current user is admin
     */
    public function isAdmin(): bool
    {
        return session()->get('role') === 'admin';
    }

    /**
     * Check if current user is staff
     */
    public function isStaff(): bool
    {
        return session()->get('role') === 'staff';
    }

    /**
     * Get current user ID
     */
    public function getUserId(): ?int
    {
        return session()->get('user_id');
    }

    /**
     * Get current user data
     */
    public function getUser(): ?array
    {
        $userId = $this->getUserId();
        if (!$userId) {
            return null;
        }

        return $this->userModel->find($userId);
    }

    /**
     * Check if user has permission for an action
     * Staff can only: view, create
     * Admin can: view, create, edit, delete
     */
    public function canPerform(string $action): bool
    {
        $role = session()->get('role');

        if ($role === 'admin') {
            return true;
        }

        // Staff permissions
        $staffAllowed = ['view', 'create', 'index', 'show', 'store'];

        return in_array($action, $staffAllowed);
    }

    /**
     * Check if user can delete records
     */
    public function canDelete(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Check if user can edit records
     */
    public function canEdit(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Hash a password
     */
    public function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT);
    }

    /**
     * Verify a password
     */
    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}

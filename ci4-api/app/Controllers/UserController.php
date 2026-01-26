<?php

namespace App\Controllers;

use App\Models\UserModel;

class UserController extends BaseController
{
    protected UserModel $userModel;

    public function __construct()
    {
        parent::__construct();
        $this->userModel = new UserModel();
    }

    /**
     * List users
     * GET /api/users
     */
    public function index()
    {
        $users = $this->userModel->getAllUsers();

        return $this->success('Kullanıcılar listelendi', [
            'users' => $users,
            'count' => count($users)
        ]);
    }

    /**
     * Get single user
     * GET /api/users/{id}
     */
    public function show(int $id)
    {
        $user = $this->userModel->getUserById($id);

        if (!$user) {
            return $this->notFound('Kullanıcı bulunamadı');
        }

        return $this->success('Kullanıcı detayı', [
            'user' => $user
        ]);
    }

    /**
     * Create user
     * POST /api/users
     */
    public function create()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['email', 'password', 'name', 'role']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        // Check email uniqueness
        if ($this->userModel->emailExists($data['email'])) {
            return $this->error('Bu e-posta adresi zaten kullanılıyor', 409);
        }

        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->validationError(['email' => 'Geçerli bir e-posta adresi girin']);
        }

        // Validate role
        if (!in_array($data['role'], ['admin', 'staff'])) {
            return $this->validationError(['role' => 'Geçersiz rol']);
        }

        $insertData = [
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'name' => $data['name'],
            'role' => $data['role'],
            'is_active' => $data['is_active'] ?? 1
        ];

        $id = $this->userModel->insert($insertData);
        if (!$id) {
            return $this->error('Kullanıcı oluşturulamadı', 500);
        }

        $user = $this->userModel->getUserById($id);

        return $this->created('Kullanıcı oluşturuldu', [
            'user' => $user
        ]);
    }

    /**
     * Update user
     * PUT /api/users/{id}
     */
    public function update(int $id)
    {
        $user = $this->userModel->find($id);
        if (!$user) {
            return $this->notFound('Kullanıcı bulunamadı');
        }

        $data = $this->getJsonInput();

        // Check email uniqueness if changing email
        if (isset($data['email']) && $data['email'] !== $user['email']) {
            if ($this->userModel->emailExists($data['email'], $id)) {
                return $this->error('Bu e-posta adresi zaten kullanılıyor', 409);
            }
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return $this->validationError(['email' => 'Geçerli bir e-posta adresi girin']);
            }
        }

        // Validate role if changing
        if (isset($data['role']) && !in_array($data['role'], ['admin', 'staff'])) {
            return $this->validationError(['role' => 'Geçersiz rol']);
        }

        // Hash password if provided
        if (!empty($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        } else {
            unset($data['password']);
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at']);

        $this->userModel->update($id, $data);

        $user = $this->userModel->getUserById($id);

        return $this->success('Kullanıcı güncellendi', [
            'user' => $user
        ]);
    }

    /**
     * Delete user
     * DELETE /api/users/{id}
     */
    public function delete(int $id)
    {
        $user = $this->userModel->find($id);
        if (!$user) {
            return $this->notFound('Kullanıcı bulunamadı');
        }

        // Prevent deleting self
        if ($id === $this->getUserId()) {
            return $this->error('Kendinizi silemezsiniz', 403);
        }

        // Check if this is the last admin
        $adminCount = $this->userModel->where('role', 'admin')->countAllResults();
        if ($user['role'] === 'admin' && $adminCount <= 1) {
            return $this->error('Son admin kullanıcı silinemez', 403);
        }

        $this->userModel->delete($id);

        return $this->success('Kullanıcı silindi');
    }
}

<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Models\AuditLogModel;

class UserController extends BaseController
{
    protected UserModel $userModel;
    protected AuditLogModel $auditLogModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        $this->auditLogModel = new AuditLogModel();
    }

    /**
     * List all users
     */
    public function index()
    {
        $users = $this->userModel->orderBy('name', 'ASC')->findAll();

        return $this->render('users/index', [
            'title' => 'Kullanıcılar',
            'users' => $users,
        ]);
    }

    /**
     * Show create form
     */
    public function create()
    {
        return $this->render('users/form', [
            'title'  => 'Yeni Kullanıcı',
            'user'   => null,
            'action' => 'create',
        ]);
    }

    /**
     * Store new user
     */
    public function store()
    {
        $rules = [
            'name'     => 'required|min_length[2]|max_length[100]',
            'email'    => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[6]',
            'role'     => 'required|in_list[admin,staff]',
            'status'   => 'required|in_list[active,inactive]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'name'     => $this->request->getPost('name'),
            'email'    => $this->request->getPost('email'),
            'password' => $this->request->getPost('password'),
            'role'     => $this->request->getPost('role'),
            'status'   => $this->request->getPost('status'),
        ];

        $id = $this->userModel->insert($data);

        if ($id) {
            $this->auditLogModel->logAction('create', 'user', $id, null, $data);
            return $this->redirectWithSuccess('/users', 'Kullanıcı başarıyla oluşturuldu.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Kullanıcı oluşturulamadı.');
    }

    /**
     * Show edit form
     */
    public function edit(int $id)
    {
        $user = $this->userModel->find($id);

        if (!$user) {
            return $this->redirectWithError('/users', 'Kullanıcı bulunamadı.');
        }

        return $this->render('users/form', [
            'title'  => 'Kullanıcı Düzenle',
            'user'   => $user,
            'action' => 'edit',
        ]);
    }

    /**
     * Update user
     */
    public function update(int $id)
    {
        $user = $this->userModel->find($id);

        if (!$user) {
            return $this->redirectWithError('/users', 'Kullanıcı bulunamadı.');
        }

        $rules = [
            'name'   => 'required|min_length[2]|max_length[100]',
            'email'  => "required|valid_email|is_unique[users.email,id,{$id}]",
            'role'   => 'required|in_list[admin,staff]',
            'status' => 'required|in_list[active,inactive]',
        ];

        // Password is optional on update
        if ($this->request->getPost('password')) {
            $rules['password'] = 'min_length[6]';
        }

        if (!$this->validate($rules)) {
            return redirect()->back()
                ->withInput()
                ->with('errors', $this->validator->getErrors());
        }

        $data = [
            'name'   => $this->request->getPost('name'),
            'email'  => $this->request->getPost('email'),
            'role'   => $this->request->getPost('role'),
            'status' => $this->request->getPost('status'),
        ];

        // Only update password if provided
        if ($this->request->getPost('password')) {
            $data['password'] = $this->request->getPost('password');
        }

        $oldData = $user;

        if ($this->userModel->update($id, $data)) {
            $this->auditLogModel->logAction('update', 'user', $id, $oldData, $data);
            return $this->redirectWithSuccess('/users', 'Kullanıcı başarıyla güncellendi.');
        }

        return redirect()->back()
            ->withInput()
            ->with('error', 'Kullanıcı güncellenemedi.');
    }

    /**
     * Delete user
     */
    public function delete(int $id)
    {
        $user = $this->userModel->find($id);

        if (!$user) {
            return $this->redirectWithError('/users', 'Kullanıcı bulunamadı.');
        }

        // Prevent self-deletion
        if ($id == session()->get('user_id')) {
            return $this->redirectWithError('/users', 'Kendinizi silemezsiniz.');
        }

        if ($this->userModel->delete($id)) {
            $this->auditLogModel->logAction('delete', 'user', $id, $user, null);
            return $this->redirectWithSuccess('/users', 'Kullanıcı başarıyla silindi.');
        }

        return $this->redirectWithError('/users', 'Kullanıcı silinemedi.');
    }
}

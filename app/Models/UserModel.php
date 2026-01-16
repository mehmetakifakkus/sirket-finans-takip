<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'name',
        'email',
        'password',
        'role',
        'status',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'name'     => 'required|min_length[2]|max_length[100]',
        'email'    => 'required|valid_email|is_unique[users.email,id,{id}]',
        'password' => 'required|min_length[6]',
        'role'     => 'required|in_list[admin,staff]',
        'status'   => 'required|in_list[active,inactive]',
    ];

    protected $validationMessages = [
        'name' => [
            'required'   => 'Ad alanı zorunludur.',
            'min_length' => 'Ad en az 2 karakter olmalıdır.',
        ],
        'email' => [
            'required'    => 'E-posta alanı zorunludur.',
            'valid_email' => 'Geçerli bir e-posta adresi giriniz.',
            'is_unique'   => 'Bu e-posta adresi zaten kullanılıyor.',
        ],
        'password' => [
            'required'   => 'Şifre alanı zorunludur.',
            'min_length' => 'Şifre en az 6 karakter olmalıdır.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Find user by email
     */
    public function findByEmail(string $email): ?array
    {
        return $this->where('email', $email)->first();
    }

    /**
     * Get users by role
     */
    public function getByRole(string $role): array
    {
        return $this->where('role', $role)->findAll();
    }

    /**
     * Get active users
     */
    public function getActiveUsers(): array
    {
        return $this->where('status', 'active')->findAll();
    }

    /**
     * Hash password before insert
     */
    protected function beforeInsert(array $data): array
    {
        return $this->hashPassword($data);
    }

    /**
     * Hash password before update if changed
     */
    protected function beforeUpdate(array $data): array
    {
        return $this->hashPassword($data);
    }

    /**
     * Hash password helper
     */
    protected function hashPassword(array $data): array
    {
        if (isset($data['data']['password'])) {
            $data['data']['password'] = password_hash($data['data']['password'], PASSWORD_BCRYPT);
        }
        return $data;
    }

    // Callbacks
    protected $allowCallbacks = true;
    protected $beforeInsert   = ['beforeInsert'];
    protected $beforeUpdate   = ['beforeUpdate'];
}

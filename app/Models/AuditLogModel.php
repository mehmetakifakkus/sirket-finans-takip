<?php

namespace App\Models;

use CodeIgniter\Model;

class AuditLogModel extends Model
{
    protected $table            = 'audit_logs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'user_id',
        'action',
        'entity',
        'entity_id',
        'old_data',
        'new_data',
        'ip_address',
        'created_at',
    ];

    // Dates
    protected $useTimestamps = false;
    protected $createdField  = 'created_at';

    // Validation
    protected $validationRules = [
        'action' => 'required|max_length[50]',
        'entity' => 'required|max_length[100]',
    ];

    protected $skipValidation = false;

    /**
     * Log an action
     */
    public function logAction(
        string $action,
        string $entity,
        ?int $entityId = null,
        ?array $oldData = null,
        ?array $newData = null
    ): bool {
        $session = session();

        $data = [
            'user_id'    => $session->get('user_id'),
            'action'     => $action,
            'entity'     => $entity,
            'entity_id'  => $entityId,
            'old_data'   => $oldData ? json_encode($oldData) : null,
            'new_data'   => $newData ? json_encode($newData) : null,
            'ip_address' => service('request')->getIPAddress(),
            'created_at' => date('Y-m-d H:i:s'),
        ];

        return $this->insert($data) !== false;
    }

    /**
     * Get logs with user info
     */
    public function getWithUser(): array
    {
        return $this->select('audit_logs.*, users.name as user_name')
                    ->join('users', 'users.id = audit_logs.user_id', 'left')
                    ->orderBy('audit_logs.created_at', 'DESC')
                    ->findAll();
    }

    /**
     * Get logs for an entity
     */
    public function getByEntity(string $entity, ?int $entityId = null): array
    {
        $builder = $this->select('audit_logs.*, users.name as user_name')
                        ->join('users', 'users.id = audit_logs.user_id', 'left')
                        ->where('entity', $entity);

        if ($entityId) {
            $builder->where('entity_id', $entityId);
        }

        return $builder->orderBy('created_at', 'DESC')->findAll();
    }

    /**
     * Get logs by user
     */
    public function getByUser(int $userId): array
    {
        return $this->where('user_id', $userId)
                    ->orderBy('created_at', 'DESC')
                    ->findAll();
    }

    /**
     * Get recent logs
     */
    public function getRecent(int $limit = 50): array
    {
        return $this->select('audit_logs.*, users.name as user_name')
                    ->join('users', 'users.id = audit_logs.user_id', 'left')
                    ->orderBy('audit_logs.created_at', 'DESC')
                    ->limit($limit)
                    ->findAll();
    }

    /**
     * Get action label in Turkish
     */
    public static function getActionLabel(string $action): string
    {
        return match($action) {
            'create' => 'Oluşturma',
            'update' => 'Güncelleme',
            'delete' => 'Silme',
            'login'  => 'Giriş',
            'logout' => 'Çıkış',
            default  => $action,
        };
    }

    /**
     * Get entity label in Turkish
     */
    public static function getEntityLabel(string $entity): string
    {
        return match($entity) {
            'user'        => 'Kullanıcı',
            'party'       => 'Taraf',
            'category'    => 'Kategori',
            'project'     => 'Proje',
            'milestone'   => 'Milestone',
            'transaction' => 'İşlem',
            'debt'        => 'Borç/Alacak',
            'installment' => 'Taksit',
            'payment'     => 'Ödeme',
            'rate'        => 'Döviz Kuru',
            default       => $entity,
        };
    }
}

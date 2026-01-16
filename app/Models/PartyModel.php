<?php

namespace App\Models;

use CodeIgniter\Model;

class PartyModel extends Model
{
    protected $table            = 'parties';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'type',
        'name',
        'tax_no',
        'phone',
        'email',
        'address',
        'notes',
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    // Validation
    protected $validationRules = [
        'type'   => 'required|in_list[customer,vendor,other]',
        'name'   => 'required|min_length[2]|max_length[255]',
        'tax_no' => 'permit_empty|max_length[20]',
        'phone'  => 'permit_empty|max_length[20]',
        'email'  => 'permit_empty|valid_email',
    ];

    protected $validationMessages = [
        'type' => [
            'required' => 'Taraf tipi zorunludur.',
            'in_list'  => 'Geçersiz taraf tipi.',
        ],
        'name' => [
            'required'   => 'Ad alanı zorunludur.',
            'min_length' => 'Ad en az 2 karakter olmalıdır.',
        ],
        'email' => [
            'valid_email' => 'Geçerli bir e-posta adresi giriniz.',
        ],
    ];

    protected $skipValidation = false;

    /**
     * Get customers only
     */
    public function getCustomers(): array
    {
        return $this->where('type', 'customer')->orderBy('name', 'ASC')->findAll();
    }

    /**
     * Get vendors only
     */
    public function getVendors(): array
    {
        return $this->where('type', 'vendor')->orderBy('name', 'ASC')->findAll();
    }

    /**
     * Get parties by type
     */
    public function getByType(string $type): array
    {
        return $this->where('type', $type)->orderBy('name', 'ASC')->findAll();
    }

    /**
     * Get party with related transactions count
     */
    public function getWithTransactionCount(int $id): ?array
    {
        $party = $this->find($id);
        if ($party) {
            $transactionModel = new TransactionModel();
            $party['transaction_count'] = $transactionModel->where('party_id', $id)->countAllResults();
        }
        return $party;
    }

    /**
     * Get all parties for dropdown
     */
    public function getForDropdown(): array
    {
        $parties = $this->orderBy('type', 'ASC')->orderBy('name', 'ASC')->findAll();
        $result = [];
        foreach ($parties as $party) {
            $typeLabel = match($party['type']) {
                'customer' => 'Müşteri',
                'vendor'   => 'Tedarikçi',
                default    => 'Diğer',
            };
            $result[$party['id']] = "[{$typeLabel}] {$party['name']}";
        }
        return $result;
    }
}

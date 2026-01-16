<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run()
    {
        $data = [
            // Income Categories
            [
                'name'      => 'Satış Geliri',
                'type'      => 'income',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Hizmet Geliri',
                'type'      => 'income',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Faiz Geliri',
                'type'      => 'income',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Diğer Gelirler',
                'type'      => 'income',
                'parent_id' => null,
                'is_active' => 1,
            ],

            // Expense Categories
            [
                'name'      => 'Personel Gideri',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Kira Gideri',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Elektrik/Su/Doğalgaz',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'İletişim Gideri',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Ofis Malzemeleri',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Ulaşım Gideri',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Pazarlama Gideri',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Yazılım/Lisans',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
            [
                'name'      => 'Diğer Giderler',
                'type'      => 'expense',
                'parent_id' => null,
                'is_active' => 1,
            ],
        ];

        $this->db->table('categories')->insertBatch($data);

        echo "Categories seeded successfully.\n";
    }
}

<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class PartySeeder extends Seeder
{
    public function run()
    {
        $data = [
            // Customers
            [
                'type'    => 'customer',
                'name'    => 'ABC Teknoloji A.Ş.',
                'tax_no'  => '1234567890',
                'phone'   => '0212 555 1234',
                'email'   => 'info@abcteknoloji.com',
                'address' => 'Maslak, İstanbul',
                'notes'   => 'Yazılım geliştirme müşterisi',
            ],
            [
                'type'    => 'customer',
                'name'    => 'XYZ Danışmanlık Ltd. Şti.',
                'tax_no'  => '9876543210',
                'phone'   => '0216 444 5678',
                'email'   => 'muhasebe@xyzdanismanlik.com',
                'address' => 'Kadıköy, İstanbul',
                'notes'   => 'Danışmanlık hizmetleri müşterisi',
            ],
            [
                'type'    => 'customer',
                'name'    => 'Mega İnşaat A.Ş.',
                'tax_no'  => '5555555555',
                'phone'   => '0312 333 9999',
                'email'   => 'finans@megainsaat.com',
                'address' => 'Çankaya, Ankara',
                'notes'   => 'İnşaat sektörü müşterisi',
            ],

            // Vendors
            [
                'type'    => 'vendor',
                'name'    => 'Bulut Hosting Hizmetleri',
                'tax_no'  => '1111111111',
                'phone'   => '0850 333 4444',
                'email'   => 'destek@buluthosting.com',
                'address' => 'Ataşehir, İstanbul',
                'notes'   => 'Sunucu ve hosting hizmetleri',
            ],
            [
                'type'    => 'vendor',
                'name'    => 'Ofis Malzemeleri Ltd.',
                'tax_no'  => '2222222222',
                'phone'   => '0212 666 7777',
                'email'   => 'siparis@ofismalzemeleri.com',
                'address' => 'Şişli, İstanbul',
                'notes'   => 'Ofis malzemeleri tedarikçisi',
            ],
        ];

        $this->db->table('parties')->insertBatch($data);

        echo "Parties seeded successfully.\n";
    }
}

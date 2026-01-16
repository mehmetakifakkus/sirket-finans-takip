<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class TransactionSeeder extends Seeder
{
    public function run()
    {
        $data = [
            // Income transactions
            [
                'type'             => 'income',
                'party_id'         => 1, // ABC Teknoloji
                'category_id'      => 2, // Hizmet Geliri
                'project_id'       => 1,
                'milestone_id'     => 1, // Peşinat
                'date'             => date('Y-m-d', strtotime('-2 months')),
                'amount'           => 45000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'vat_amount'       => 9000.00,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 54000.00,
                'description'      => 'E-Ticaret Projesi - Peşinat',
                'ref_no'           => 'FTR-2024-001',
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'income',
                'party_id'         => 1, // ABC Teknoloji
                'category_id'      => 2, // Hizmet Geliri
                'project_id'       => 1,
                'milestone_id'     => 2, // Tasarım
                'date'             => date('Y-m-d', strtotime('-1 month')),
                'amount'           => 30000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'vat_amount'       => 6000.00,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 36000.00,
                'description'      => 'E-Ticaret Projesi - Tasarım Teslimi',
                'ref_no'           => 'FTR-2024-002',
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'income',
                'party_id'         => 2, // XYZ Danışmanlık
                'category_id'      => 2, // Hizmet Geliri
                'project_id'       => 2,
                'milestone_id'     => 5, // Mobil peşinat
                'date'             => date('Y-m-d', strtotime('-1 month')),
                'amount'           => 7500.00,
                'currency'         => 'USD',
                'vat_rate'         => 0,
                'vat_amount'       => 0,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 7500.00,
                'description'      => 'Mobil Uygulama Projesi - Peşinat',
                'ref_no'           => 'INV-2024-001',
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'income',
                'party_id'         => 3, // Mega İnşaat
                'category_id'      => 1, // Satış Geliri
                'project_id'       => null,
                'milestone_id'     => null,
                'date'             => date('Y-m-d', strtotime('-15 days')),
                'amount'           => 25000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'vat_amount'       => 5000.00,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 30000.00,
                'description'      => 'Yazılım Lisans Satışı',
                'ref_no'           => 'FTR-2024-003',
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'income',
                'party_id'         => null,
                'category_id'      => 3, // Faiz Geliri
                'project_id'       => null,
                'milestone_id'     => null,
                'date'             => date('Y-m-d', strtotime('-5 days')),
                'amount'           => 1500.00,
                'currency'         => 'TRY',
                'vat_rate'         => 0,
                'vat_amount'       => 0,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 1500.00,
                'description'      => 'Mevduat Faiz Geliri',
                'ref_no'           => null,
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],

            // Expense transactions
            [
                'type'             => 'expense',
                'party_id'         => 4, // Bulut Hosting
                'category_id'      => 12, // Yazılım/Lisans
                'project_id'       => null,
                'milestone_id'     => null,
                'date'             => date('Y-m-d', strtotime('-25 days')),
                'amount'           => 2500.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'vat_amount'       => 500.00,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 3000.00,
                'description'      => 'Aylık Sunucu Hosting Ücreti',
                'ref_no'           => 'GDR-2024-001',
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'expense',
                'party_id'         => null,
                'category_id'      => 5, // Personel Gideri
                'project_id'       => null,
                'milestone_id'     => null,
                'date'             => date('Y-m-d', strtotime('-20 days')),
                'amount'           => 85000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 0,
                'vat_amount'       => 0,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 85000.00,
                'description'      => 'Aylık Maaş Ödemeleri',
                'ref_no'           => null,
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'expense',
                'party_id'         => null,
                'category_id'      => 6, // Kira Gideri
                'project_id'       => null,
                'milestone_id'     => null,
                'date'             => date('Y-m-d', strtotime('-18 days')),
                'amount'           => 15000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 0,
                'vat_amount'       => 0,
                'withholding_rate' => 20,
                'withholding_amount' => 3000.00,
                'net_amount'       => 12000.00,
                'description'      => 'Ofis Kira Ödemesi',
                'ref_no'           => null,
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'expense',
                'party_id'         => 5, // Ofis Malzemeleri
                'category_id'      => 9, // Ofis Malzemeleri
                'project_id'       => null,
                'milestone_id'     => null,
                'date'             => date('Y-m-d', strtotime('-10 days')),
                'amount'           => 3500.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'vat_amount'       => 700.00,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 4200.00,
                'description'      => 'Ofis Malzemesi Alımı',
                'ref_no'           => 'GDR-2024-002',
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            [
                'type'             => 'expense',
                'party_id'         => null,
                'category_id'      => 7, // Elektrik/Su/Doğalgaz
                'project_id'       => null,
                'milestone_id'     => null,
                'date'             => date('Y-m-d', strtotime('-7 days')),
                'amount'           => 2800.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'vat_amount'       => 560.00,
                'withholding_rate' => 0,
                'withholding_amount' => 0,
                'net_amount'       => 3360.00,
                'description'      => 'Elektrik Faturası',
                'ref_no'           => null,
                'created_by'       => 1,
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
        ];

        $this->db->table('transactions')->insertBatch($data);

        echo "Transactions seeded successfully.\n";
    }
}

<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run()
    {
        // Projects
        $projects = [
            [
                'party_id'        => 1, // ABC Teknoloji
                'title'           => 'E-Ticaret Platformu Geliştirme',
                'contract_amount' => 150000.00,
                'currency'        => 'TRY',
                'start_date'      => date('Y-m-d', strtotime('-2 months')),
                'end_date'        => date('Y-m-d', strtotime('+4 months')),
                'status'          => 'active',
                'notes'           => 'PHP/Laravel tabanlı e-ticaret platformu geliştirme projesi',
                'created_at'      => date('Y-m-d H:i:s'),
                'updated_at'      => date('Y-m-d H:i:s'),
            ],
            [
                'party_id'        => 2, // XYZ Danışmanlık
                'title'           => 'Mobil Uygulama Projesi',
                'contract_amount' => 25000.00,
                'currency'        => 'USD',
                'start_date'      => date('Y-m-d', strtotime('-1 month')),
                'end_date'        => date('Y-m-d', strtotime('+2 months')),
                'status'          => 'active',
                'notes'           => 'iOS ve Android mobil uygulama geliştirme',
                'created_at'      => date('Y-m-d H:i:s'),
                'updated_at'      => date('Y-m-d H:i:s'),
            ],
        ];

        $this->db->table('projects')->insertBatch($projects);

        // Milestones for Project 1
        $milestones1 = [
            [
                'project_id'      => 1,
                'title'           => 'Proje Başlangıcı - Peşinat',
                'expected_date'   => date('Y-m-d', strtotime('-2 months')),
                'expected_amount' => 45000.00,
                'currency'        => 'TRY',
                'status'          => 'paid',
                'notes'           => '%30 peşinat ödemesi',
            ],
            [
                'project_id'      => 1,
                'title'           => 'Tasarım Teslimi',
                'expected_date'   => date('Y-m-d', strtotime('-1 month')),
                'expected_amount' => 30000.00,
                'currency'        => 'TRY',
                'status'          => 'paid',
                'notes'           => 'UI/UX tasarım teslimi sonrası',
            ],
            [
                'project_id'      => 1,
                'title'           => 'Beta Sürümü',
                'expected_date'   => date('Y-m-d', strtotime('+1 month')),
                'expected_amount' => 45000.00,
                'currency'        => 'TRY',
                'status'          => 'pending',
                'notes'           => 'Beta sürüm teslimi',
            ],
            [
                'project_id'      => 1,
                'title'           => 'Final Teslim',
                'expected_date'   => date('Y-m-d', strtotime('+4 months')),
                'expected_amount' => 30000.00,
                'currency'        => 'TRY',
                'status'          => 'pending',
                'notes'           => 'Proje final teslimi ve kalan ödeme',
            ],
        ];

        // Milestones for Project 2
        $milestones2 = [
            [
                'project_id'      => 2,
                'title'           => 'Peşinat',
                'expected_date'   => date('Y-m-d', strtotime('-1 month')),
                'expected_amount' => 7500.00,
                'currency'        => 'USD',
                'status'          => 'paid',
                'notes'           => '%30 peşinat',
            ],
            [
                'project_id'      => 2,
                'title'           => 'iOS Sürümü',
                'expected_date'   => date('Y-m-d', strtotime('+1 month')),
                'expected_amount' => 8750.00,
                'currency'        => 'USD',
                'status'          => 'pending',
                'notes'           => 'iOS uygulama teslimi',
            ],
            [
                'project_id'      => 2,
                'title'           => 'Android Sürümü ve Final',
                'expected_date'   => date('Y-m-d', strtotime('+2 months')),
                'expected_amount' => 8750.00,
                'currency'        => 'USD',
                'status'          => 'pending',
                'notes'           => 'Android teslimi ve final',
            ],
        ];

        $this->db->table('project_milestones')->insertBatch(array_merge($milestones1, $milestones2));

        echo "Projects and milestones seeded successfully.\n";
    }
}

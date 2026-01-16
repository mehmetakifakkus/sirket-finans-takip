<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class DebtSeeder extends Seeder
{
    public function run()
    {
        // Debts and Receivables
        $debts = [
            // Debt 1 - Borç (with installments)
            [
                'kind'             => 'debt',
                'party_id'         => 4, // Bulut Hosting
                'principal_amount' => 12000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'start_date'       => date('Y-m-d', strtotime('-1 month')),
                'due_date'         => date('Y-m-d', strtotime('+5 months')),
                'status'           => 'open',
                'notes'            => 'Yıllık hosting paketi - 6 taksit',
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            // Debt 2 - Borç (with installments)
            [
                'kind'             => 'debt',
                'party_id'         => 5, // Ofis Malzemeleri
                'principal_amount' => 8000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'start_date'       => date('Y-m-d', strtotime('-15 days')),
                'due_date'         => date('Y-m-d', strtotime('+2 months')),
                'status'           => 'open',
                'notes'            => 'Ofis mobilyası - 4 taksit',
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
            // Receivable - Alacak
            [
                'kind'             => 'receivable',
                'party_id'         => 3, // Mega İnşaat
                'principal_amount' => 35000.00,
                'currency'         => 'TRY',
                'vat_rate'         => 20,
                'start_date'       => date('Y-m-d', strtotime('-10 days')),
                'due_date'         => date('Y-m-d', strtotime('+1 month')),
                'status'           => 'open',
                'notes'            => 'Yazılım geliştirme alacağı',
                'created_at'       => date('Y-m-d H:i:s'),
                'updated_at'       => date('Y-m-d H:i:s'),
            ],
        ];

        $this->db->table('debts')->insertBatch($debts);

        // Installments for Debt 1 (12000 TRY, 6 installments = 2000 TRY each)
        $installments1 = [];
        for ($i = 0; $i < 6; $i++) {
            $dueDate = date('Y-m-d', strtotime("-1 month +{$i} months"));
            $status = $i === 0 ? 'paid' : 'pending';
            $paidAmount = $i === 0 ? 2000.00 : 0;

            $installments1[] = [
                'debt_id'     => 1,
                'due_date'    => $dueDate,
                'amount'      => 2000.00,
                'currency'    => 'TRY',
                'status'      => $status,
                'paid_amount' => $paidAmount,
                'notes'       => 'Taksit ' . ($i + 1) . '/6',
            ];
        }

        // Installments for Debt 2 (8000 TRY, 4 installments = 2000 TRY each)
        $installments2 = [];
        for ($i = 0; $i < 4; $i++) {
            $dueDate = date('Y-m-d', strtotime("-15 days +{$i} months"));

            $installments2[] = [
                'debt_id'     => 2,
                'due_date'    => $dueDate,
                'amount'      => 2000.00,
                'currency'    => 'TRY',
                'status'      => 'pending',
                'paid_amount' => 0,
                'notes'       => 'Taksit ' . ($i + 1) . '/4',
            ];
        }

        $allInstallments = array_merge($installments1, $installments2);
        $this->db->table('installments')->insertBatch($allInstallments);

        // Payment for first installment of Debt 1
        $payment = [
            'related_type'   => 'installment',
            'related_id'     => 1, // First installment
            'transaction_id' => null,
            'date'           => date('Y-m-d', strtotime('-1 month')),
            'amount'         => 2000.00,
            'currency'       => 'TRY',
            'method'         => 'bank',
            'notes'          => 'İlk taksit ödemesi',
            'created_at'     => date('Y-m-d H:i:s'),
        ];

        $this->db->table('payments')->insert($payment);

        echo "Debts, installments, and payments seeded successfully.\n";
    }
}

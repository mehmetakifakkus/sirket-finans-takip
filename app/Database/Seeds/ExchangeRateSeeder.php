<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class ExchangeRateSeeder extends Seeder
{
    public function run()
    {
        $data = [];

        // Last 7 days of exchange rates
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));

            // USD rate (around 32-33 TRY range)
            $usdRate = 32.50 + (mt_rand(-50, 50) / 100);

            // EUR rate (around 35-36 TRY range)
            $eurRate = 35.20 + (mt_rand(-50, 50) / 100);

            $data[] = [
                'rate_date'      => $date,
                'base_currency'  => 'TRY',
                'quote_currency' => 'USD',
                'rate'           => round($usdRate, 4),
                'source'         => 'manual',
                'created_at'     => date('Y-m-d H:i:s'),
            ];

            $data[] = [
                'rate_date'      => $date,
                'base_currency'  => 'TRY',
                'quote_currency' => 'EUR',
                'rate'           => round($eurRate, 4),
                'source'         => 'manual',
                'created_at'     => date('Y-m-d H:i:s'),
            ];
        }

        $this->db->table('exchange_rates')->insertBatch($data);

        echo "Exchange rates seeded successfully.\n";
    }
}

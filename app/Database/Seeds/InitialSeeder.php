<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class InitialSeeder extends Seeder
{
    public function run()
    {
        // Users
        $this->call('UserSeeder');

        // Categories
        $this->call('CategorySeeder');

        // Parties
        $this->call('PartySeeder');

        // Exchange Rates
        $this->call('ExchangeRateSeeder');

        // Projects & Milestones
        $this->call('ProjectSeeder');

        // Transactions
        $this->call('TransactionSeeder');

        // Debts & Installments
        $this->call('DebtSeeder');
    }
}

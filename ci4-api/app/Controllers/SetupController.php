<?php

namespace App\Controllers;

use App\Libraries\Database;

class SetupController extends BaseController
{
    /**
     * Check setup status
     * GET /api/setup/check
     */
    public function check()
    {
        try {
            $db = Database::connect();

            // Check if tables exist
            $tables = Database::listTables();
            $requiredTables = ['users', 'parties', 'categories', 'transactions', 'projects'];
            $tablesExist = count(array_intersect($requiredTables, $tables)) === count($requiredTables);

            // Check if admin exists
            $hasAdmin = false;
            if ($tablesExist) {
                $hasAdmin = Database::count('users', "role = 'admin'") > 0;
            }

            // Check if categories exist
            $hasCategories = false;
            if ($tablesExist) {
                $hasCategories = Database::count('categories') > 0;
            }

            return $this->success('Kurulum durumu', [
                'tables_exist' => $tablesExist,
                'has_admin' => $hasAdmin,
                'has_categories' => $hasCategories,
                'setup_complete' => $tablesExist && $hasAdmin
            ]);

        } catch (\Exception $e) {
            return $this->error('Veritabanı bağlantı hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Initialize database tables
     * POST /api/setup/initialize
     */
    public function initialize()
    {
        try {
            $db = Database::connect();

            // Tables already created via SQL, just verify
            $tables = Database::listTables();
            $requiredTables = ['users', 'parties', 'categories', 'transactions', 'projects'];
            $existing = array_intersect($requiredTables, $tables);

            return $this->success('Veritabanı tabloları kontrol edildi', [
                'existing_tables' => $existing,
                'all_tables' => $tables
            ]);

        } catch (\Exception $e) {
            return $this->error('Veritabanı hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create admin user
     * POST /api/setup/create-admin
     */
    public function createAdmin()
    {
        $data = $this->getJsonInput();

        // Validate required fields
        $errors = $this->validateRequired($data, ['email', 'password', 'name']);
        if (!empty($errors)) {
            return $this->validationError($errors);
        }

        try {
            // Check if admin already exists
            if (Database::count('users', "role = 'admin'") > 0) {
                return $this->error('Admin kullanıcı zaten mevcut', 409);
            }

            // Validate email
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return $this->validationError(['email' => 'Geçerli bir e-posta adresi girin']);
            }

            $id = Database::insert('users', [
                'email' => $data['email'],
                'password' => password_hash($data['password'], PASSWORD_DEFAULT),
                'name' => $data['name'],
                'role' => 'admin',
                'status' => 'active',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $user = Database::queryOne("SELECT id, email, name, role, status FROM users WHERE id = ?", [$id]);

            return $this->created('Admin kullanıcı oluşturuldu', [
                'user' => $user
            ]);

        } catch (\Exception $e) {
            return $this->error('Kullanıcı oluşturulamadı: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Seed default categories
     * POST /api/setup/seed-categories
     */
    public function seedCategories()
    {
        $incomeCategories = [
            'Satış Geliri',
            'Hizmet Geliri',
            'Proje Geliri',
            'Hibe Geliri',
            'Faiz Geliri',
            'Kira Geliri',
            'Diğer Gelirler'
        ];

        $expenseCategories = [
            'Personel Giderleri',
            'Ofis Giderleri',
            'Operasyonel Giderler',
            'Pazarlama Giderleri',
            'Seyahat Giderleri',
            'Vergi ve Harçlar',
            'Finans Giderleri',
            'Diğer Giderler'
        ];

        try {
            $added = 0;

            // Income categories
            foreach ($incomeCategories as $name) {
                $exists = Database::count('categories', "name = ? AND type = 'income'", [$name]);
                if ($exists === 0) {
                    Database::insert('categories', [
                        'name' => $name,
                        'type' => 'income',
                        'is_active' => 1,
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                    $added++;
                }
            }

            // Expense categories
            foreach ($expenseCategories as $name) {
                $exists = Database::count('categories', "name = ? AND type = 'expense'", [$name]);
                if ($exists === 0) {
                    Database::insert('categories', [
                        'name' => $name,
                        'type' => 'expense',
                        'is_active' => 1,
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                    $added++;
                }
            }

            return $this->success('Kategoriler oluşturuldu', ['added' => $added]);

        } catch (\Exception $e) {
            return $this->error('Kategoriler oluşturulamadı: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Seed exchange rates
     * POST /api/setup/seed-rates
     */
    public function seedRates()
    {
        $today = date('Y-m-d');
        $defaultRates = [
            'USD' => 34.50,
            'EUR' => 37.80,
            'GBP' => 44.20,
            'GOLD' => 2950.00
        ];

        try {
            foreach ($defaultRates as $currency => $rate) {
                $exists = Database::count('exchange_rates', "currency = ? AND date = ?", [$currency, $today]);
                if ($exists > 0) {
                    Database::execute(
                        "UPDATE exchange_rates SET rate = ?, source = 'seed', updated_at = ? WHERE currency = ? AND date = ?",
                        [$rate, date('Y-m-d H:i:s'), $currency, $today]
                    );
                } else {
                    Database::insert('exchange_rates', [
                        'currency' => $currency,
                        'rate' => $rate,
                        'date' => $today,
                        'source' => 'seed',
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }

            return $this->success('Döviz kurları oluşturuldu', [
                'rates' => $defaultRates
            ]);

        } catch (\Exception $e) {
            return $this->error('Kurlar oluşturulamadı: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Seed demo data
     * POST /api/setup/seed-demo
     */
    public function seedDemo()
    {
        try {
            // Create demo parties
            $parties = [
                ['name' => 'ABC Şirketi', 'type' => 'customer', 'email' => 'info@abc.com'],
                ['name' => 'XYZ Tedarik', 'type' => 'vendor', 'email' => 'info@xyz.com'],
                ['name' => 'Demo Müşteri', 'type' => 'customer', 'email' => 'demo@musteri.com'],
            ];

            $added = 0;
            foreach ($parties as $party) {
                $exists = Database::count('parties', "email = ?", [$party['email']]);
                if ($exists === 0) {
                    Database::insert('parties', array_merge($party, [
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]));
                    $added++;
                }
            }

            return $this->success('Demo veriler oluşturuldu', ['added' => $added]);

        } catch (\Exception $e) {
            return $this->error('Demo veriler oluşturulamadı: ' . $e->getMessage(), 500);
        }
    }
}

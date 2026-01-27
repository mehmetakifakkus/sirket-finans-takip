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

    /**
     * Run migrations for party grant fields
     * POST /api/setup/migrate-party-grants
     */
    public function migratePartyGrants()
    {
        try {
            $db = Database::connect();

            // Check if columns already exist
            $columns = $db->query("SHOW COLUMNS FROM parties")->fetchAll(\PDO::FETCH_COLUMN);

            $added = [];

            if (!in_array('grant_rate', $columns)) {
                $db->exec("ALTER TABLE parties ADD COLUMN grant_rate DECIMAL(5,2) DEFAULT NULL");
                $added[] = 'grant_rate';
            }

            if (!in_array('grant_limit', $columns)) {
                $db->exec("ALTER TABLE parties ADD COLUMN grant_limit DECIMAL(15,2) DEFAULT NULL");
                $added[] = 'grant_limit';
            }

            if (!in_array('vat_included', $columns)) {
                $db->exec("ALTER TABLE parties ADD COLUMN vat_included TINYINT(1) DEFAULT 1");
                $added[] = 'vat_included';
            }

            return $this->success('Party grant alanları eklendi', [
                'added_columns' => $added
            ]);

        } catch (\Exception $e) {
            return $this->error('Migration hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Fix project_grants table schema
     * POST /api/setup/fix-grants-table
     */
    public function fixGrantsTable()
    {
        try {
            $db = Database::connect();

            // Disable foreign key checks temporarily
            $db->exec("SET FOREIGN_KEY_CHECKS = 0");

            // Drop and recreate project_grants table with correct schema
            $db->exec("DROP TABLE IF EXISTS project_grants");

            // Get projects table id column type to match
            $result = $db->query("SHOW COLUMNS FROM projects WHERE Field = 'id'")->fetch(\PDO::FETCH_ASSOC);
            $idType = $result ? strtoupper($result['Type']) : 'INT';

            // Use BIGINT UNSIGNED if projects.id is BIGINT UNSIGNED, otherwise INT
            $projectIdType = (strpos($idType, 'BIGINT') !== false) ? 'BIGINT UNSIGNED' : 'INT UNSIGNED';

            $db->exec("CREATE TABLE project_grants (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                project_id {$projectIdType} NOT NULL,
                provider_name VARCHAR(255) NOT NULL,
                provider_type ENUM('tubitak', 'kosgeb', 'sponsor', 'other') NOT NULL,
                funding_rate DECIMAL(5,2),
                funding_amount DECIMAL(15,2),
                vat_excluded TINYINT(1) DEFAULT 1,
                approved_amount DECIMAL(15,2) DEFAULT 0,
                received_amount DECIMAL(15,2) DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'TRY',
                status ENUM('pending', 'approved', 'partial', 'received', 'rejected') DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_project_grants_project (project_id),
                INDEX idx_project_grants_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Add foreign key after table creation
            $db->exec("ALTER TABLE project_grants ADD CONSTRAINT fk_grants_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE");

            // Re-enable foreign key checks
            $db->exec("SET FOREIGN_KEY_CHECKS = 1");

            return $this->success('project_grants tablosu yeniden oluşturuldu', [
                'project_id_type' => $projectIdType
            ]);

        } catch (\Exception $e) {
            // Make sure to re-enable foreign key checks even on error
            try {
                $db = Database::connect();
                $db->exec("SET FOREIGN_KEY_CHECKS = 1");
            } catch (\Exception $ignored) {}

            return $this->error('Tablo oluşturulamadı: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create transaction_templates table
     * POST /api/setup/create-templates-table
     */
    public function createTemplatesTable()
    {
        try {
            $db = Database::connect();

            // Check if table exists
            if (Database::tableExists('transaction_templates')) {
                return $this->success('transaction_templates tablosu zaten mevcut');
            }

            $db->exec("CREATE TABLE transaction_templates (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type ENUM('income', 'expense') NOT NULL,
                category_id INT UNSIGNED DEFAULT NULL,
                party_id INT UNSIGNED DEFAULT NULL,
                amount DECIMAL(15,2) DEFAULT NULL,
                currency VARCHAR(10) DEFAULT 'TRY',
                vat_rate DECIMAL(5,2) DEFAULT 0,
                withholding_rate DECIMAL(5,2) DEFAULT 0,
                description TEXT,
                recurrence ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') DEFAULT 'none',
                next_date DATE DEFAULT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_templates_type (type),
                INDEX idx_templates_active (is_active),
                INDEX idx_templates_next_date (next_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            return $this->success('transaction_templates tablosu oluşturuldu');

        } catch (\Exception $e) {
            return $this->error('Tablo oluşturulamadı: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Add description column to transactions table
     * POST /api/setup/add-transaction-description
     */
    public function addTransactionDescription()
    {
        try {
            $db = Database::connect();

            // Check if column already exists
            $columns = $db->query("SHOW COLUMNS FROM transactions")->fetchAll(\PDO::FETCH_COLUMN);

            if (in_array('description', $columns)) {
                return $this->success('description sütunu zaten mevcut');
            }

            $db->exec("ALTER TABLE transactions ADD COLUMN description TEXT DEFAULT NULL");

            return $this->success('description sütunu eklendi');

        } catch (\Exception $e) {
            return $this->error('Sütun eklenemedi: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Migrate base_amount field for transactions
     * POST /api/setup/migrate-base-amount
     *
     * Adds base_amount column if not exists and calculates values for existing transactions
     */
    public function migrateBaseAmount()
    {
        try {
            $db = Database::connect();

            // Check if column already exists
            $columns = $db->query("SHOW COLUMNS FROM transactions")->fetchAll(\PDO::FETCH_COLUMN);

            $columnAdded = false;
            if (!in_array('base_amount', $columns)) {
                $db->exec("ALTER TABLE transactions ADD COLUMN base_amount DECIMAL(15,2) DEFAULT NULL");
                $columnAdded = true;
            }

            // Update existing transactions: base_amount = amount - vat_amount
            // This assumes all existing transactions were entered as VAT-included
            $db->exec("
                UPDATE transactions
                SET base_amount = ROUND(amount - COALESCE(vat_amount, 0), 2),
                    updated_at = NOW()
                WHERE base_amount IS NULL
            ");

            $countResult = Database::queryOne(
                "SELECT COUNT(*) as count FROM transactions WHERE base_amount IS NOT NULL"
            );
            $updated = (int)($countResult['count'] ?? 0);

            return $this->success('base_amount migration tamamlandı', [
                'column_added' => $columnAdded,
                'transactions_updated' => $updated
            ]);

        } catch (\Exception $e) {
            return $this->error('Migration hatası: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update existing transactions with 20% VAT
     * POST /api/setup/update-vat-20
     *
     * Sets vat_rate = 20, calculates vat_amount as VAT-included (amount * 20 / 120),
     * and recalculates net_amount = amount - withholding_amount
     */
    public function updateVat20()
    {
        try {
            $db = Database::connect();

            // Get count of transactions to be updated
            $countResult = Database::queryOne(
                "SELECT COUNT(*) as count FROM transactions WHERE vat_rate != 20 OR vat_rate IS NULL"
            );
            $toUpdate = (int)($countResult['count'] ?? 0);

            if ($toUpdate === 0) {
                return $this->success('Güncellenecek işlem yok, tüm işlemler zaten %20 KDV ile', [
                    'updated' => 0
                ]);
            }

            // Update all transactions:
            // vat_rate = 20
            // vat_amount = amount * 20 / 120 (VAT-included calculation)
            // net_amount = amount - withholding_amount
            $db->exec("
                UPDATE transactions
                SET
                    vat_rate = 20,
                    vat_amount = ROUND(amount * 20 / 120, 2),
                    net_amount = ROUND(amount - COALESCE(withholding_amount, 0), 2),
                    updated_at = NOW()
                WHERE vat_rate != 20 OR vat_rate IS NULL
            ");

            return $this->success('İşlemler %20 KDV ile güncellendi', [
                'updated' => $toUpdate
            ]);

        } catch (\Exception $e) {
            return $this->error('Güncelleme hatası: ' . $e->getMessage(), 500);
        }
    }
}

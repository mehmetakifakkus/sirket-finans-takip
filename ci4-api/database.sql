-- ============================================================
-- Şirket Finans Takip - Veritabanı Şeması
-- MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Kullanıcılar
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Taraflar (Müşteri, Tedarikçi, vb.)
CREATE TABLE IF NOT EXISTS `parties` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('customer', 'vendor', 'employee', 'tubitak', 'kosgeb', 'individual', 'other') NOT NULL DEFAULT 'customer',
  `name` VARCHAR(255) NOT NULL,
  `tax_no` VARCHAR(50) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `grant_rate` DECIMAL(5,2) DEFAULT NULL,
  `grant_limit` DECIMAL(15,2) DEFAULT NULL,
  `vat_included` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_parties_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kategoriler
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `parent_id` INT UNSIGNED DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_categories_type` (`type`),
  INDEX `idx_categories_parent` (`parent_id`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projeler
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `party_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `contract_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'TRY',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `status` ENUM('active', 'completed', 'cancelled', 'on_hold') NOT NULL DEFAULT 'active',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_projects_party` (`party_id`),
  INDEX `idx_projects_status` (`status`),
  CONSTRAINT `fk_projects_party` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proje Kilometre Taşları
CREATE TABLE IF NOT EXISTS `project_milestones` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `expected_date` DATE DEFAULT NULL,
  `expected_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'TRY',
  `status` ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_milestones_project` (`project_id`),
  INDEX `idx_milestones_status` (`status`),
  CONSTRAINT `fk_milestones_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proje Hibeler
CREATE TABLE IF NOT EXISTS `project_grants` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT UNSIGNED NOT NULL,
  `provider_name` VARCHAR(255) NOT NULL,
  `provider_type` ENUM('tubitak', 'kosgeb', 'sponsor', 'other') NOT NULL,
  `funding_rate` DECIMAL(5,2) DEFAULT NULL,
  `funding_amount` DECIMAL(15,2) DEFAULT NULL,
  `vat_excluded` TINYINT(1) DEFAULT 1,
  `approved_amount` DECIMAL(15,2) DEFAULT 0,
  `received_amount` DECIMAL(15,2) DEFAULT 0,
  `currency` VARCHAR(10) DEFAULT 'TRY',
  `status` ENUM('pending', 'approved', 'partial', 'received', 'rejected') DEFAULT 'pending',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_project_grants_project` (`project_id`),
  INDEX `idx_project_grants_status` (`status`),
  CONSTRAINT `fk_grants_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İşlemler (Gelir/Gider)
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('income', 'expense') NOT NULL,
  `party_id` INT UNSIGNED DEFAULT NULL,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `project_id` INT UNSIGNED DEFAULT NULL,
  `milestone_id` INT UNSIGNED DEFAULT NULL,
  `grant_id` INT UNSIGNED DEFAULT NULL,
  `date` DATE NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `base_amount` DECIMAL(15,2) DEFAULT NULL,
  `insurance_amount` DECIMAL(15,2) DEFAULT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'TRY',
  `vat_rate` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `vat_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `withholding_rate` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `withholding_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `net_amount` DECIMAL(15,2) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `ref_no` VARCHAR(100) DEFAULT NULL,
  `document_path` VARCHAR(500) DEFAULT NULL,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_transactions_date` (`date`),
  INDEX `idx_transactions_type` (`type`),
  INDEX `idx_transactions_party` (`party_id`),
  INDEX `idx_transactions_category` (`category_id`),
  INDEX `idx_transactions_project` (`project_id`),
  CONSTRAINT `fk_transactions_party` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Borçlar/Alacaklar
CREATE TABLE IF NOT EXISTS `debts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `kind` ENUM('debt', 'receivable') NOT NULL,
  `party_id` INT UNSIGNED NOT NULL,
  `principal_amount` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'TRY',
  `vat_rate` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `start_date` DATE DEFAULT NULL,
  `due_date` DATE DEFAULT NULL,
  `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_debts_status` (`status`),
  INDEX `idx_debts_kind` (`kind`),
  INDEX `idx_debts_party` (`party_id`),
  INDEX `idx_debts_due_date` (`due_date`),
  CONSTRAINT `fk_debts_party` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Taksitler
CREATE TABLE IF NOT EXISTS `installments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `debt_id` INT UNSIGNED NOT NULL,
  `due_date` DATE NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'TRY',
  `status` ENUM('pending', 'paid', 'partial') NOT NULL DEFAULT 'pending',
  `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_installments_debt` (`debt_id`),
  INDEX `idx_installments_due_date` (`due_date`),
  INDEX `idx_installments_status` (`status`),
  CONSTRAINT `fk_installments_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ödemeler
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `related_type` ENUM('installment', 'debt', 'milestone') NOT NULL,
  `related_id` INT UNSIGNED NOT NULL,
  `transaction_id` INT UNSIGNED DEFAULT NULL,
  `date` DATE NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'TRY',
  `method` ENUM('cash', 'bank', 'card', 'other') NOT NULL DEFAULT 'bank',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payments_related` (`related_type`, `related_id`),
  INDEX `idx_payments_transaction` (`transaction_id`),
  CONSTRAINT `fk_payments_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Döviz Kurları
CREATE TABLE IF NOT EXISTS `exchange_rates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `rate_date` DATE NOT NULL,
  `base_currency` VARCHAR(10) NOT NULL DEFAULT 'TRY',
  `quote_currency` VARCHAR(10) NOT NULL,
  `rate` DECIMAL(15,6) NOT NULL,
  `source` ENUM('manual', 'tcmb', 'kapali-carsi') NOT NULL DEFAULT 'manual',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_exchange_rates_date_currency` (`rate_date`, `quote_currency`),
  INDEX `idx_exchange_rates_date` (`rate_date`),
  INDEX `idx_exchange_rates_currency` (`quote_currency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İşlem Dokümanları
CREATE TABLE IF NOT EXISTS `transaction_documents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transaction_id` INT UNSIGNED NOT NULL,
  `filename` VARCHAR(500) NOT NULL,
  `original_name` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT UNSIGNED NOT NULL,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_transaction_documents_transaction` (`transaction_id`),
  CONSTRAINT `fk_documents_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Denetim Logları
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(100) NOT NULL,
  `entity_id` INT UNSIGNED DEFAULT NULL,
  `old_data` TEXT DEFAULT NULL,
  `new_data` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_logs_user` (`user_id`),
  INDEX `idx_audit_logs_entity` (`entity`, `entity_id`),
  INDEX `idx_audit_logs_created` (`created_at`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İşlem Şablonları (Tekrarlayan)
CREATE TABLE IF NOT EXISTS `transaction_templates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `party_id` INT UNSIGNED DEFAULT NULL,
  `amount` DECIMAL(15,2) DEFAULT NULL,
  `currency` VARCHAR(10) DEFAULT 'TRY',
  `vat_rate` DECIMAL(5,2) DEFAULT 0,
  `withholding_rate` DECIMAL(5,2) DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `recurrence` ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') DEFAULT 'none',
  `next_date` DATE DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_templates_type` (`type`),
  INDEX `idx_templates_active` (`is_active`),
  INDEX `idx_templates_next_date` (`next_date`),
  CONSTRAINT `fk_templates_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_templates_party` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_templates_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kullanıcı Ayarları
CREATE TABLE IF NOT EXISTS `user_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_settings` (`user_id`, `setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Varsayılan admin kullanıcı (şifre: admin123)
INSERT INTO `users` (`name`, `email`, `password`, `role`, `status`) VALUES
('Admin', 'admin@sirket.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;

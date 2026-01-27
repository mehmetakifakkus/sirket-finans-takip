-- Transaction Templates Migration
-- Run this SQL to add the transaction_templates table

CREATE TABLE IF NOT EXISTS transaction_templates (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add description column to transactions table if not exists
-- Note: Run this only if the column doesn't exist
-- ALTER TABLE transactions ADD COLUMN description TEXT DEFAULT NULL;

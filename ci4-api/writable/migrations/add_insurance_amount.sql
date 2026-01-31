-- Migration: Add insurance_amount field to transactions for employee payments
-- Date: 2026-01-31

ALTER TABLE transactions
ADD COLUMN insurance_amount DECIMAL(15,2) DEFAULT NULL AFTER amount;

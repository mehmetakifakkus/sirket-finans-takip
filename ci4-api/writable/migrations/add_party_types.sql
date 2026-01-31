-- Migration: Add new party types (employee, tubitak, kosgeb, individual)
-- Date: 2026-01-31

ALTER TABLE parties
MODIFY COLUMN type ENUM('customer', 'vendor', 'employee', 'tubitak', 'kosgeb', 'individual', 'other')
NOT NULL DEFAULT 'customer';

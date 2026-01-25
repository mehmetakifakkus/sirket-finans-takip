import { db } from './connection.js'

export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...')

  // Create users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
      status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create parties table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS parties (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'vendor', 'other')),
      name VARCHAR(255) NOT NULL,
      tax_no VARCHAR(100),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type)')

  // Create categories table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)')

  // Create projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      contract_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      start_date DATE,
      end_date DATE,
      status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_projects_party ON projects(party_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)')

  // Create project_milestones table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_milestones (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      expected_date DATE,
      expected_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_milestones_status ON project_milestones(status)')

  // Create transactions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
      party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      milestone_id INTEGER REFERENCES project_milestones(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      withholding_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      withholding_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      net_amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      ref_no VARCHAR(100),
      document_path TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id)')

  // Create debts table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY,
      kind VARCHAR(50) NOT NULL CHECK (kind IN ('debt', 'receivable')),
      party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      principal_amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      start_date DATE,
      due_date DATE,
      status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_debts_kind ON debts(kind)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_debts_party ON debts(party_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date)')

  // Create installments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS installments (
      id SERIAL PRIMARY KEY,
      debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
      due_date DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial')),
      paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_installments_debt ON installments(debt_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status)')

  // Create payments table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      related_type VARCHAR(50) NOT NULL CHECK (related_type IN ('installment', 'debt', 'milestone')),
      related_id INTEGER NOT NULL,
      transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      method VARCHAR(50) NOT NULL DEFAULT 'bank' CHECK (method IN ('cash', 'bank', 'card', 'other')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_related ON payments(related_type, related_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id)')

  // Create exchange_rates table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id SERIAL PRIMARY KEY,
      rate_date DATE NOT NULL,
      base_currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
      quote_currency VARCHAR(10) NOT NULL,
      rate DECIMAL(15,6) NOT NULL,
      source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'tcmb', 'kapali-carsi')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(rate_date, quote_currency)
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(rate_date)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(quote_currency)')

  // Create audit_logs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity VARCHAR(100) NOT NULL,
      entity_id INTEGER,
      old_data JSONB,
      new_data JSONB,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)')

  // Create transaction_documents table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transaction_documents (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_transaction_documents_transaction ON transaction_documents(transaction_id)')

  // Create project_grants table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_grants (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      provider_name VARCHAR(255) NOT NULL,
      provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('tubitak', 'kosgeb', 'sponsor', 'other')),
      funding_rate DECIMAL(5,2),
      funding_amount DECIMAL(15,2),
      vat_excluded BOOLEAN DEFAULT true,
      approved_amount DECIMAL(15,2) DEFAULT 0,
      received_amount DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'TRY',
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'partial', 'received', 'rejected')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await db.execute('CREATE INDEX IF NOT EXISTS idx_project_grants_project ON project_grants(project_id)')
  await db.execute('CREATE INDEX IF NOT EXISTS idx_project_grants_status ON project_grants(status)')

  console.log('Database migrations completed successfully')
}

export default runMigrations

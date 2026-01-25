import { DatabaseWrapper } from './connection'

export function runMigrations(db: DatabaseWrapper): void {
  console.log('Running database migrations...')

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TEXT,
      updated_at TEXT
    )
  `)

  // Create parties table
  db.exec(`
    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'vendor', 'other')),
      name TEXT NOT NULL,
      tax_no TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type)')

  // Create categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      parent_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)')

  // Create projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      contract_amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_projects_party ON projects(party_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)')

  // Create project_milestones table
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      expected_date TEXT,
      expected_amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_milestones_status ON project_milestones(status)')

  // Create transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      party_id INTEGER,
      category_id INTEGER,
      project_id INTEGER,
      milestone_id INTEGER,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      vat_rate REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      withholding_rate REAL NOT NULL DEFAULT 0,
      withholding_amount REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL,
      description TEXT,
      ref_no TEXT,
      document_path TEXT,
      created_by INTEGER,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (milestone_id) REFERENCES project_milestones(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_project ON transactions(project_id)')

  // Create debts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('debt', 'receivable')),
      party_id INTEGER NOT NULL,
      principal_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      vat_rate REAL NOT NULL DEFAULT 0,
      start_date TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_debts_kind ON debts(kind)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_debts_party ON debts(party_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date)')

  // Create installments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial')),
      paid_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_installments_debt ON installments(debt_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status)')

  // Create payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      related_type TEXT NOT NULL CHECK (related_type IN ('installment', 'debt', 'milestone')),
      related_id INTEGER NOT NULL,
      transaction_id INTEGER,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      method TEXT NOT NULL DEFAULT 'bank' CHECK (method IN ('cash', 'bank', 'card', 'other')),
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_related ON payments(related_type, related_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id)')

  // Create exchange_rates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rate_date TEXT NOT NULL,
      base_currency TEXT NOT NULL DEFAULT 'TRY',
      quote_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'tcmb', 'kapali-carsi')),
      created_at TEXT,
      UNIQUE(rate_date, quote_currency)
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(rate_date)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(quote_currency)')

  // Migration: Update exchange_rates table to allow 'kapali-carsi' source
  // SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we recreate the table
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='exchange_rates'").get() as { sql: string } | undefined
  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('kapali-carsi')) {
    console.log('Migrating exchange_rates table to support kapali-carsi source...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS exchange_rates_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rate_date TEXT NOT NULL,
        base_currency TEXT NOT NULL DEFAULT 'TRY',
        quote_currency TEXT NOT NULL,
        rate REAL NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'tcmb', 'kapali-carsi')),
        created_at TEXT,
        UNIQUE(rate_date, quote_currency)
      )
    `)
    db.exec(`INSERT INTO exchange_rates_new SELECT * FROM exchange_rates`)
    db.exec(`DROP TABLE exchange_rates`)
    db.exec(`ALTER TABLE exchange_rates_new RENAME TO exchange_rates`)
    db.exec('CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(rate_date)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(quote_currency)')
    console.log('Migration completed: exchange_rates table now supports kapali-carsi source')
  }

  // Create audit_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      old_data TEXT,
      new_data TEXT,
      ip_address TEXT,
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)')

  // Create transaction_documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_transaction_documents_transaction ON transaction_documents(transaction_id)')

  console.log('Database migrations completed successfully')
}

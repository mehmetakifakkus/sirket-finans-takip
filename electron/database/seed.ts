import bcrypt from 'bcryptjs'
import { DatabaseWrapper, getCurrentTimestamp, formatDate, saveDatabase } from './connection'

// Seed essential categories (income/expense)
export function seedEssentialCategories(db: DatabaseWrapper): void {
  const now = getCurrentTimestamp()

  // Check if categories already exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (categoryCount.count > 0) {
    console.log('Categories already exist, skipping...')
    return
  }

  const insertCategory = db.prepare(`
    INSERT INTO categories (name, type, parent_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  // Income categories
  insertCategory.run('Satis Geliri', 'income', null, 1, now, now)
  insertCategory.run('Hizmet Geliri', 'income', null, 1, now, now)
  insertCategory.run('Faiz Geliri', 'income', null, 1, now, now)
  insertCategory.run('Diger Gelirler', 'income', null, 1, now, now)

  // Expense categories
  insertCategory.run('Personel Gideri', 'expense', null, 1, now, now)
  insertCategory.run('Kira Gideri', 'expense', null, 1, now, now)
  insertCategory.run('Elektrik/Su/Dogalgaz', 'expense', null, 1, now, now)
  insertCategory.run('Iletisim Gideri', 'expense', null, 1, now, now)
  insertCategory.run('Ofis Malzemeleri', 'expense', null, 1, now, now)
  insertCategory.run('Ulasim Gideri', 'expense', null, 1, now, now)
  insertCategory.run('Pazarlama Gideri', 'expense', null, 1, now, now)
  insertCategory.run('Yazilim/Lisans', 'expense', null, 1, now, now)
  insertCategory.run('Diger Giderler', 'expense', null, 1, now, now)

  saveDatabase()
  console.log('Essential categories seeded')
}

// Seed exchange rates (last 7 days)
export function seedExchangeRates(db: DatabaseWrapper): void {
  const now = getCurrentTimestamp()

  // Check if exchange rates already exist
  const rateCount = db.prepare('SELECT COUNT(*) as count FROM exchange_rates').get() as { count: number }
  if (rateCount.count > 0) {
    console.log('Exchange rates already exist, skipping...')
    return
  }

  const insertRate = db.prepare(`
    INSERT OR REPLACE INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = formatDate(date)

    // USD rates (approximately - Jan 2026 values)
    insertRate.run(dateStr, 'TRY', 'USD', 35.50 + Math.random() * 0.5, 'tcmb', now)
    // EUR rates (approximately - Jan 2026 values)
    insertRate.run(dateStr, 'TRY', 'EUR', 38.50 + Math.random() * 0.5, 'tcmb', now)
  }

  saveDatabase()
  console.log('Exchange rates seeded')
}

// Seed demo data (parties, projects, transactions, debts)
export function seedDemoData(db: DatabaseWrapper): void {
  const now = getCurrentTimestamp()
  const today = new Date()

  // Check if demo data already exists
  const partyCount = db.prepare('SELECT COUNT(*) as count FROM parties').get() as { count: number }
  if (partyCount.count > 0) {
    console.log('Demo data already exists, skipping...')
    return
  }

  // Seed parties
  const insertParty = db.prepare(`
    INSERT INTO parties (type, name, tax_no, phone, email, address, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertParty.run('customer', 'ABC Teknoloji A.S.', '1234567890', '0212 123 45 67', 'info@abcteknoloji.com', 'Istanbul, Turkiye', 'Yazilim gelistirme musterisi', now, now)
  insertParty.run('customer', 'XYZ Danismanlik Ltd.', '9876543210', '0216 987 65 43', 'iletisim@xyzdanismanlik.com', 'Ankara, Turkiye', 'Danismanlik hizmetleri', now, now)
  insertParty.run('vendor', 'Tech Solutions Inc.', '5555555555', '0312 555 55 55', 'contact@techsolutions.com', 'Izmir, Turkiye', 'Yazilim lisans tedarikçisi', now, now)
  insertParty.run('vendor', 'Ofis Malzemeleri A.S.', '6666666666', '0232 666 66 66', 'satis@ofismalz.com', 'Bursa, Turkiye', 'Ofis malzemeleri tedarikçisi', now, now)
  insertParty.run('other', 'Freelance Gelistirici', null, '0533 111 22 33', 'developer@email.com', null, 'Dis kaynak gelistirici', now, now)

  // Seed projects
  const insertProject = db.prepare(`
    INSERT INTO projects (party_id, title, contract_amount, currency, start_date, end_date, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const project1Id = insertProject.run(
    1, 'Web Uygulamasi Gelistirme', 150000, 'TRY',
    formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)),
    'active', 'E-ticaret web uygulamasi', now, now
  ).lastInsertRowid

  const project2Id = insertProject.run(
    2, 'Danismanlik Projesi', 25000, 'USD',
    formatDate(new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)),
    'active', 'IT altyapi danismanligi', now, now
  ).lastInsertRowid

  // Seed milestones
  const insertMilestone = db.prepare(`
    INSERT INTO project_milestones (project_id, title, expected_date, expected_amount, currency, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertMilestone.run(project1Id, 'Analiz ve Tasarim', formatDate(new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000)), 30000, 'TRY', 'completed', 'Tamamlandi', now, now)
  insertMilestone.run(project1Id, 'Backend Gelistirme', formatDate(new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)), 50000, 'TRY', 'pending', 'Devam ediyor', now, now)
  insertMilestone.run(project1Id, 'Frontend Gelistirme', formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)), 50000, 'TRY', 'pending', null, now, now)
  insertMilestone.run(project1Id, 'Test ve Devreye Alma', formatDate(new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)), 20000, 'TRY', 'pending', null, now, now)

  insertMilestone.run(project2Id, 'Ihtiyac Analizi', formatDate(new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000)), 10000, 'USD', 'completed', null, now, now)
  insertMilestone.run(project2Id, 'Uygulama', formatDate(new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)), 15000, 'USD', 'pending', null, now, now)

  // Seed transactions
  const insertTransaction = db.prepare(`
    INSERT INTO transactions (type, party_id, category_id, project_id, milestone_id, date, amount, currency, vat_rate, vat_amount, withholding_rate, withholding_amount, net_amount, description, ref_no, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Income transactions
  insertTransaction.run('income', 1, 2, Number(project1Id), null, formatDate(new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000)), 30000, 'TRY', 20, 6000, 0, 0, 36000, 'Analiz teslimi icin odeme', 'INV-001', 1, now, now)
  insertTransaction.run('income', 2, 2, Number(project2Id), null, formatDate(new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000)), 10000, 'USD', 0, 0, 0, 0, 10000, 'Ihtiyac analizi odemesi', 'INV-002', 1, now, now)
  insertTransaction.run('income', 1, 1, null, null, formatDate(new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000)), 15000, 'TRY', 20, 3000, 0, 0, 18000, 'Ek modul satisi', 'INV-003', 1, now, now)
  insertTransaction.run('income', null, 3, null, null, formatDate(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)), 500, 'TRY', 0, 0, 0, 0, 500, 'Banka faiz geliri', null, 1, now, now)

  // Expense transactions
  insertTransaction.run('expense', null, 5, null, null, formatDate(new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000)), 25000, 'TRY', 0, 0, 0, 0, 25000, 'Ocak ayi maaslari', 'PAY-001', 1, now, now)
  insertTransaction.run('expense', null, 6, null, null, formatDate(new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000)), 8000, 'TRY', 20, 1600, 0, 0, 9600, 'Ofis kirasi', 'RENT-001', 1, now, now)
  insertTransaction.run('expense', 3, 12, null, null, formatDate(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)), 500, 'USD', 0, 0, 0, 0, 500, 'Yazilim lisansi', 'LIC-001', 1, now, now)
  insertTransaction.run('expense', null, 7, null, null, formatDate(new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000)), 1200, 'TRY', 20, 240, 0, 0, 1440, 'Elektrik faturasi', 'UTIL-001', 1, now, now)
  insertTransaction.run('expense', 4, 9, null, null, formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)), 800, 'TRY', 20, 160, 0, 0, 960, 'Ofis malzemeleri', 'OFF-001', 1, now, now)
  insertTransaction.run('expense', null, 8, null, null, formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), 350, 'TRY', 20, 70, 0, 0, 420, 'Internet faturasi', 'NET-001', 1, now, now)

  // Seed debts
  const insertDebt = db.prepare(`
    INSERT INTO debts (kind, party_id, principal_amount, currency, vat_rate, start_date, due_date, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const debt1Id = insertDebt.run(
    'debt', 3, 12000, 'TRY', 0,
    formatDate(new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000)),
    'open', 'Yazilim tedarikçisi borcu', now, now
  ).lastInsertRowid

  const debt2Id = insertDebt.run(
    'receivable', 1, 50000, 'TRY', 20,
    formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)),
    'open', 'Proje taksitli odeme', now, now
  ).lastInsertRowid

  const debt3Id = insertDebt.run(
    'receivable', 2, 5000, 'USD', 0,
    formatDate(new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000)),
    'open', 'Danismanlik alacagi', now, now
  ).lastInsertRowid

  // Seed installments
  const insertInstallment = db.prepare(`
    INSERT INTO installments (debt_id, due_date, amount, currency, status, paid_amount, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Debt 1 installments (4 months)
  insertInstallment.run(debt1Id, formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)), 3000, 'TRY', 'paid', 3000, 'Odendi', now, now)
  insertInstallment.run(debt1Id, formatDate(new Date(today.getTime())), 3000, 'TRY', 'pending', 0, null, now, now)
  insertInstallment.run(debt1Id, formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)), 3000, 'TRY', 'pending', 0, null, now, now)
  insertInstallment.run(debt1Id, formatDate(new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)), 3000, 'TRY', 'pending', 0, null, now, now)

  // Debt 2 installments (receivable - 5 months)
  insertInstallment.run(debt2Id, formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)), 10000, 'TRY', 'paid', 10000, 'Tahsil edildi', now, now)
  insertInstallment.run(debt2Id, formatDate(new Date(today.getTime())), 10000, 'TRY', 'partial', 5000, 'Kismi odeme', now, now)
  insertInstallment.run(debt2Id, formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)), 10000, 'TRY', 'pending', 0, null, now, now)
  insertInstallment.run(debt2Id, formatDate(new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)), 10000, 'TRY', 'pending', 0, null, now, now)
  insertInstallment.run(debt2Id, formatDate(new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)), 10000, 'TRY', 'pending', 0, null, now, now)

  // Debt 3 installments (receivable USD - 2 months)
  insertInstallment.run(debt3Id, formatDate(new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)), 2500, 'USD', 'pending', 0, null, now, now)
  insertInstallment.run(debt3Id, formatDate(new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000)), 2500, 'USD', 'pending', 0, null, now, now)

  saveDatabase()
  console.log('Demo data seeded successfully')
}

// Legacy function for backwards compatibility - runs all seeding
export function seedDatabase(db: DatabaseWrapper): void {
  // Check if database is already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) {
    console.log('Database already seeded, skipping...')
    return
  }

  console.log('Seeding database...')
  const now = getCurrentTimestamp()

  // Seed users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  insertUser.run('Admin User', 'admin@sirket.com', bcrypt.hashSync('admin123', 10), 'admin', 'active', now, now)
  insertUser.run('Staff User', 'staff@sirket.com', bcrypt.hashSync('staff123', 10), 'staff', 'active', now, now)

  // Seed categories
  seedEssentialCategories(db)

  // Seed exchange rates
  seedExchangeRates(db)

  // Seed demo data
  seedDemoData(db)

  console.log('Database seeded successfully')
}

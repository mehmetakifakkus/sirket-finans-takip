import { Router, Response, Request } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../database/connection.js'
import { runMigrations } from '../database/migrations.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

// GET /api/setup/status
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Check if tables exist
    const tablesResult = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)
    const hasTables = tablesResult.length > 0

    // Check if users exist
    let hasUsers = false
    if (hasTables) {
      const usersResult = await db.queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users')
      hasUsers = parseInt(usersResult?.count || '0') > 0
    }

    res.json({
      needsSetup: !hasTables || !hasUsers,
      hasDatabase: true,
      hasUsers,
      hasTables
    })
  } catch (error) {
    res.json({
      needsSetup: true,
      hasDatabase: false,
      hasUsers: false,
      hasTables: false
    })
  }
}))

// POST /api/setup/init
router.post('/init', asyncHandler(async (_req: Request, res: Response) => {
  try {
    await runMigrations()
    res.json({ success: true, message: 'Veritabanı oluşturuldu' })
  } catch (error: any) {
    res.json({ success: false, message: error.message || 'Veritabanı oluşturulamadı' })
  }
}))

// POST /api/setup/create-admin
router.post('/create-admin', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.json({ success: false, message: 'Tüm alanlar gerekli' })
    return
  }

  // Check if admin already exists
  const existing = await db.queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) {
    res.json({ success: false, message: 'Bu e-posta adresi zaten kullanımda' })
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await db.execute(`
    INSERT INTO users (name, email, password, role, status, created_at, updated_at)
    VALUES ($1, $2, $3, 'admin', 'active', NOW(), NOW())
  `, [name, email, hashedPassword])

  res.json({ success: true, message: 'Yönetici hesabı oluşturuldu' })
}))

// POST /api/setup/seed
router.post('/seed', asyncHandler(async (req: Request, res: Response) => {
  const { categories, exchangeRates, demoData } = req.body
  const details: string[] = []

  if (categories) {
    // Seed default categories
    const incomeCategories = ['Satış', 'Hizmet Geliri', 'Faiz Geliri', 'Kira Geliri', 'Diğer Gelir']
    const expenseCategories = ['Maaş', 'Kira', 'Fatura', 'Malzeme', 'Ulaşım', 'Yemek', 'Ofis Giderleri', 'Diğer Gider']

    for (const name of incomeCategories) {
      await db.execute(`
        INSERT INTO categories (name, type, is_active, created_at, updated_at)
        VALUES ($1, 'income', true, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [name])
    }

    for (const name of expenseCategories) {
      await db.execute(`
        INSERT INTO categories (name, type, is_active, created_at, updated_at)
        VALUES ($1, 'expense', true, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [name])
    }

    details.push(`${incomeCategories.length + expenseCategories.length} kategori eklendi`)
  }

  if (exchangeRates) {
    // Seed default exchange rates
    const today = new Date().toISOString().split('T')[0]
    await db.execute(`
      INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
      VALUES ($1, 'TRY', 'USD', 32.50, 'manual', NOW())
      ON CONFLICT (rate_date, quote_currency) DO NOTHING
    `, [today])
    await db.execute(`
      INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
      VALUES ($1, 'TRY', 'EUR', 35.20, 'manual', NOW())
      ON CONFLICT (rate_date, quote_currency) DO NOTHING
    `, [today])

    details.push('Varsayılan döviz kurları eklendi')
  }

  if (demoData) {
    // Add demo parties
    await db.execute(`
      INSERT INTO parties (type, name, tax_no, phone, email, created_at, updated_at)
      VALUES ('customer', 'Demo Müşteri A.Ş.', '1234567890', '0212 555 1234', 'demo@musteri.com', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `)
    await db.execute(`
      INSERT INTO parties (type, name, tax_no, phone, email, created_at, updated_at)
      VALUES ('vendor', 'Demo Tedarikçi Ltd.', '0987654321', '0216 555 4321', 'demo@tedarikci.com', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `)

    details.push('Demo veriler eklendi')
  }

  res.json({ success: true, message: 'Veriler eklendi', details })
}))

// POST /api/setup/clear
router.post('/clear', asyncHandler(async (_req: Request, res: Response) => {
  const details: string[] = []

  // Delete in order to respect foreign keys
  await db.execute('DELETE FROM payments')
  details.push('Ödemeler silindi')

  await db.execute('DELETE FROM installments')
  details.push('Taksitler silindi')

  await db.execute('DELETE FROM transaction_documents')
  details.push('Belgeler silindi')

  await db.execute('DELETE FROM transactions')
  details.push('İşlemler silindi')

  await db.execute('DELETE FROM project_grants')
  details.push('Hibeler silindi')

  await db.execute('DELETE FROM project_milestones')
  details.push('Kilometre taşları silindi')

  await db.execute('DELETE FROM projects')
  details.push('Projeler silindi')

  await db.execute('DELETE FROM debts')
  details.push('Borç/alacaklar silindi')

  await db.execute('DELETE FROM parties')
  details.push('Cariler silindi')

  await db.execute('DELETE FROM categories')
  details.push('Kategoriler silindi')

  await db.execute('DELETE FROM exchange_rates')
  details.push('Döviz kurları silindi')

  await db.execute('DELETE FROM audit_logs')
  details.push('Denetim kayıtları silindi')

  res.json({ success: true, message: 'Tüm veriler silindi', details })
}))

export default router

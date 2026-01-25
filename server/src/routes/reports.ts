import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

const router = Router()

// GET /api/reports/dashboard
router.get('/dashboard', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
  const lastMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')

  // Current month totals
  const currentMonth = await db.queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE date >= $1 AND date <= $2
  `, [monthStart, monthEnd])

  // Last month totals
  const lastMonth = await db.queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE date >= $1 AND date <= $2
  `, [lastMonthStart, lastMonthEnd])

  // Open debts/receivables
  const debts = await db.queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN kind = 'debt' THEN principal_amount ELSE 0 END), 0) as total_debt,
      COALESCE(SUM(CASE WHEN kind = 'receivable' THEN principal_amount ELSE 0 END), 0) as total_receivable
    FROM debts
    WHERE status = 'open'
  `)

  // Upcoming installments (next 30 days)
  const upcomingInstallments = await db.query(`
    SELECT i.*, d.kind, p.name as party_name
    FROM installments i
    JOIN debts d ON i.debt_id = d.id
    JOIN parties p ON d.party_id = p.id
    WHERE i.status != 'paid' AND i.due_date >= $1 AND i.due_date <= $1::date + interval '30 days'
    ORDER BY i.due_date ASC
    LIMIT 10
  `, [today])

  // Recent transactions
  const recentTransactions = await db.query(`
    SELECT t.*, p.name as party_name, c.name as category_name
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC, t.id DESC
    LIMIT 10
  `)

  // Active projects count
  const activeProjects = await db.queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM projects WHERE status = 'active'"
  )

  res.json({
    currentMonth: {
      income: parseFloat(currentMonth?.income || '0'),
      expense: parseFloat(currentMonth?.expense || '0'),
      balance: parseFloat(currentMonth?.income || '0') - parseFloat(currentMonth?.expense || '0'),
    },
    lastMonth: {
      income: parseFloat(lastMonth?.income || '0'),
      expense: parseFloat(lastMonth?.expense || '0'),
    },
    debts: {
      totalDebt: parseFloat(debts?.total_debt || '0'),
      totalReceivable: parseFloat(debts?.total_receivable || '0'),
    },
    upcomingInstallments,
    recentTransactions,
    activeProjectsCount: parseInt(activeProjects?.count || '0'),
  })
}))

// GET /api/reports/summary
router.get('/summary', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query

  let query = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as total_expense,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (startDate) {
    query += ` AND date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    query += ` AND date <= $${paramIndex++}`
    params.push(endDate)
  }

  const summary = await db.queryOne(query, params)

  res.json({
    totalIncome: parseFloat(summary?.total_income || '0'),
    totalExpense: parseFloat(summary?.total_expense || '0'),
    balance: parseFloat(summary?.total_income || '0') - parseFloat(summary?.total_expense || '0'),
    transactionCount: parseInt(summary?.transaction_count || '0'),
  })
}))

// GET /api/reports/transactions
router.get('/transactions', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, groupBy } = req.query

  let query: string
  const params: any[] = []
  let paramIndex = 1

  if (groupBy === 'category') {
    query = `
      SELECT c.name as category_name, c.type,
             COALESCE(SUM(t.net_amount), 0) as total,
             COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `
  } else if (groupBy === 'party') {
    query = `
      SELECT p.name as party_name,
             COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.net_amount ELSE 0 END), 0) as income,
             COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.net_amount ELSE 0 END), 0) as expense,
             COUNT(*) as count
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE 1=1
    `
  } else {
    query = `
      SELECT DATE_TRUNC('month', date)::date as month,
             COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as income,
             COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE 1=1
    `
  }

  if (startDate) {
    query += ` AND ${groupBy === 'month' ? '' : 't.'}date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    query += ` AND ${groupBy === 'month' ? '' : 't.'}date <= $${paramIndex++}`
    params.push(endDate)
  }

  if (groupBy === 'category') {
    query += ' GROUP BY c.name, c.type ORDER BY total DESC'
  } else if (groupBy === 'party') {
    query += ' GROUP BY p.name ORDER BY income DESC'
  } else {
    query += ' GROUP BY month ORDER BY month DESC'
  }

  const report = await db.query(query, params)
  res.json(report)
}))

// GET /api/reports/debts
router.get('/debts', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { kind, status } = req.query

  let query = `
    SELECT d.*,
           p.name as party_name,
           (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as paid_amount
    FROM debts d
    LEFT JOIN parties p ON d.party_id = p.id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (kind) {
    query += ` AND d.kind = $${paramIndex++}`
    params.push(kind)
  }
  if (status) {
    query += ` AND d.status = $${paramIndex++}`
    params.push(status)
  }

  query += ' ORDER BY d.due_date ASC'

  const report = await db.query(query, params)
  res.json(report)
}))

// GET /api/reports/projects
router.get('/projects', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query

  let query = `
    SELECT p.*,
           pa.name as party_name,
           COALESCE((SELECT SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END) FROM transactions WHERE project_id = p.id), 0) as total_income,
           COALESCE((SELECT SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END) FROM transactions WHERE project_id = p.id), 0) as total_expense
    FROM projects p
    LEFT JOIN parties pa ON p.party_id = pa.id
    WHERE 1=1
  `
  const params: any[] = []

  if (status) {
    query += ' AND p.status = $1'
    params.push(status)
  }

  query += ' ORDER BY p.created_at DESC'

  const report = await db.query(query, params)
  res.json(report)
}))

// GET /api/reports/export/:type
router.get('/export/:type', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params
  const { startDate, endDate } = req.query

  let data: any[]
  let headers: string[]
  let filename: string

  const params: any[] = []
  let paramIndex = 1
  let dateFilter = ''

  if (startDate) {
    dateFilter += ` AND date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    dateFilter += ` AND date <= $${paramIndex++}`
    params.push(endDate)
  }

  if (type === 'transactions') {
    data = await db.query(`
      SELECT t.date, t.type, t.amount, t.currency, t.net_amount, t.description,
             p.name as party_name, c.name as category_name
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1 ${dateFilter}
      ORDER BY t.date DESC
    `, params)
    headers = ['Tarih', 'Tür', 'Tutar', 'Para Birimi', 'Net Tutar', 'Açıklama', 'Cari', 'Kategori']
    filename = 'islemler'
  } else if (type === 'debts') {
    data = await db.query(`
      SELECT d.kind, d.principal_amount, d.currency, d.due_date, d.status, p.name as party_name
      FROM debts d
      LEFT JOIN parties p ON d.party_id = p.id
      ORDER BY d.due_date ASC
    `)
    headers = ['Tür', 'Ana Para', 'Para Birimi', 'Vade', 'Durum', 'Cari']
    filename = 'borc_alacak'
  } else {
    data = await db.query(`
      SELECT p.title, p.contract_amount, p.currency, p.status, pa.name as party_name
      FROM projects p
      LEFT JOIN parties pa ON p.party_id = pa.id
      ORDER BY p.created_at DESC
    `)
    headers = ['Başlık', 'Sözleşme Tutarı', 'Para Birimi', 'Durum', 'Cari']
    filename = 'projeler'
  }

  const rows = data.map((row: any) => Object.values(row).map(v => `"${v || ''}"`).join(','))
  const csv = [headers.join(','), ...rows].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
  res.send('\ufeff' + csv)
}))

export default router

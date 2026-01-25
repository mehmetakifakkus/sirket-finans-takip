import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/transactions
router.get('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, startDate, endDate, partyId, categoryId, projectId, search } = req.query

  let query = `
    SELECT t.*,
           p.name as party_name,
           c.name as category_name,
           pr.title as project_title
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN projects pr ON t.project_id = pr.id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (type) {
    query += ` AND t.type = $${paramIndex++}`
    params.push(type)
  }
  if (startDate) {
    query += ` AND t.date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    query += ` AND t.date <= $${paramIndex++}`
    params.push(endDate)
  }
  if (partyId) {
    query += ` AND t.party_id = $${paramIndex++}`
    params.push(partyId)
  }
  if (categoryId) {
    query += ` AND t.category_id = $${paramIndex++}`
    params.push(categoryId)
  }
  if (projectId) {
    query += ` AND t.project_id = $${paramIndex++}`
    params.push(projectId)
  }
  if (search) {
    query += ` AND (t.description ILIKE $${paramIndex} OR t.ref_no ILIKE $${paramIndex})`
    params.push(`%${search}%`)
    paramIndex++
  }

  query += ' ORDER BY t.date DESC, t.id DESC'

  const transactions = await db.query(query, params)
  res.json(transactions)
}))

// GET /api/transactions/unassigned
router.get('/unassigned', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, startDate, endDate } = req.query

  let query = `
    SELECT t.*,
           p.name as party_name,
           c.name as category_name
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.project_id IS NULL
  `
  const params: any[] = []
  let paramIndex = 1

  if (type) {
    query += ` AND t.type = $${paramIndex++}`
    params.push(type)
  }
  if (startDate) {
    query += ` AND t.date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    query += ` AND t.date <= $${paramIndex++}`
    params.push(endDate)
  }

  query += ' ORDER BY t.date DESC, t.id DESC'

  const transactions = await db.query(query, params)
  res.json(transactions)
}))

// GET /api/transactions/project/:projectId
router.get('/project/:projectId', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params

  const transactions = await db.query(`
    SELECT t.*,
           p.name as party_name,
           c.name as category_name,
           m.title as milestone_title
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN project_milestones m ON t.milestone_id = m.id
    WHERE t.project_id = $1
    ORDER BY t.date DESC, t.id DESC
  `, [projectId])

  res.json(transactions)
}))

// GET /api/transactions/export
router.get('/export', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, startDate, endDate, partyId, categoryId, projectId } = req.query

  let query = `
    SELECT t.date, t.type, t.amount, t.currency, t.vat_rate, t.vat_amount,
           t.withholding_rate, t.withholding_amount, t.net_amount,
           t.description, t.ref_no,
           p.name as party_name,
           c.name as category_name,
           pr.title as project_title
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN projects pr ON t.project_id = pr.id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (type) {
    query += ` AND t.type = $${paramIndex++}`
    params.push(type)
  }
  if (startDate) {
    query += ` AND t.date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    query += ` AND t.date <= $${paramIndex++}`
    params.push(endDate)
  }
  if (partyId) {
    query += ` AND t.party_id = $${paramIndex++}`
    params.push(partyId)
  }
  if (categoryId) {
    query += ` AND t.category_id = $${paramIndex++}`
    params.push(categoryId)
  }
  if (projectId) {
    query += ` AND t.project_id = $${paramIndex++}`
    params.push(projectId)
  }

  query += ' ORDER BY t.date DESC'

  const transactions = await db.query(query, params)

  // Generate CSV
  const headers = ['Tarih', 'Tür', 'Tutar', 'Para Birimi', 'KDV Oranı', 'KDV Tutarı',
    'Stopaj Oranı', 'Stopaj Tutarı', 'Net Tutar', 'Açıklama', 'Referans No',
    'Cari', 'Kategori', 'Proje']

  const rows = transactions.map((t: any) => [
    t.date, t.type === 'income' ? 'Gelir' : 'Gider', t.amount, t.currency,
    t.vat_rate, t.vat_amount, t.withholding_rate, t.withholding_amount,
    t.net_amount, t.description || '', t.ref_no || '',
    t.party_name || '', t.category_name || '', t.project_title || ''
  ])

  const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(v => `"${v}"`).join(','))].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=islemler_${new Date().toISOString().split('T')[0]}.csv`)
  res.send('\ufeff' + csv) // BOM for Excel
}))

// GET /api/transactions/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const transaction = await db.queryOne(`
    SELECT t.*,
           p.name as party_name,
           c.name as category_name,
           pr.title as project_title,
           m.title as milestone_title
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN project_milestones m ON t.milestone_id = m.id
    WHERE t.id = $1
  `, [id])

  if (!transaction) {
    throw new NotFoundError('İşlem bulunamadı')
  }

  res.json(transaction)
}))

// POST /api/transactions
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    type, party_id, category_id, project_id, milestone_id, date,
    amount, currency, vat_rate, vat_amount, withholding_rate,
    withholding_amount, net_amount, description, ref_no, document_path
  } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO transactions (
      type, party_id, category_id, project_id, milestone_id, date,
      amount, currency, vat_rate, vat_amount, withholding_rate,
      withholding_amount, net_amount, description, ref_no, document_path,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
    RETURNING id
  `, [
    type, party_id || null, category_id || null, project_id || null,
    milestone_id || null, date, amount, currency || 'TRY',
    vat_rate || 0, vat_amount || 0, withholding_rate || 0,
    withholding_amount || 0, net_amount, description || null,
    ref_no || null, document_path || null, req.user?.id
  ])

  res.json({ success: true, message: 'İşlem oluşturuldu', id: result?.id })
}))

// PUT /api/transactions/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const {
    type, party_id, category_id, project_id, milestone_id, date,
    amount, currency, vat_rate, vat_amount, withholding_rate,
    withholding_amount, net_amount, description, ref_no, document_path
  } = req.body

  await db.execute(`
    UPDATE transactions SET
      type = $1, party_id = $2, category_id = $3, project_id = $4,
      milestone_id = $5, date = $6, amount = $7, currency = $8,
      vat_rate = $9, vat_amount = $10, withholding_rate = $11,
      withholding_amount = $12, net_amount = $13, description = $14,
      ref_no = $15, document_path = $16, updated_at = NOW()
    WHERE id = $17
  `, [
    type, party_id || null, category_id || null, project_id || null,
    milestone_id || null, date, amount, currency || 'TRY',
    vat_rate || 0, vat_amount || 0, withholding_rate || 0,
    withholding_amount || 0, net_amount, description || null,
    ref_no || null, document_path || null, id
  ])

  res.json({ success: true, message: 'İşlem güncellendi' })
}))

// DELETE /api/transactions/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM transactions WHERE id = $1', [id])

  res.json({ success: true, message: 'İşlem silindi' })
}))

// POST /api/transactions/assign-to-project
router.post('/assign-to-project', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { transactionIds, projectId } = req.body

  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    res.json({ success: false, message: 'İşlem seçilmedi', count: 0 })
    return
  }

  const placeholders = transactionIds.map((_, i) => `$${i + 2}`).join(', ')
  await db.execute(
    `UPDATE transactions SET project_id = $1, updated_at = NOW() WHERE id IN (${placeholders})`,
    [projectId, ...transactionIds]
  )

  res.json({ success: true, message: 'İşlemler projeye atandı', count: transactionIds.length })
}))

export default router

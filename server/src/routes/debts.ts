import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'
import { addMonths, format } from 'date-fns'

const router = Router()

// GET /api/debts
router.get('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { kind, status, partyId, startDate, endDate } = req.query

  let query = `
    SELECT d.*,
           p.name as party_name,
           (SELECT COALESCE(SUM(paid_amount), 0) FROM installments WHERE debt_id = d.id) as paid_amount,
           (SELECT COUNT(*) FROM installments WHERE debt_id = d.id) as installment_count
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
  if (partyId) {
    query += ` AND d.party_id = $${paramIndex++}`
    params.push(partyId)
  }
  if (startDate) {
    query += ` AND d.due_date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    query += ` AND d.due_date <= $${paramIndex++}`
    params.push(endDate)
  }

  query += ' ORDER BY d.due_date ASC, d.id DESC'

  const debts = await db.query(query, params)
  res.json(debts)
}))

// GET /api/debts/export
router.get('/export', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { kind, status } = req.query

  let query = `
    SELECT d.*, p.name as party_name,
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

  const debts = await db.query(query, params)

  const headers = ['Tür', 'Cari', 'Ana Para', 'Para Birimi', 'KDV Oranı', 'Başlangıç', 'Vade', 'Durum', 'Ödenen', 'Notlar']
  const rows = debts.map((d: any) => [
    d.kind === 'debt' ? 'Borç' : 'Alacak',
    d.party_name || '', d.principal_amount, d.currency,
    d.vat_rate, d.start_date || '', d.due_date || '',
    d.status === 'open' ? 'Açık' : 'Kapalı',
    d.paid_amount, d.notes || ''
  ])

  const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(v => `"${v}"`).join(','))].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=borc_alacak_${new Date().toISOString().split('T')[0]}.csv`)
  res.send('\ufeff' + csv)
}))

// GET /api/debts/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const debt = await db.queryOne(`
    SELECT d.*,
           p.name as party_name
    FROM debts d
    LEFT JOIN parties p ON d.party_id = p.id
    WHERE d.id = $1
  `, [id])

  if (!debt) {
    throw new NotFoundError('Borç/alacak bulunamadı')
  }

  // Get installments
  const installments = await db.query(`
    SELECT * FROM installments WHERE debt_id = $1 ORDER BY due_date ASC
  `, [id])

  res.json({ ...debt, installments })
}))

// POST /api/debts
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { kind, party_id, principal_amount, currency, vat_rate, start_date, due_date, status, notes } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO debts (kind, party_id, principal_amount, currency, vat_rate, start_date, due_date, status, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    RETURNING id
  `, [kind, party_id, principal_amount, currency || 'TRY', vat_rate || 0, start_date || null, due_date || null, status || 'open', notes || null])

  res.json({ success: true, message: 'Borç/alacak oluşturuldu', id: result?.id })
}))

// PUT /api/debts/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { kind, party_id, principal_amount, currency, vat_rate, start_date, due_date, status, notes } = req.body

  await db.execute(`
    UPDATE debts SET
      kind = $1, party_id = $2, principal_amount = $3, currency = $4,
      vat_rate = $5, start_date = $6, due_date = $7, status = $8, notes = $9, updated_at = NOW()
    WHERE id = $10
  `, [kind, party_id, principal_amount, currency || 'TRY', vat_rate || 0, start_date || null, due_date || null, status || 'open', notes || null, id])

  res.json({ success: true, message: 'Borç/alacak güncellendi' })
}))

// DELETE /api/debts/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM debts WHERE id = $1', [id])

  res.json({ success: true, message: 'Borç/alacak silindi' })
}))

// POST /api/debts/:id/installments
router.post('/:id/installments', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { count, startDate } = req.body

  const debt = await db.queryOne<{ principal_amount: number; vat_rate: number; currency: string }>(
    'SELECT principal_amount, vat_rate, currency FROM debts WHERE id = $1',
    [id]
  )

  if (!debt) {
    throw new NotFoundError('Borç/alacak bulunamadı')
  }

  // Calculate total amount with VAT
  const totalAmount = debt.principal_amount * (1 + debt.vat_rate / 100)
  const installmentAmount = totalAmount / count
  const start = startDate ? new Date(startDate) : new Date()

  // Delete existing installments
  await db.execute('DELETE FROM installments WHERE debt_id = $1', [id])

  // Create new installments
  for (let i = 0; i < count; i++) {
    const dueDate = format(addMonths(start, i), 'yyyy-MM-dd')
    await db.execute(`
      INSERT INTO installments (debt_id, due_date, amount, currency, status, paid_amount, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'pending', 0, NOW(), NOW())
    `, [id, dueDate, installmentAmount, debt.currency])
  }

  res.json({ success: true, message: `${count} taksit oluşturuldu` })
}))

export default router

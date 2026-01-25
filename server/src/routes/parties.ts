import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/parties
router.get('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, search } = req.query

  let query = 'SELECT * FROM parties WHERE 1=1'
  const params: any[] = []
  let paramIndex = 1

  if (type) {
    query += ` AND type = $${paramIndex++}`
    params.push(type)
  }
  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR tax_no ILIKE $${paramIndex})`
    params.push(`%${search}%`)
    paramIndex++
  }

  query += ' ORDER BY name ASC'

  const parties = await db.query(query, params)
  res.json(parties)
}))

// GET /api/parties/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const party = await db.queryOne('SELECT * FROM parties WHERE id = $1', [id])

  if (!party) {
    throw new NotFoundError('Cari bulunamadı')
  }

  res.json(party)
}))

// POST /api/parties
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, name, tax_no, phone, email, address, notes } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO parties (type, name, tax_no, phone, email, address, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING id
  `, [type || 'customer', name, tax_no || null, phone || null, email || null, address || null, notes || null])

  res.json({ success: true, message: 'Cari oluşturuldu', id: result?.id })
}))

// PUT /api/parties/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { type, name, tax_no, phone, email, address, notes } = req.body

  await db.execute(`
    UPDATE parties SET type = $1, name = $2, tax_no = $3, phone = $4, email = $5, address = $6, notes = $7, updated_at = NOW()
    WHERE id = $8
  `, [type || 'customer', name, tax_no || null, phone || null, email || null, address || null, notes || null, id])

  res.json({ success: true, message: 'Cari güncellendi' })
}))

// DELETE /api/parties/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM parties WHERE id = $1', [id])

  res.json({ success: true, message: 'Cari silindi' })
}))

// POST /api/parties/merge
router.post('/merge', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sourceId, targetId } = req.body

  // Update transactions
  const txResult = await db.execute('UPDATE transactions SET party_id = $1, updated_at = NOW() WHERE party_id = $2', [targetId, sourceId])

  // Update debts
  await db.execute('UPDATE debts SET party_id = $1, updated_at = NOW() WHERE party_id = $2', [targetId, sourceId])

  // Update projects
  await db.execute('UPDATE projects SET party_id = $1, updated_at = NOW() WHERE party_id = $2', [targetId, sourceId])

  // Delete source party
  await db.execute('DELETE FROM parties WHERE id = $1', [sourceId])

  res.json({ success: true, message: 'Cariler birleştirildi', recordsMoved: txResult.rowCount || 0 })
}))

export default router

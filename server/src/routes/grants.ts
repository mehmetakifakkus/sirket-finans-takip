import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/grants/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const grant = await db.queryOne(`
    SELECT g.*,
           p.title as project_title
    FROM project_grants g
    LEFT JOIN projects p ON g.project_id = p.id
    WHERE g.id = $1
  `, [id])

  if (!grant) {
    throw new NotFoundError('Hibe bulunamadı')
  }

  res.json(grant)
}))

// POST /api/grants
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    project_id, provider_name, provider_type, funding_rate, funding_amount,
    vat_excluded, approved_amount, received_amount, currency, status, notes
  } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO project_grants (
      project_id, provider_name, provider_type, funding_rate, funding_amount,
      vat_excluded, approved_amount, received_amount, currency, status, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    RETURNING id
  `, [
    project_id, provider_name, provider_type, funding_rate || null, funding_amount || null,
    vat_excluded !== false, approved_amount || 0, received_amount || 0, currency || 'TRY', status || 'pending', notes || null
  ])

  res.json({ success: true, message: 'Hibe oluşturuldu', id: result?.id })
}))

// PUT /api/grants/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const {
    provider_name, provider_type, funding_rate, funding_amount,
    vat_excluded, approved_amount, received_amount, currency, status, notes
  } = req.body

  await db.execute(`
    UPDATE project_grants SET
      provider_name = $1, provider_type = $2, funding_rate = $3, funding_amount = $4,
      vat_excluded = $5, approved_amount = $6, received_amount = $7, currency = $8, status = $9, notes = $10, updated_at = NOW()
    WHERE id = $11
  `, [
    provider_name, provider_type, funding_rate || null, funding_amount || null,
    vat_excluded !== false, approved_amount || 0, received_amount || 0, currency || 'TRY', status || 'pending', notes || null, id
  ])

  res.json({ success: true, message: 'Hibe güncellendi' })
}))

// DELETE /api/grants/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM project_grants WHERE id = $1', [id])

  res.json({ success: true, message: 'Hibe silindi' })
}))

// POST /api/grants/calculate
router.post('/calculate', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, rate, vatExcluded } = req.body

  // Get project expenses
  const result = await db.queryOne<{ total: string }>(`
    SELECT COALESCE(SUM(CASE WHEN $2 THEN amount ELSE net_amount END), 0) as total
    FROM transactions
    WHERE project_id = $1 AND type = 'expense'
  `, [projectId, vatExcluded])

  const total = parseFloat(result?.total || '0')
  const grantAmount = total * (rate / 100)

  res.json(grantAmount)
}))

export default router

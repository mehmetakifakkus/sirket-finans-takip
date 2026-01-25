import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/projects
router.get('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, partyId, search } = req.query

  let query = `
    SELECT p.*,
           pa.name as party_name,
           (SELECT COUNT(*) FROM project_milestones WHERE project_id = p.id) as milestone_count,
           (SELECT COUNT(*) FROM transactions WHERE project_id = p.id) as transaction_count,
           (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE -net_amount END), 0) FROM transactions WHERE project_id = p.id) as balance
    FROM projects p
    LEFT JOIN parties pa ON p.party_id = pa.id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (status) {
    query += ` AND p.status = $${paramIndex++}`
    params.push(status)
  }
  if (partyId) {
    query += ` AND p.party_id = $${paramIndex++}`
    params.push(partyId)
  }
  if (search) {
    query += ` AND p.title ILIKE $${paramIndex}`
    params.push(`%${search}%`)
    paramIndex++
  }

  query += ' ORDER BY p.created_at DESC'

  const projects = await db.query(query, params)
  res.json(projects)
}))

// GET /api/projects/incomplete-count
router.get('/incomplete-count', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const result = await db.queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM projects WHERE status NOT IN ('completed', 'cancelled')"
  )
  res.json(parseInt(result?.count || '0'))
}))

// GET /api/projects/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const project = await db.queryOne(`
    SELECT p.*,
           pa.name as party_name
    FROM projects p
    LEFT JOIN parties pa ON p.party_id = pa.id
    WHERE p.id = $1
  `, [id])

  if (!project) {
    throw new NotFoundError('Proje bulunamadı')
  }

  // Get milestones
  const milestones = await db.query(`
    SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY expected_date ASC
  `, [id])

  // Get transaction summary
  const summary = await db.queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN net_amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN net_amount ELSE 0 END), 0) as total_expense,
      COUNT(*) as transaction_count
    FROM transactions WHERE project_id = $1
  `, [id])

  res.json({ ...project, milestones, summary })
}))

// GET /api/projects/:id/grants
router.get('/:id/grants', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const grants = await db.query('SELECT * FROM project_grants WHERE project_id = $1 ORDER BY created_at DESC', [id])
  res.json(grants)
}))

// GET /api/projects/:id/grants/totals
router.get('/:id/grants/totals', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const result = await db.queryOne(`
    SELECT
      COALESCE(SUM(approved_amount), 0) as total_approved,
      COALESCE(SUM(received_amount), 0) as total_received
    FROM project_grants WHERE project_id = $1
  `, [id])

  res.json({
    total_approved: parseFloat(result?.total_approved || '0'),
    total_received: parseFloat(result?.total_received || '0')
  })
}))

// POST /api/projects
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { party_id, title, contract_amount, currency, start_date, end_date, status, notes } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO projects (party_id, title, contract_amount, currency, start_date, end_date, status, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING id
  `, [party_id || null, title, contract_amount || 0, currency || 'TRY', start_date || null, end_date || null, status || 'active', notes || null])

  res.json({ success: true, message: 'Proje oluşturuldu', id: result?.id })
}))

// PUT /api/projects/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { party_id, title, contract_amount, currency, start_date, end_date, status, notes } = req.body

  await db.execute(`
    UPDATE projects SET party_id = $1, title = $2, contract_amount = $3, currency = $4,
    start_date = $5, end_date = $6, status = $7, notes = $8, updated_at = NOW()
    WHERE id = $9
  `, [party_id || null, title, contract_amount || 0, currency || 'TRY', start_date || null, end_date || null, status || 'active', notes || null, id])

  res.json({ success: true, message: 'Proje güncellendi' })
}))

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM projects WHERE id = $1', [id])

  res.json({ success: true, message: 'Proje silindi' })
}))

export default router

import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/milestones/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const milestone = await db.queryOne(`
    SELECT m.*,
           p.title as project_title
    FROM project_milestones m
    LEFT JOIN projects p ON m.project_id = p.id
    WHERE m.id = $1
  `, [id])

  if (!milestone) {
    throw new NotFoundError('Kilometre taşı bulunamadı')
  }

  res.json(milestone)
}))

// POST /api/milestones
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, title, expected_date, expected_amount, currency, status, notes } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO project_milestones (project_id, title, expected_date, expected_amount, currency, status, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING id
  `, [project_id, title, expected_date || null, expected_amount || 0, currency || 'TRY', status || 'pending', notes || null])

  res.json({ success: true, message: 'Kilometre taşı oluşturuldu', id: result?.id })
}))

// PUT /api/milestones/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { title, expected_date, expected_amount, currency, status, notes } = req.body

  await db.execute(`
    UPDATE project_milestones SET title = $1, expected_date = $2, expected_amount = $3, currency = $4, status = $5, notes = $6, updated_at = NOW()
    WHERE id = $7
  `, [title, expected_date || null, expected_amount || 0, currency || 'TRY', status || 'pending', notes || null, id])

  res.json({ success: true, message: 'Kilometre taşı güncellendi' })
}))

// DELETE /api/milestones/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM project_milestones WHERE id = $1', [id])

  res.json({ success: true, message: 'Kilometre taşı silindi' })
}))

export default router

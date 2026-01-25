import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/categories
router.get('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.query

  let query = 'SELECT * FROM categories WHERE 1=1'
  const params: any[] = []

  if (type) {
    query += ' AND type = $1'
    params.push(type)
  }

  query += ' ORDER BY name ASC'

  const categories = await db.query(query, params)
  res.json(categories)
}))

// GET /api/categories/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const category = await db.queryOne('SELECT * FROM categories WHERE id = $1', [id])

  if (!category) {
    throw new NotFoundError('Kategori bulunamadı')
  }

  res.json(category)
}))

// POST /api/categories
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, type, parent_id, is_active } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO categories (name, type, parent_id, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id
  `, [name, type, parent_id || null, is_active !== false])

  res.json({ success: true, message: 'Kategori oluşturuldu', id: result?.id })
}))

// PUT /api/categories/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { name, type, parent_id, is_active } = req.body

  await db.execute(`
    UPDATE categories SET name = $1, type = $2, parent_id = $3, is_active = $4, updated_at = NOW()
    WHERE id = $5
  `, [name, type, parent_id || null, is_active !== false, id])

  res.json({ success: true, message: 'Kategori güncellendi' })
}))

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM categories WHERE id = $1', [id])

  res.json({ success: true, message: 'Kategori silindi' })
}))

// POST /api/categories/merge
router.post('/merge', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sourceId, targetId } = req.body

  // Update transactions
  const result = await db.execute('UPDATE transactions SET category_id = $1, updated_at = NOW() WHERE category_id = $2', [targetId, sourceId])

  // Delete source category
  await db.execute('DELETE FROM categories WHERE id = $1', [sourceId])

  res.json({ success: true, message: 'Kategoriler birleştirildi', transactionsMoved: result.rowCount || 0 })
}))

export default router

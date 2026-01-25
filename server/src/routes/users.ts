import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../database/connection.js'
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/users
router.get('/', authMiddleware, adminMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const users = await db.query('SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY name ASC')
  res.json(users)
}))

// GET /api/users/:id
router.get('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const user = await db.queryOne('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = $1', [id])

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı')
  }

  res.json(user)
}))

// POST /api/users
router.post('/', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role, status } = req.body

  // Check if email already exists
  const existing = await db.queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) {
    res.json({ success: false, message: 'Bu e-posta adresi zaten kullanımda' })
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO users (name, email, password, role, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id
  `, [name, email, hashedPassword, role || 'staff', status || 'active'])

  res.json({ success: true, message: 'Kullanıcı oluşturuldu', id: result?.id })
}))

// PUT /api/users/:id
router.put('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { name, email, password, role, status } = req.body

  // Check if email already exists for another user
  const existing = await db.queryOne<{ id: number }>('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id])
  if (existing) {
    res.json({ success: false, message: 'Bu e-posta adresi zaten kullanımda' })
    return
  }

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10)
    await db.execute(`
      UPDATE users SET name = $1, email = $2, password = $3, role = $4, status = $5, updated_at = NOW()
      WHERE id = $6
    `, [name, email, hashedPassword, role || 'staff', status || 'active', id])
  } else {
    await db.execute(`
      UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = NOW()
      WHERE id = $5
    `, [name, email, role || 'staff', status || 'active', id])
  }

  res.json({ success: true, message: 'Kullanıcı güncellendi' })
}))

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  // Prevent deleting self
  if (req.user?.id === parseInt(id)) {
    res.json({ success: false, message: 'Kendinizi silemezsiniz' })
    return
  }

  await db.execute('DELETE FROM users WHERE id = $1', [id])

  res.json({ success: true, message: 'Kullanıcı silindi' })
}))

export default router

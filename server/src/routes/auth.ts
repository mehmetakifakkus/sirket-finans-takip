import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../database/connection.js'
import config from '../config.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

// POST /api/auth/login
router.post('/login', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.json({ success: false, message: 'E-posta ve şifre gerekli' })
    return
  }

  const user = await db.queryOne<{
    id: number
    email: string
    name: string
    password: string
    role: string
    status: string
  }>('SELECT id, email, name, password, role, status FROM users WHERE email = $1', [email])

  if (!user) {
    res.json({ success: false, message: 'E-posta veya şifre hatalı' })
    return
  }

  if (user.status !== 'active') {
    res.json({ success: false, message: 'Hesabınız aktif değil' })
    return
  }

  const isValidPassword = await bcrypt.compare(password, user.password)
  if (!isValidPassword) {
    res.json({ success: false, message: 'E-posta veya şifre hatalı' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )

  res.json({
    success: true,
    message: 'Giriş başarılı',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
}))

// POST /api/auth/logout
router.post('/logout', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  // JWT is stateless, so logout is handled on client side
  // Here we could add token to a blacklist if needed
  res.json({ success: true, message: 'Çıkış başarılı' })
}))

// GET /api/auth/me
router.get('/me', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.json(null)
    return
  }

  const user = await db.queryOne<{
    id: number
    email: string
    name: string
    role: string
    status: string
    created_at: string
  }>('SELECT id, email, name, role, status, created_at FROM users WHERE id = $1', [req.user.id])

  res.json(user)
}))

export default router

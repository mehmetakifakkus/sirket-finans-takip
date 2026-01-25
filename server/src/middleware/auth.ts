import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import config from '../config.js'
import { db } from '../database/connection.js'

export interface JwtPayload {
  userId: number
  email: string
  role: string
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    email: string
    name: string
    role: string
  }
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Yetkilendirme başlığı eksik' })
      return
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      res.status(401).json({ success: false, message: 'Token bulunamadı' })
      return
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload

    // Get user from database
    const user = await db.queryOne<{ id: number; email: string; name: string; role: string; status: string }>(
      'SELECT id, email, name, role, status FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (!user) {
      res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' })
      return
    }

    if (user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Hesabınız aktif değil' })
      return
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Oturum süresi doldu' })
      return
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Geçersiz token' })
      return
    }
    res.status(500).json({ success: false, message: 'Yetkilendirme hatası' })
  }
}

export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' })
    return
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Bu işlem için yönetici yetkisi gerekli' })
    return
  }

  next()
}

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]

      if (token) {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload

        const user = await db.queryOne<{ id: number; email: string; name: string; role: string; status: string }>(
          'SELECT id, email, name, role, status FROM users WHERE id = $1 AND status = $2',
          [decoded.userId, 'active']
        )

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        }
      }
    }
  } catch {
    // Ignore errors in optional auth - just continue without user
  }

  next()
}

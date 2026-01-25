import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Kayıt bulunamadı') {
    super(message, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Geçersiz veri') {
    super(message, 400)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Yetkilendirme gerekli') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Bu işlem için yetkiniz yok') {
    super(message, 403)
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err)

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
    return
  }

  // Handle PostgreSQL errors
  if ((err as any).code) {
    const pgError = err as any
    switch (pgError.code) {
      case '23505': // unique_violation
        res.status(400).json({
          success: false,
          message: 'Bu kayıt zaten mevcut',
        })
        return
      case '23503': // foreign_key_violation
        res.status(400).json({
          success: false,
          message: 'İlişkili kayıt bulunamadı',
        })
        return
      case '23502': // not_null_violation
        res.status(400).json({
          success: false,
          message: 'Zorunlu alan eksik',
        })
        return
    }
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Bir hata oluştu',
  })
}

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı',
  })
}

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

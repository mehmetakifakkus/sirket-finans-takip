import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { db } from '../database/connection.js'
import config from '../config.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(config.uploads.directory, 'documents')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `doc-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxFileSize
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Desteklenmeyen dosya türü'))
    }
  }
})

// POST /api/documents - Upload document
router.post('/', authMiddleware, upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.json({ success: false, message: 'Dosya yüklenmedi' })
    return
  }

  const { transactionId } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO transaction_documents (transaction_id, filename, original_name, mime_type, file_size, uploaded_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `, [transactionId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size])

  const document = await db.queryOne('SELECT * FROM transaction_documents WHERE id = $1', [result?.id])

  res.json({ success: true, message: 'Dosya yüklendi', document })
}))

// GET /api/documents/transaction/:transactionId
router.get('/transaction/:transactionId', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId } = req.params

  const documents = await db.query(
    'SELECT * FROM transaction_documents WHERE transaction_id = $1 ORDER BY uploaded_at DESC',
    [transactionId]
  )

  res.json(documents)
}))

// GET /api/documents/transaction/:transactionId/count
router.get('/transaction/:transactionId/count', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId } = req.params

  const result = await db.queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM transaction_documents WHERE transaction_id = $1',
    [transactionId]
  )

  res.json(parseInt(result?.count || '0'))
}))

// GET /api/documents/:id/preview
router.get('/:id/preview', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const document = await db.queryOne<{ filename: string; mime_type: string }>(
    'SELECT filename, mime_type FROM transaction_documents WHERE id = $1',
    [id]
  )

  if (!document) {
    throw new NotFoundError('Belge bulunamadı')
  }

  const filePath = path.join(config.uploads.directory, 'documents', document.filename)

  if (!fs.existsSync(filePath)) {
    res.json({ success: false, message: 'Dosya bulunamadı' })
    return
  }

  // For images, return base64
  if (document.mime_type.startsWith('image/')) {
    const fileData = fs.readFileSync(filePath)
    const base64 = fileData.toString('base64')
    res.json({
      success: true,
      data: `data:${document.mime_type};base64,${base64}`,
      mimeType: document.mime_type
    })
  } else {
    // For other files, just indicate it exists
    res.json({ success: true, mimeType: document.mime_type })
  }
}))

// GET /api/documents/file/:filename - Download file
router.get('/file/:filename', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { filename } = req.params

  const document = await db.queryOne<{ original_name: string; mime_type: string }>(
    'SELECT original_name, mime_type FROM transaction_documents WHERE filename = $1',
    [filename]
  )

  if (!document) {
    throw new NotFoundError('Belge bulunamadı')
  }

  const filePath = path.join(config.uploads.directory, 'documents', filename)

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('Dosya bulunamadı')
  }

  res.setHeader('Content-Type', document.mime_type)
  res.setHeader('Content-Disposition', `inline; filename="${document.original_name}"`)
  res.sendFile(filePath)
}))

// DELETE /api/documents/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const document = await db.queryOne<{ filename: string }>(
    'SELECT filename FROM transaction_documents WHERE id = $1',
    [id]
  )

  if (!document) {
    throw new NotFoundError('Belge bulunamadı')
  }

  // Delete file from disk
  const filePath = path.join(config.uploads.directory, 'documents', document.filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  // Delete from database
  await db.execute('DELETE FROM transaction_documents WHERE id = $1', [id])

  res.json({ success: true, message: 'Belge silindi' })
}))

export default router

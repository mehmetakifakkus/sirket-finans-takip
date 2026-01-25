import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import config from '../config.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// Configure multer for general file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(config.uploads.directory, 'files')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `file-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxFileSize
  }
})

// POST /api/files/upload
router.post('/upload', authMiddleware, upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.json({ success: false, message: 'Dosya yüklenmedi' })
    return
  }

  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype
  })
}))

// GET /api/files/:filename
router.get('/:filename', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { filename } = req.params
  const decodedFilename = decodeURIComponent(filename)

  const filePath = path.join(config.uploads.directory, 'files', decodedFilename)

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('Dosya bulunamadı')
  }

  res.sendFile(filePath)
}))

// DELETE /api/files/:filename
router.delete('/:filename', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { filename } = req.params
  const decodedFilename = decodeURIComponent(filename)

  const filePath = path.join(config.uploads.directory, 'files', decodedFilename)

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    res.json({ success: true, message: 'Dosya silindi' })
  } else {
    res.json({ success: false, message: 'Dosya bulunamadı' })
  }
}))

export default router

import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'
import config from '../config.js'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

// Configure multer for import files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(config.uploads.directory, 'temp')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `import-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxFileSize
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
    const allowedExtensions = ['.xlsx', '.xls', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Desteklenmeyen dosya türü. Sadece Excel ve CSV dosyaları kabul edilir.'))
    }
  }
})

// POST /api/import/parse
router.post('/parse', authMiddleware, upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.json({ success: false, message: 'Dosya yüklenmedi' })
    return
  }

  try {
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    if (data.length < 2) {
      res.json({ success: false, message: 'Dosya boş veya geçersiz' })
      return
    }

    const headers = data[0] as string[]
    const rows: any[] = []
    const categories = new Set<string>()
    const parties = new Set<string>()

    // Expected columns: Date, Type, Amount, Currency, Category, Party, Description, RefNo
    const dateIdx = headers.findIndex(h => /tarih|date/i.test(h))
    const typeIdx = headers.findIndex(h => /tür|tip|type/i.test(h))
    const amountIdx = headers.findIndex(h => /tutar|amount|miktar/i.test(h))
    const currencyIdx = headers.findIndex(h => /para|currency|döviz/i.test(h))
    const categoryIdx = headers.findIndex(h => /kategori|category/i.test(h))
    const partyIdx = headers.findIndex(h => /cari|party|firma|müşteri|tedarikçi/i.test(h))
    const descIdx = headers.findIndex(h => /açıklama|description|not/i.test(h))
    const refIdx = headers.findIndex(h => /referans|ref|fatura/i.test(h))

    let validRows = 0
    let invalidRows = 0

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const date = dateIdx >= 0 ? row[dateIdx] : null
      const type = typeIdx >= 0 ? row[typeIdx] : null
      const amount = amountIdx >= 0 ? row[amountIdx] : null

      if (!date || !amount) {
        invalidRows++
        continue
      }

      const category = categoryIdx >= 0 ? row[categoryIdx] : null
      const party = partyIdx >= 0 ? row[partyIdx] : null

      if (category) categories.add(String(category))
      if (party) parties.add(String(party))

      // Determine type
      let normalizedType = 'expense'
      if (type) {
        const typeStr = String(type).toLowerCase()
        if (typeStr.includes('gelir') || typeStr.includes('income') || typeStr === '+') {
          normalizedType = 'income'
        }
      } else if (Number(amount) > 0) {
        normalizedType = 'income'
      }

      rows.push({
        date: formatDate(date),
        type: normalizedType,
        amount: Math.abs(Number(amount)),
        currency: currencyIdx >= 0 && row[currencyIdx] ? String(row[currencyIdx]).toUpperCase() : 'TRY',
        category: category ? String(category) : null,
        party: party ? String(party) : null,
        description: descIdx >= 0 ? row[descIdx] : null,
        ref_no: refIdx >= 0 ? row[refIdx] : null,
        valid: true
      })

      validRows++
    }

    // Check existing categories and parties
    const existingCategories = await db.query('SELECT name FROM categories')
    const existingParties = await db.query('SELECT name FROM parties')
    const existingCategoryNames = new Set(existingCategories.map((c: any) => c.name.toLowerCase()))
    const existingPartyNames = new Set(existingParties.map((p: any) => p.name.toLowerCase()))

    const categoryList = Array.from(categories).map(name => ({
      name,
      exists: existingCategoryNames.has(name.toLowerCase())
    }))

    const partyList = Array.from(parties).map(name => ({
      name,
      exists: existingPartyNames.has(name.toLowerCase())
    }))

    // Clean up temp file
    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      preview: {
        fileName: req.file.originalname,
        totalRows: data.length - 1,
        validRows,
        invalidRows,
        skippedRows: data.length - 1 - validRows - invalidRows,
        rows: rows.slice(0, 100), // Return first 100 rows for preview
        categories: categoryList,
        parties: partyList
      }
    })
  } catch (error: any) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.json({ success: false, message: error.message || 'Dosya okunamadı' })
  }
}))

// POST /api/import/execute
router.post('/execute', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { rows, userId } = req.body

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    res.json({ success: false, message: 'İçe aktarılacak veri yok', imported: 0, failed: 0, categoriesCreated: 0, partiesCreated: 0, errors: [] })
    return
  }

  let imported = 0
  let failed = 0
  let categoriesCreated = 0
  let partiesCreated = 0
  const errors: string[] = []

  // Get existing categories and parties
  const existingCategories = await db.query('SELECT id, name, type FROM categories')
  const existingParties = await db.query('SELECT id, name FROM parties')

  const categoryMap = new Map<string, { id: number; type: string }>()
  existingCategories.forEach((c: any) => categoryMap.set(c.name.toLowerCase(), { id: c.id, type: c.type }))

  const partyMap = new Map<string, number>()
  existingParties.forEach((p: any) => partyMap.set(p.name.toLowerCase(), p.id))

  for (const row of rows) {
    try {
      let categoryId: number | null = null
      let partyId: number | null = null

      // Handle category
      if (row.category) {
        const categoryKey = row.category.toLowerCase()
        if (categoryMap.has(categoryKey)) {
          categoryId = categoryMap.get(categoryKey)!.id
        } else {
          // Create new category
          const result = await db.queryOne<{ id: number }>(`
            INSERT INTO categories (name, type, is_active, created_at, updated_at)
            VALUES ($1, $2, true, NOW(), NOW())
            RETURNING id
          `, [row.category, row.type])
          if (result) {
            categoryId = result.id
            categoryMap.set(categoryKey, { id: categoryId, type: row.type })
            categoriesCreated++
          }
        }
      }

      // Handle party
      if (row.party) {
        const partyKey = row.party.toLowerCase()
        if (partyMap.has(partyKey)) {
          partyId = partyMap.get(partyKey)!
        } else {
          // Create new party
          const result = await db.queryOne<{ id: number }>(`
            INSERT INTO parties (type, name, created_at, updated_at)
            VALUES ('other', $1, NOW(), NOW())
            RETURNING id
          `, [row.party])
          if (result) {
            partyId = result.id
            partyMap.set(partyKey, partyId)
            partiesCreated++
          }
        }
      }

      // Calculate amounts
      const amount = Number(row.amount)
      const vatRate = row.vat_rate || 0
      const vatAmount = amount * vatRate / 100
      const netAmount = amount + vatAmount

      // Insert transaction
      await db.execute(`
        INSERT INTO transactions (
          type, party_id, category_id, date, amount, currency,
          vat_rate, vat_amount, withholding_rate, withholding_amount,
          net_amount, description, ref_no, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, $9, $10, $11, $12, NOW(), NOW())
      `, [
        row.type, partyId, categoryId, row.date, amount, row.currency || 'TRY',
        vatRate, vatAmount, netAmount, row.description || null, row.ref_no || null, userId
      ])

      imported++
    } catch (error: any) {
      failed++
      errors.push(`Satır ${imported + failed}: ${error.message}`)
    }
  }

  res.json({
    success: true,
    message: `${imported} işlem içe aktarıldı`,
    imported,
    failed,
    categoriesCreated,
    partiesCreated,
    errors: errors.slice(0, 10) // Return first 10 errors
  })
}))

function formatDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0]

  // If it's already a string in YYYY-MM-DD format
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  // If it's an Excel serial number
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }

  // Try to parse as date
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return new Date().toISOString().split('T')[0]
}

export default router

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import { DatabaseWrapper } from '../database/connection'

// Turkish month names to skip as row headers
const TURKISH_MONTHS = [
  'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
  'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik',
  'şubat', 'mayıs', 'ağustos', 'eylül', 'aralık'
]

export interface ImportRow {
  rowNumber: number
  expenseType: string
  date: string
  dateISO: string | null
  location: string
  itemType: string
  quantity: number | null
  unitPrice: number | null
  total: number
  isValid: boolean
  errors: string[]
  selected: boolean
  categoryId?: number
  partyId?: number
  isNewCategory?: boolean
  isNewParty?: boolean
}

export interface ImportPreview {
  fileName: string
  totalRows: number
  validRows: number
  invalidRows: number
  skippedRows: number
  rows: ImportRow[]
  categories: { name: string; exists: boolean }[]
  parties: { name: string; exists: boolean }[]
}

export interface ImportResult {
  success: boolean
  message: string
  imported: number
  failed: number
  categoriesCreated: number
  partiesCreated: number
  errors: string[]
}

export class ImportService {
  private db: DatabaseWrapper

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  parseFile(filePath: string): ImportPreview {
    const ext = filePath.toLowerCase().split('.').pop()
    let data: any[][]

    if (ext === 'csv') {
      data = this.parseCSV(filePath)
    } else if (ext === 'xlsx' || ext === 'xls') {
      data = this.parseExcel(filePath)
    } else {
      throw new Error('Desteklenmeyen dosya formatı. CSV veya Excel dosyası seçin.')
    }

    return this.processData(data, filePath)
  }

  private parseCSV(filePath: string): any[][] {
    const content = fs.readFileSync(filePath, 'utf-8')
    const workbook = XLSX.read(content, { type: 'string', raw: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    return XLSX.utils.sheet_to_json(sheet, { header: 1 })
  }

  private parseExcel(filePath: string): any[][] {
    const buffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    return XLSX.utils.sheet_to_json(sheet, { header: 1 })
  }

  private processData(data: any[][], filePath: string): ImportPreview {
    const rows: ImportRow[] = []
    const categorySet = new Map<string, boolean>()
    const partySet = new Map<string, boolean>()
    let skippedRows = 0

    // Get existing categories and parties
    const existingCategories = this.db.prepare(
      "SELECT name FROM categories WHERE type = 'expense'"
    ).all() as { name: string }[]
    const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()))

    const existingParties = this.db.prepare(
      "SELECT name FROM parties"
    ).all() as { name: string }[]
    const existingPartyNames = new Set(existingParties.map(p => p.name.toLowerCase()))

    // Skip header row if it looks like a header
    let startIndex = 0
    if (data.length > 0) {
      const firstRow = data[0]
      if (firstRow && typeof firstRow[0] === 'string') {
        const firstCell = firstRow[0].toLowerCase().trim()
        if (firstCell.includes('harcama') || firstCell.includes('tür') || firstCell.includes('type')) {
          startIndex = 1
          skippedRows++
        }
      }
    }

    for (let i = startIndex; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) {
        skippedRows++
        continue
      }

      const firstCell = String(row[0] || '').trim()

      // Skip empty rows
      if (!firstCell) {
        skippedRows++
        continue
      }

      // Skip month headers
      if (TURKISH_MONTHS.includes(firstCell.toLowerCase())) {
        skippedRows++
        continue
      }

      // Skip if it looks like a header row
      if (firstCell.toLowerCase().includes('harcama') ||
          firstCell.toLowerCase().includes('toplam') ||
          firstCell.toLowerCase() === 'type') {
        skippedRows++
        continue
      }

      const importRow = this.parseRow(row, i + 1)

      // Track categories and parties
      if (importRow.expenseType) {
        const exists = existingCategoryNames.has(importRow.expenseType.toLowerCase())
        categorySet.set(importRow.expenseType, exists)
        importRow.isNewCategory = !exists
      }

      if (importRow.location) {
        const exists = existingPartyNames.has(importRow.location.toLowerCase())
        partySet.set(importRow.location, exists)
        importRow.isNewParty = !exists
      }

      rows.push(importRow)
    }

    const validRows = rows.filter(r => r.isValid).length
    const invalidRows = rows.filter(r => !r.isValid).length

    return {
      fileName: filePath.split('/').pop() || filePath,
      totalRows: data.length,
      validRows,
      invalidRows,
      skippedRows,
      rows,
      categories: Array.from(categorySet.entries()).map(([name, exists]) => ({ name, exists })),
      parties: Array.from(partySet.entries()).map(([name, exists]) => ({ name, exists }))
    }
  }

  private parseRow(row: any[], rowNumber: number): ImportRow {
    const errors: string[] = []

    // Expected format: Harcama Türü | Tarihi | Yer | Cins | Miktar | Birim Tutar | Toplam (TL)
    const expenseType = String(row[0] || '').trim()
    const dateStr = String(row[1] || '').trim()
    const location = String(row[2] || '').trim()
    const itemType = String(row[3] || '').trim()
    const quantityRaw = row[4]
    const unitPriceRaw = row[5]
    const totalRaw = row[6]

    // Parse date (DD.MM.YYYY -> YYYY-MM-DD)
    let dateISO: string | null = null
    if (dateStr) {
      dateISO = this.parseDate(dateStr)
      if (!dateISO) {
        errors.push(`Geçersiz tarih formatı: ${dateStr}`)
      }
    } else {
      errors.push('Tarih boş')
    }

    // Parse numbers
    const quantity = this.parseNumber(quantityRaw)
    const unitPrice = this.parseNumber(unitPriceRaw)
    let total = this.parseNumber(totalRaw)

    // If total is not provided, calculate from quantity * unitPrice
    if (total === null && quantity !== null && unitPrice !== null) {
      total = quantity * unitPrice
    }

    if (total === null || total <= 0) {
      errors.push('Geçersiz toplam tutar')
    }

    if (!expenseType) {
      errors.push('Harcama türü boş')
    }

    return {
      rowNumber,
      expenseType,
      date: dateStr,
      dateISO,
      location,
      itemType,
      quantity,
      unitPrice,
      total: total || 0,
      isValid: errors.length === 0,
      errors,
      selected: errors.length === 0
    }
  }

  private parseDate(dateStr: string): string | null {
    // Try DD.MM.YYYY format
    const dotMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (dotMatch) {
      const [, day, month, year] = dotMatch
      const d = parseInt(day)
      const m = parseInt(month)
      const y = parseInt(year)
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }
    }

    // Try DD/MM/YYYY format
    const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slashMatch) {
      const [, day, month, year] = slashMatch
      const d = parseInt(day)
      const m = parseInt(month)
      const y = parseInt(year)
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }
    }

    // Try YYYY-MM-DD format (already ISO)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
      return dateStr
    }

    // Try Excel serial date number
    const numDate = parseFloat(dateStr)
    if (!isNaN(numDate) && numDate > 0) {
      const date = XLSX.SSF.parse_date_code(numDate)
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
      }
    }

    return null
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    // If already a number
    if (typeof value === 'number') {
      return value
    }

    // Convert to string and clean up
    let str = String(value).trim()

    // Remove currency symbols and thousands separators
    str = str.replace(/[₺$€\s]/g, '')
    str = str.replace(/\./g, '') // Remove thousand separators (Turkish format: 1.000)
    str = str.replace(',', '.') // Convert decimal comma to dot

    const num = parseFloat(str)
    return isNaN(num) ? null : num
  }

  async importTransactions(rows: ImportRow[], userId: number): Promise<ImportResult> {
    const errors: string[] = []
    let imported = 0
    let failed = 0
    let categoriesCreated = 0
    let partiesCreated = 0

    // Category and party caches
    const categoryCache = new Map<string, number>()
    const partyCache = new Map<string, number>()

    // Load existing categories
    const existingCategories = this.db.prepare(
      "SELECT id, name FROM categories WHERE type = 'expense'"
    ).all() as { id: number; name: string }[]
    for (const cat of existingCategories) {
      categoryCache.set(cat.name.toLowerCase(), cat.id)
    }

    // Load existing parties
    const existingParties = this.db.prepare(
      "SELECT id, name FROM parties"
    ).all() as { id: number; name: string }[]
    for (const party of existingParties) {
      partyCache.set(party.name.toLowerCase(), party.id)
    }

    // Process each selected row
    for (const row of rows.filter(r => r.selected && r.isValid)) {
      try {
        // Get or create category
        let categoryId: number | null = null
        if (row.expenseType && row.expenseType.trim()) {
          const key = row.expenseType.toLowerCase().trim()
          if (categoryCache.has(key)) {
            categoryId = categoryCache.get(key) ?? null
          } else {
            // Create new category
            const result = this.db.prepare(
              "INSERT INTO categories (name, type, is_active, created_at, updated_at) VALUES (?, 'expense', 1, datetime('now'), datetime('now'))"
            ).run(row.expenseType.trim())
            categoryId = Number(result.lastInsertRowid)
            if (categoryId && categoryId > 0) {
              categoryCache.set(key, categoryId)
              categoriesCreated++
            } else {
              console.error(`Failed to get category ID for: ${row.expenseType}`)
              categoryId = null
            }
          }
        }

        // Get or create party (vendor)
        let partyId: number | null = null
        if (row.location && row.location.trim()) {
          const key = row.location.toLowerCase().trim()
          if (partyCache.has(key)) {
            partyId = partyCache.get(key) ?? null
          } else {
            // Create new party as vendor
            const result = this.db.prepare(
              "INSERT INTO parties (type, name, created_at, updated_at) VALUES ('vendor', ?, datetime('now'), datetime('now'))"
            ).run(row.location.trim())
            partyId = Number(result.lastInsertRowid)
            if (partyId && partyId > 0) {
              partyCache.set(key, partyId)
              partiesCreated++
            } else {
              console.error(`Failed to get party ID for: ${row.location}`)
              partyId = null
            }
          }
        }

        // Build description
        let description = row.itemType || ''
        if (row.quantity !== null && row.unitPrice !== null) {
          description += description ? ` (${row.quantity} x ${row.unitPrice} TL)` : `${row.quantity} x ${row.unitPrice} TL`
        }

        // Create transaction
        this.db.prepare(`
          INSERT INTO transactions (
            type, party_id, category_id, date, amount, currency,
            vat_rate, vat_amount, withholding_rate, withholding_amount,
            net_amount, description, created_by, created_at, updated_at
          ) VALUES (
            'expense', ?, ?, ?, ?, 'TRY',
            0, 0, 0, 0,
            ?, ?, ?, datetime('now'), datetime('now')
          )
        `).run(
          partyId,
          categoryId,
          row.dateISO,
          row.total,
          row.total,
          description,
          userId
        )

        imported++
      } catch (err: any) {
        failed++
        errors.push(`Satır ${row.rowNumber}: ${err.message || 'Bilinmeyen hata'}`)
      }
    }

    return {
      success: imported > 0,
      message: imported > 0
        ? `${imported} işlem başarıyla içe aktarıldı`
        : 'Hiçbir işlem içe aktarılamadı',
      imported,
      failed,
      categoriesCreated,
      partiesCreated,
      errors
    }
  }
}

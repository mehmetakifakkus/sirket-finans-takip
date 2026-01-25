import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

// GET /api/database/stats
router.get('/stats', authMiddleware, adminMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  // Get table sizes
  const tables = ['users', 'transactions', 'debts', 'installments', 'parties', 'categories',
    'projects', 'project_milestones', 'project_grants', 'payments', 'exchange_rates', 'audit_logs', 'transaction_documents']

  const records: Record<string, number> = {}

  for (const table of tables) {
    try {
      const result = await db.queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM ${table}`)
      records[table] = parseInt(result?.count || '0')
    } catch {
      records[table] = 0
    }
  }

  // Get database size
  const sizeResult = await db.queryOne<{ size: string }>(`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `)

  res.json({
    size: sizeResult?.size || 'Unknown',
    tables: tables.length,
    records
  })
}))

// GET /api/database/export
router.get('/export', authMiddleware, adminMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  // Generate SQL dump
  const tables = ['users', 'categories', 'parties', 'projects', 'project_milestones', 'project_grants',
    'transactions', 'debts', 'installments', 'payments', 'exchange_rates', 'audit_logs', 'transaction_documents']

  let sql = '-- Sirket Finans Takip Database Export\n'
  sql += `-- Generated at: ${new Date().toISOString()}\n\n`

  for (const table of tables) {
    try {
      const rows = await db.query(`SELECT * FROM ${table}`)
      if (rows.length === 0) continue

      sql += `-- Table: ${table}\n`

      // Get column names
      const columns = Object.keys(rows[0])

      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col]
          if (val === null) return 'NULL'
          if (typeof val === 'number') return val
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
          if (val instanceof Date) return `'${val.toISOString()}'`
          return `'${String(val).replace(/'/g, "''")}'`
        }).join(', ')

        sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`
      }

      sql += '\n'
    } catch (error) {
      sql += `-- Error exporting ${table}\n\n`
    }
  }

  res.setHeader('Content-Type', 'application/sql')
  res.setHeader('Content-Disposition', `attachment; filename=sirket-finans-backup_${new Date().toISOString().split('T')[0]}.sql`)
  res.send(sql)
}))

// POST /api/database/import - Import SQL file
router.post('/import', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sql } = req.body

  if (!sql) {
    res.json({ success: false, message: 'SQL içeriği gerekli' })
    return
  }

  const details: string[] = []

  try {
    // Split SQL into statements
    const statements = sql.split(';').filter((s: string) => s.trim().length > 0 && !s.trim().startsWith('--'))

    let executed = 0
    let errors = 0

    for (const statement of statements) {
      try {
        await db.execute(statement)
        executed++
      } catch (error: any) {
        errors++
        if (errors <= 5) {
          details.push(`Hata: ${error.message}`)
        }
      }
    }

    details.unshift(`${executed} sorgu çalıştırıldı, ${errors} hata`)

    res.json({
      success: errors === 0,
      message: errors === 0 ? 'İçe aktarma başarılı' : 'İçe aktarma tamamlandı (hatalarla)',
      details
    })
  } catch (error: any) {
    res.json({
      success: false,
      message: 'İçe aktarma başarısız',
      details: [error.message]
    })
  }
}))

export default router

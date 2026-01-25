import { DatabaseWrapper, saveDatabase } from '../database/connection'

export interface DatabaseStats {
  size: string
  tables: number
  records: Record<string, number>
}

export interface ExportResult {
  success: boolean
  sql?: string
  message?: string
}

export interface ImportResult {
  success: boolean
  message: string
  details?: string[]
}

// Table order respecting foreign key dependencies (independent tables first)
const TABLE_ORDER = [
  'users',
  'categories',
  'parties',
  'exchange_rates',
  'projects',
  'project_milestones',
  'debts',
  'installments',
  'payments',
  'transactions',
  'audit_logs'
]

export class DatabaseService {
  private db: DatabaseWrapper

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  getDatabaseStats(): DatabaseStats {
    const records: Record<string, number> = {}

    // Get record counts for each table
    for (const table of TABLE_ORDER) {
      try {
        const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
        records[table] = result.count
      } catch {
        records[table] = 0
      }
    }

    // Get database file size (approximate from page count)
    let size = '0 KB'
    try {
      const pageCount = this.db.prepare('PRAGMA page_count').get() as { page_count: number }
      const pageSize = this.db.prepare('PRAGMA page_size').get() as { page_size: number }
      const bytes = (pageCount.page_count || 0) * (pageSize.page_size || 4096)
      if (bytes < 1024) {
        size = `${bytes} B`
      } else if (bytes < 1024 * 1024) {
        size = `${(bytes / 1024).toFixed(1)} KB`
      } else {
        size = `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      }
    } catch (e) {
      console.error('Error getting database size:', e)
    }

    return {
      size,
      tables: TABLE_ORDER.length,
      records
    }
  }

  exportToSQL(): ExportResult {
    try {
      const lines: string[] = []
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

      // Header
      lines.push('-- Sirket Finans Takip - Database Export')
      lines.push(`-- Date: ${now}`)
      lines.push('-- Version: 1.0')
      lines.push('')
      lines.push('-- IMPORTANT: This export includes all data except users table for security.')
      lines.push('-- Import this file to restore data after clearing the database.')
      lines.push('')
      lines.push('PRAGMA foreign_keys=OFF;')
      lines.push('BEGIN TRANSACTION;')
      lines.push('')

      // Export each table (except users for security)
      for (const table of TABLE_ORDER) {
        if (table === 'users') {
          lines.push(`-- Table: ${table} (skipped for security)`)
          lines.push('')
          continue
        }

        lines.push(`-- Table: ${table}`)

        // Get table schema
        const schemaResult = this.db.prepare(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
        ).get(table) as { sql: string } | undefined

        if (schemaResult && schemaResult.sql) {
          lines.push(schemaResult.sql + ';')
        }

        // Get all data from table
        const rows = this.db.prepare(`SELECT * FROM ${table}`).all() as Record<string, any>[]

        for (const row of rows) {
          const columns = Object.keys(row)
          const values = columns.map(col => {
            const val = row[col]
            if (val === null) return 'NULL'
            if (typeof val === 'number') return val.toString()
            // Escape single quotes in strings
            return `'${String(val).replace(/'/g, "''")}'`
          })
          lines.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`)
        }

        lines.push('')
      }

      lines.push('COMMIT;')
      lines.push('PRAGMA foreign_keys=ON;')

      return {
        success: true,
        sql: lines.join('\n')
      }
    } catch (error) {
      console.error('Export error:', error)
      return {
        success: false,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  importFromSQL(sql: string): ImportResult {
    const details: string[] = []

    try {
      // Clear existing data first (except users)
      details.push('Clearing existing data...')
      this.clearDataForImport()
      details.push('Existing data cleared')

      // Parse and execute SQL statements
      details.push('Importing data...')

      // Split SQL into statements (handle multi-line statements)
      const statements = this.parseSQLStatements(sql)

      let insertCount = 0
      let createCount = 0

      // Execute statements in a transaction
      this.db.exec('BEGIN TRANSACTION')

      try {
        for (const stmt of statements) {
          const trimmed = stmt.trim()
          if (!trimmed || trimmed.startsWith('--')) continue

          // Skip PRAGMA, BEGIN, COMMIT as we handle transaction ourselves
          if (trimmed.toUpperCase().startsWith('PRAGMA') ||
              trimmed.toUpperCase().startsWith('BEGIN') ||
              trimmed.toUpperCase().startsWith('COMMIT')) {
            continue
          }

          // Skip CREATE TABLE IF NOT EXISTS for existing tables
          if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
            createCount++
            continue // Tables already exist from migrations
          }

          // Skip INSERT into users table
          if (trimmed.toUpperCase().startsWith('INSERT INTO USERS')) {
            continue
          }

          // Execute INSERT statements
          if (trimmed.toUpperCase().startsWith('INSERT')) {
            this.db.exec(trimmed)
            insertCount++
          }
        }

        this.db.exec('COMMIT')
        saveDatabase()

        details.push(`Imported ${insertCount} records`)

        return {
          success: true,
          message: 'Database imported successfully',
          details
        }
      } catch (innerError) {
        this.db.exec('ROLLBACK')
        throw innerError
      }
    } catch (error) {
      console.error('Import error:', error)
      return {
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details
      }
    }
  }

  private clearDataForImport(): void {
    // Delete in order to respect foreign key constraints (reverse of TABLE_ORDER)
    const tablesReversed = [...TABLE_ORDER].reverse()

    for (const table of tablesReversed) {
      if (table === 'users') continue // Keep users

      try {
        this.db.prepare(`DELETE FROM ${table}`).run()
      } catch (e) {
        // Table might not exist, ignore
        console.warn(`Could not clear table ${table}:`, e)
      }
    }
  }

  private parseSQLStatements(sql: string): string[] {
    const statements: string[] = []
    let current = ''
    let inString = false
    let stringChar = ''

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i]
      const nextChar = sql[i + 1]

      if (!inString && (char === "'" || char === '"')) {
        inString = true
        stringChar = char
        current += char
      } else if (inString && char === stringChar) {
        // Check for escaped quote
        if (nextChar === stringChar) {
          current += char + nextChar
          i++
        } else {
          inString = false
          stringChar = ''
          current += char
        }
      } else if (!inString && char === ';') {
        const stmt = current.trim()
        if (stmt) {
          statements.push(stmt)
        }
        current = ''
      } else {
        current += char
      }
    }

    // Add any remaining statement
    const remaining = current.trim()
    if (remaining) {
      statements.push(remaining)
    }

    return statements
  }
}

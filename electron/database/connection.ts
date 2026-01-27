// Use ASM.js version of sql.js to avoid WASM issues in packaged Electron apps
const initSqlJs = require('sql.js/dist/sql-asm.js')
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// Define the Database type
type SqlJsDatabase = any

let db: SqlJsDatabase | null = null
let dbPath: string = ''
let SQL: any = null

export async function initDatabaseAsync(): Promise<SqlJsDatabase> {
  if (db) return db

  // Get the user data path for storing the database
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'burnwise.db')

  // Ensure the directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  // Initialize SQL.js (ASM.js version doesn't need WASM)
  console.log('Initializing SQL.js (ASM.js version)...')
  SQL = await initSqlJs()

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON')

  console.log(`Database initialized at: ${dbPath}`)

  return db
}

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabaseAsync first.')
  }
  return db
}

export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
    console.log('Database connection closed')
  }
}

// Helper to get current timestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}

// Helper to format date for SQLite
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date.substring(0, 10)
  }
  return date.toISOString().substring(0, 10)
}

// Wrapper class to provide better-sqlite3 compatible API
export class DatabaseWrapper {
  private sqlDb: SqlJsDatabase

  constructor(sqlDb: SqlJsDatabase) {
    this.sqlDb = sqlDb
  }

  prepare(sql: string): StatementWrapper {
    return new StatementWrapper(this.sqlDb, sql)
  }

  exec(sql: string): void {
    this.sqlDb.exec(sql)
    saveDatabase()
  }

  pragma(pragma: string): any {
    const result = this.sqlDb.exec(`PRAGMA ${pragma}`)
    return result.length > 0 ? result[0].values[0] : null
  }

  close(): void {
    closeDatabase()
  }
}

export class StatementWrapper {
  private sqlDb: SqlJsDatabase
  private sql: string

  constructor(sqlDb: SqlJsDatabase, sql: string) {
    this.sqlDb = sqlDb
    this.sql = sql
  }

  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    const bindParams = this.normalizeParams(params)
    this.sqlDb.run(this.sql, bindParams)

    // Get changes and lastInsertRowid BEFORE saveDatabase() to avoid any state issues
    const changesResult = this.sqlDb.exec('SELECT changes()')
    const lastIdResult = this.sqlDb.exec('SELECT last_insert_rowid()')

    const changes = changesResult.length > 0 && changesResult[0].values.length > 0
      ? Number(changesResult[0].values[0][0]) : 0
    const lastInsertRowid = lastIdResult.length > 0 && lastIdResult[0].values.length > 0
      ? Number(lastIdResult[0].values[0][0]) : 0

    // Save after getting the results
    saveDatabase()

    return { changes, lastInsertRowid }
  }

  get(...params: any[]): any {
    const bindParams = this.normalizeParams(params)
    const stmt = this.sqlDb.prepare(this.sql)
    stmt.bind(bindParams)

    if (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      stmt.free()

      const result: any = {}
      columns.forEach((col, i) => {
        result[col] = values[i]
      })
      return result
    }

    stmt.free()
    return undefined
  }

  all(...params: any[]): any[] {
    const bindParams = this.normalizeParams(params)
    const results: any[] = []

    const stmt = this.sqlDb.prepare(this.sql)
    stmt.bind(bindParams)

    while (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()

      const row: any = {}
      columns.forEach((col, i) => {
        row[col] = values[i]
      })
      results.push(row)
    }

    stmt.free()
    return results
  }

  private normalizeParams(params: any[]): any[] {
    // If first param is an object with named params, convert to array
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
      // Named parameters - sql.js doesn't support them directly the same way
      // We need to handle this case specially
      return Object.values(params[0]).map(v => v === undefined ? null : v)
    }
    // Flatten if nested array
    if (params.length === 1 && Array.isArray(params[0])) {
      return params[0].map(v => v === undefined ? null : v)
    }
    // Convert undefined to null for sql.js compatibility
    return params.map(v => v === undefined ? null : v)
  }
}

// Singleton wrapper instance
let dbWrapper: DatabaseWrapper | null = null

export function getDatabaseWrapper(): DatabaseWrapper {
  if (!dbWrapper) {
    const sqlDb = getDatabase()
    dbWrapper = new DatabaseWrapper(sqlDb)
  }
  return dbWrapper
}

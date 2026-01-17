import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  // Get the user data path for storing the database
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'sirket-finans.db')

  // Ensure the directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  // Create database connection
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  console.log(`Database initialized at: ${dbPath}`)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
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

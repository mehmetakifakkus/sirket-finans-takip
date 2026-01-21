import bcrypt from 'bcryptjs'
import { DatabaseWrapper, getCurrentTimestamp, formatDate, saveDatabase } from '../database/connection'
import { runMigrations } from '../database/migrations'
import { seedEssentialCategories, seedExchangeRates, seedDemoData } from '../database/seed'

export interface SetupStatus {
  needsSetup: boolean
  hasDatabase: boolean
  hasUsers: boolean
  hasTables: boolean
}

export interface AdminData {
  name: string
  email: string
  password: string
}

export interface SeedOptions {
  categories: boolean
  exchangeRates: boolean
  demoData: boolean
}

export class SetupService {
  private db: DatabaseWrapper

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  checkStatus(): SetupStatus {
    try {
      // Check if tables exist
      const tablesResult = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).get()
      const hasTables = !!tablesResult

      if (!hasTables) {
        return {
          needsSetup: true,
          hasDatabase: true,
          hasUsers: false,
          hasTables: false
        }
      }

      // Check if users exist
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
      const hasUsers = userCount.count > 0

      return {
        needsSetup: !hasUsers,
        hasDatabase: true,
        hasUsers,
        hasTables
      }
    } catch (error) {
      console.error('Setup status check error:', error)
      return {
        needsSetup: true,
        hasDatabase: false,
        hasUsers: false,
        hasTables: false
      }
    }
  }

  initDatabase(): { success: boolean; message: string } {
    try {
      runMigrations(this.db)
      return { success: true, message: 'Veritabani tablolari olusturuldu' }
    } catch (error) {
      console.error('Database init error:', error)
      return {
        success: false,
        message: `Veritabani olusturma hatasi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
      }
    }
  }

  createAdmin(data: AdminData): { success: boolean; message: string } {
    try {
      const now = getCurrentTimestamp()
      const hashedPassword = bcrypt.hashSync(data.password, 10)

      // Check if email already exists
      const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)
      if (existing) {
        return { success: false, message: 'Bu e-posta adresi zaten kullaniliyor' }
      }

      this.db.prepare(`
        INSERT INTO users (name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.name, data.email, hashedPassword, 'admin', 'active', now, now)

      saveDatabase()
      return { success: true, message: 'Yonetici hesabi olusturuldu' }
    } catch (error) {
      console.error('Create admin error:', error)
      return {
        success: false,
        message: `Yonetici olusturma hatasi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
      }
    }
  }

  seedData(options: SeedOptions): { success: boolean; message: string; details: string[] } {
    const details: string[] = []
    let hasError = false

    if (options.categories) {
      try {
        seedEssentialCategories(this.db)
        details.push('Kategoriler eklendi')
      } catch (error) {
        console.error('Category seed error:', error)
        details.push('Kategoriler eklenemedi (hata)')
        hasError = true
      }
    }

    if (options.exchangeRates) {
      try {
        seedExchangeRates(this.db)
        details.push('Doviz kurlari eklendi')
      } catch (error) {
        console.error('Exchange rate seed error:', error)
        details.push('Doviz kurlari eklenemedi (hata)')
        hasError = true
      }
    }

    if (options.demoData) {
      try {
        seedDemoData(this.db)
        details.push('Demo veriler eklendi')
      } catch (error) {
        console.error('Demo data seed error:', error)
        details.push('Demo veriler eklenemedi (hata)')
        hasError = true
      }
    }

    saveDatabase()

    return {
      success: !hasError,
      message: hasError ? 'Bazi veriler eklenirken hata olustu' : 'Veriler basariyla eklendi',
      details
    }
  }
}

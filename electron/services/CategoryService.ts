import Database from 'better-sqlite3'
import { getCurrentTimestamp } from '../database/connection'

interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  parent_id: number | null
  is_active: number
  created_at: string
  updated_at: string
}

export class CategoryService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  getAll(type?: string): Category[] {
    let query = 'SELECT * FROM categories WHERE 1=1'
    const params: string[] = []

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    query += ' ORDER BY type, name'

    return this.db.prepare(query).all(...params) as Category[]
  }

  getActive(type?: string): Category[] {
    let query = 'SELECT * FROM categories WHERE is_active = 1'
    const params: string[] = []

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    query += ' ORDER BY type, name'

    return this.db.prepare(query).all(...params) as Category[]
  }

  getById(id: number): Category | null {
    const category = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined
    return category || null
  }

  create(data: { name: string; type: 'income' | 'expense'; parent_id: number | null; is_active: boolean }): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    try {
      const result = this.db.prepare(`
        INSERT INTO categories (name, type, parent_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.type,
        data.parent_id,
        data.is_active ? 1 : 0,
        now,
        now
      )

      return { success: true, message: 'Kategori başarıyla oluşturuldu.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'Kategori oluşturulamadı.' }
    }
  }

  update(id: number, data: { name: string; type: 'income' | 'expense'; parent_id: number | null; is_active: boolean }): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getById(id)

    if (!existing) {
      return { success: false, message: 'Kategori bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE categories SET name = ?, type = ?, parent_id = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.name,
        data.type,
        data.parent_id,
        data.is_active ? 1 : 0,
        now,
        id
      )

      return { success: true, message: 'Kategori başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Kategori güncellenemedi.' }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    const category = this.getById(id)

    if (!category) {
      return { success: false, message: 'Kategori bulunamadı.' }
    }

    // Check if category has related transactions
    const hasTransactions = this.db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number }

    if (hasTransactions.count > 0) {
      return { success: false, message: 'Bu kategori ile ilişkili işlemler var. Önce bu işlemleri silmeniz veya kategoriyi değiştirmeniz gerekiyor.' }
    }

    // Check if category has children
    const hasChildren = this.db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?').get(id) as { count: number }

    if (hasChildren.count > 0) {
      return { success: false, message: 'Bu kategorinin alt kategorileri var. Önce alt kategorileri silmeniz gerekiyor.' }
    }

    try {
      this.db.prepare('DELETE FROM categories WHERE id = ?').run(id)
      return { success: true, message: 'Kategori başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Kategori silinemedi.' }
    }
  }

  getIncomeCategories(): Category[] {
    return this.getActive('income')
  }

  getExpenseCategories(): Category[] {
    return this.getActive('expense')
  }
}

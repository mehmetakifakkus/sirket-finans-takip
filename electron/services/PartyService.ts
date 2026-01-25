import { DatabaseWrapper, getCurrentTimestamp } from '../database/connection'

interface Party {
  id: number
  type: 'customer' | 'vendor' | 'other'
  name: string
  tax_no: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface PartyFilters {
  type?: 'customer' | 'vendor' | 'other'
  search?: string
}

export class PartyService {
  private db: DatabaseWrapper

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  getAll(filters?: PartyFilters): Party[] {
    let query = 'SELECT * FROM parties WHERE 1=1'
    const params: (string | number)[] = []

    if (filters?.type) {
      query += ' AND type = ?'
      params.push(filters.type)
    }

    if (filters?.search) {
      query += ' AND (name LIKE ? OR tax_no LIKE ? OR email LIKE ?)'
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    query += ' ORDER BY name'

    return this.db.prepare(query).all(...params) as Party[]
  }

  getById(id: number): Party | null {
    const party = this.db.prepare('SELECT * FROM parties WHERE id = ?').get(id) as Party | undefined
    return party || null
  }

  create(data: Omit<Party, 'id' | 'created_at' | 'updated_at'>): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    try {
      const result = this.db.prepare(`
        INSERT INTO parties (type, name, tax_no, phone, email, address, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.type,
        data.name,
        data.tax_no || null,
        data.phone || null,
        data.email || null,
        data.address || null,
        data.notes || null,
        now,
        now
      )

      return { success: true, message: 'Taraf başarıyla oluşturuldu.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'Taraf oluşturulamadı.' }
    }
  }

  update(id: number, data: Partial<Omit<Party, 'id' | 'created_at' | 'updated_at'>>): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getById(id)

    if (!existing) {
      return { success: false, message: 'Taraf bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE parties SET type = ?, name = ?, tax_no = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.type ?? existing.type,
        data.name ?? existing.name,
        data.tax_no ?? existing.tax_no,
        data.phone ?? existing.phone,
        data.email ?? existing.email,
        data.address ?? existing.address,
        data.notes ?? existing.notes,
        now,
        id
      )

      return { success: true, message: 'Taraf başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Taraf güncellenemedi.' }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    const party = this.getById(id)

    if (!party) {
      return { success: false, message: 'Taraf bulunamadı.' }
    }

    // Check if party has related records
    const hasTransactions = this.db.prepare('SELECT COUNT(*) as count FROM transactions WHERE party_id = ?').get(id) as { count: number }
    const hasDebts = this.db.prepare('SELECT COUNT(*) as count FROM debts WHERE party_id = ?').get(id) as { count: number }
    const hasProjects = this.db.prepare('SELECT COUNT(*) as count FROM projects WHERE party_id = ?').get(id) as { count: number }

    if (hasTransactions.count > 0 || hasDebts.count > 0 || hasProjects.count > 0) {
      return { success: false, message: 'Bu taraf ile ilişkili kayıtlar var. Önce bu kayıtları silmeniz gerekiyor.' }
    }

    try {
      this.db.prepare('DELETE FROM parties WHERE id = ?').run(id)
      return { success: true, message: 'Taraf başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Taraf silinemedi.' }
    }
  }

  getCustomers(): Party[] {
    return this.getAll({ type: 'customer' })
  }

  getVendors(): Party[] {
    return this.getAll({ type: 'vendor' })
  }

  merge(sourceId: number, targetId: number): { success: boolean; message: string; recordsMoved?: number } {
    const source = this.getById(sourceId)
    const target = this.getById(targetId)

    if (!source) {
      return { success: false, message: 'Kaynak taraf bulunamadı.' }
    }

    if (!target) {
      return { success: false, message: 'Hedef taraf bulunamadı.' }
    }

    if (sourceId === targetId) {
      return { success: false, message: 'Bir taraf kendisiyle birleştirilemez.' }
    }

    try {
      // Count records to be moved
      const transactionCount = this.db.prepare('SELECT COUNT(*) as count FROM transactions WHERE party_id = ?').get(sourceId) as { count: number }
      const debtCount = this.db.prepare('SELECT COUNT(*) as count FROM debts WHERE party_id = ?').get(sourceId) as { count: number }
      const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects WHERE party_id = ?').get(sourceId) as { count: number }
      const totalMoved = transactionCount.count + debtCount.count + projectCount.count

      // Move all related records to target
      this.db.prepare('UPDATE transactions SET party_id = ? WHERE party_id = ?').run(targetId, sourceId)
      this.db.prepare('UPDATE debts SET party_id = ? WHERE party_id = ?').run(targetId, sourceId)
      this.db.prepare('UPDATE projects SET party_id = ? WHERE party_id = ?').run(targetId, sourceId)

      // Delete the source party
      this.db.prepare('DELETE FROM parties WHERE id = ?').run(sourceId)

      return {
        success: true,
        message: `"${source.name}" tarafı "${target.name}" ile birleştirildi. ${totalMoved} kayıt taşındı.`,
        recordsMoved: totalMoved
      }
    } catch {
      return { success: false, message: 'Taraflar birleştirilemedi.' }
    }
  }
}

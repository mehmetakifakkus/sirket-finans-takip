import Database from 'better-sqlite3'
import { getCurrentTimestamp, formatDate } from '../database/connection'
import { CurrencyService } from './CurrencyService'

interface Debt {
  id: number
  kind: 'debt' | 'receivable'
  party_id: number
  principal_amount: number
  currency: string
  vat_rate: number
  start_date: string | null
  due_date: string | null
  status: 'open' | 'closed'
  notes: string | null
  created_at: string
  updated_at: string
  party_name?: string
  total_paid?: number
  remaining_amount?: number
  installments?: Installment[]
}

interface Installment {
  id: number
  debt_id: number
  due_date: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'partial'
  paid_amount: number
  notes: string | null
  created_at: string
  updated_at: string
  party_name?: string
  kind?: string
}

interface DebtFilters {
  kind?: 'debt' | 'receivable'
  party_id?: number
  status?: 'open' | 'closed'
}

export class DebtService {
  private db: Database.Database
  private currencyService: CurrencyService

  constructor(db: Database.Database) {
    this.db = db
    this.currencyService = new CurrencyService(db)
  }

  getFiltered(filters?: DebtFilters): Debt[] {
    let query = `
      SELECT d.*, p.name as party_name
      FROM debts d
      LEFT JOIN parties p ON d.party_id = p.id
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (filters?.kind) {
      query += ' AND d.kind = ?'
      params.push(filters.kind)
    }

    if (filters?.party_id) {
      query += ' AND d.party_id = ?'
      params.push(filters.party_id)
    }

    if (filters?.status) {
      query += ' AND d.status = ?'
      params.push(filters.status)
    }

    query += ' ORDER BY d.due_date ASC, d.id DESC'

    const debts = this.db.prepare(query).all(...params) as Debt[]

    return debts.map(debt => {
      const totalPaid = this.calculatePaidAmount(debt.id)
      return {
        ...debt,
        total_paid: totalPaid,
        remaining_amount: debt.principal_amount - totalPaid
      }
    })
  }

  getWithDetails(id: number): Debt | null {
    const query = `
      SELECT d.*, p.name as party_name
      FROM debts d
      LEFT JOIN parties p ON d.party_id = p.id
      WHERE d.id = ?
    `
    const debt = this.db.prepare(query).get(id) as Debt | undefined

    if (!debt) return null

    // Get installments
    const installments = this.db.prepare(`
      SELECT * FROM installments WHERE debt_id = ? ORDER BY due_date
    `).all(id) as Installment[]

    const totalPaid = this.calculatePaidAmount(id)

    return {
      ...debt,
      installments,
      total_paid: totalPaid,
      remaining_amount: debt.principal_amount - totalPaid
    }
  }

  create(data: Partial<Debt>): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    try {
      const result = this.db.prepare(`
        INSERT INTO debts (kind, party_id, principal_amount, currency, vat_rate, start_date, due_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.kind,
        data.party_id,
        data.principal_amount,
        data.currency || 'TRY',
        data.vat_rate || 0,
        data.start_date || null,
        data.due_date || null,
        data.status || 'open',
        data.notes || null,
        now,
        now
      )

      return { success: true, message: 'Borç/Alacak başarıyla oluşturuldu.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'Borç/Alacak oluşturulamadı.' }
    }
  }

  update(id: number, data: Partial<Debt>): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getWithDetails(id)

    if (!existing) {
      return { success: false, message: 'Borç/Alacak bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE debts SET kind = ?, party_id = ?, principal_amount = ?, currency = ?, vat_rate = ?, start_date = ?, due_date = ?, status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.kind ?? existing.kind,
        data.party_id ?? existing.party_id,
        data.principal_amount ?? existing.principal_amount,
        data.currency ?? existing.currency,
        data.vat_rate ?? existing.vat_rate,
        data.start_date ?? existing.start_date,
        data.due_date ?? existing.due_date,
        data.status ?? existing.status,
        data.notes ?? existing.notes,
        now,
        id
      )

      return { success: true, message: 'Borç/Alacak başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Borç/Alacak güncellenemedi.' }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    const debt = this.getWithDetails(id)

    if (!debt) {
      return { success: false, message: 'Borç/Alacak bulunamadı.' }
    }

    try {
      // Delete all installments first (cascade should handle this)
      this.db.prepare('DELETE FROM installments WHERE debt_id = ?').run(id)
      this.db.prepare('DELETE FROM debts WHERE id = ?').run(id)

      return { success: true, message: 'Borç/Alacak başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Borç/Alacak silinemedi.' }
    }
  }

  createInstallments(debtId: number, count: number, startDate?: string): { success: boolean; message: string; created?: number } {
    const debt = this.getWithDetails(debtId)

    if (!debt) {
      return { success: false, message: 'Borç bulunamadı.' }
    }

    const now = getCurrentTimestamp()
    const principal = debt.principal_amount
    const installmentAmount = Math.round((principal / count) * 100) / 100
    const start = startDate || debt.start_date || formatDate(new Date())

    let created = 0
    let total = 0

    for (let i = 0; i < count; i++) {
      // Last installment gets the remainder
      const amount = i === count - 1 ? principal - total : installmentAmount
      total += amount

      const dueDate = new Date(start)
      dueDate.setMonth(dueDate.getMonth() + i)

      try {
        this.db.prepare(`
          INSERT INTO installments (debt_id, due_date, amount, currency, status, paid_amount, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)
        `).run(debtId, formatDate(dueDate), amount, debt.currency, now, now)

        created++
      } catch {
        // Continue with next installment
      }
    }

    return { success: created === count, message: `${created} taksit oluşturuldu.`, created }
  }

  getInstallment(id: number): Installment | null {
    const installment = this.db.prepare(`
      SELECT i.*, d.kind, p.name as party_name
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      LEFT JOIN parties p ON d.party_id = p.id
      WHERE i.id = ?
    `).get(id) as Installment | undefined

    return installment || null
  }

  updateInstallment(id: number, data: Partial<Installment>): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getInstallment(id)

    if (!existing) {
      return { success: false, message: 'Taksit bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE installments SET due_date = ?, amount = ?, status = ?, paid_amount = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.due_date ?? existing.due_date,
        data.amount ?? existing.amount,
        data.status ?? existing.status,
        data.paid_amount ?? existing.paid_amount,
        data.notes ?? existing.notes,
        now,
        id
      )

      return { success: true, message: 'Taksit başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Taksit güncellenemedi.' }
    }
  }

  deleteInstallment(id: number): { success: boolean; message: string } {
    const installment = this.getInstallment(id)

    if (!installment) {
      return { success: false, message: 'Taksit bulunamadı.' }
    }

    try {
      this.db.prepare('DELETE FROM installments WHERE id = ?').run(id)
      return { success: true, message: 'Taksit başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Taksit silinemedi.' }
    }
  }

  addInstallmentPayment(installmentId: number, data: { amount: number; date: string; method: string; notes?: string }): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const installment = this.getInstallment(installmentId)

    if (!installment) {
      return { success: false, message: 'Taksit bulunamadı.' }
    }

    try {
      // Create payment record
      this.db.prepare(`
        INSERT INTO payments (related_type, related_id, date, amount, currency, method, notes, created_at, updated_at)
        VALUES ('installment', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(installmentId, data.date, data.amount, installment.currency, data.method, data.notes || null, now, now)

      // Update installment paid amount
      const newPaidAmount = installment.paid_amount + data.amount
      let newStatus: string = 'partial'

      if (newPaidAmount >= installment.amount) {
        newStatus = 'paid'
      } else if (newPaidAmount > 0) {
        newStatus = 'partial'
      }

      this.db.prepare(`
        UPDATE installments SET paid_amount = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(newPaidAmount, newStatus, now, installmentId)

      return { success: true, message: 'Ödeme başarıyla eklendi.' }
    } catch {
      return { success: false, message: 'Ödeme eklenemedi.' }
    }
  }

  calculatePaidAmount(debtId: number): number {
    const result = this.db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total
      FROM installments WHERE debt_id = ?
    `).get(debtId) as { total: number }

    return result.total
  }

  getUpcomingInstallments(days: number = 30): Installment[] {
    const today = formatDate(new Date())
    const future = new Date()
    future.setDate(future.getDate() + days)

    return this.db.prepare(`
      SELECT i.*, d.kind, p.name as party_name
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      LEFT JOIN parties p ON d.party_id = p.id
      WHERE i.status != 'paid' AND i.due_date >= ? AND i.due_date <= ?
      ORDER BY i.due_date
    `).all(today, formatDate(future)) as Installment[]
  }

  getOverdueInstallments(): Installment[] {
    const today = formatDate(new Date())

    return this.db.prepare(`
      SELECT i.*, d.kind, p.name as party_name
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      LEFT JOIN parties p ON d.party_id = p.id
      WHERE i.status != 'paid' AND i.due_date < ?
      ORDER BY i.due_date
    `).all(today) as Installment[]
  }

  exportToCSV(filters?: DebtFilters): string {
    const debts = this.getFiltered(filters)

    let csv = 'Tip;Taraf;Anapara;Para Birimi;KDV Oranı;Başlangıç;Vade;Durum;Ödenen;Kalan;Notlar\n'

    for (const debt of debts) {
      const kind = debt.kind === 'debt' ? 'Borç' : 'Alacak'
      const status = debt.status === 'open' ? 'Açık' : 'Kapalı'

      csv += `${kind};${debt.party_name || ''};${debt.principal_amount.toFixed(2)};${debt.currency};${debt.vat_rate};${debt.start_date || ''};${debt.due_date || ''};${status};${(debt.total_paid || 0).toFixed(2)};${(debt.remaining_amount || 0).toFixed(2)};${(debt.notes || '').replace(/[;\n\r]/g, ' ')}\n`
    }

    return csv
  }
}

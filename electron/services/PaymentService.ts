import { DatabaseWrapper } from '../database/connection'

interface Payment {
  id: number
  related_type: 'installment' | 'debt' | 'milestone'
  related_id: number
  transaction_id: number | null
  date: string
  amount: number
  currency: string
  method: 'cash' | 'bank' | 'card' | 'other'
  notes: string | null
  created_at: string
  updated_at: string
  party_name?: string
  debt_kind?: string
}

interface PaymentFilters {
  related_type?: string
  date_from?: string
  date_to?: string
}

export class PaymentService {
  private db: DatabaseWrapper

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  getAll(filters?: PaymentFilters): Payment[] {
    let query = `
      SELECT p.*,
        CASE
          WHEN p.related_type = 'installment' THEN pa.name
          WHEN p.related_type = 'debt' THEN pa2.name
          ELSE NULL
        END as party_name,
        CASE
          WHEN p.related_type = 'installment' THEN d.kind
          WHEN p.related_type = 'debt' THEN d2.kind
          ELSE NULL
        END as debt_kind
      FROM payments p
      LEFT JOIN installments i ON p.related_type = 'installment' AND p.related_id = i.id
      LEFT JOIN debts d ON i.debt_id = d.id
      LEFT JOIN parties pa ON d.party_id = pa.id
      LEFT JOIN debts d2 ON p.related_type = 'debt' AND p.related_id = d2.id
      LEFT JOIN parties pa2 ON d2.party_id = pa2.id
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (filters?.related_type) {
      query += ' AND p.related_type = ?'
      params.push(filters.related_type)
    }

    if (filters?.date_from) {
      query += ' AND p.date >= ?'
      params.push(filters.date_from)
    }

    if (filters?.date_to) {
      query += ' AND p.date <= ?'
      params.push(filters.date_to)
    }

    query += ' ORDER BY p.date DESC, p.id DESC'

    return this.db.prepare(query).all(...params) as Payment[]
  }

  getById(id: number): Payment | null {
    const payment = this.db.prepare(`
      SELECT p.*,
        CASE
          WHEN p.related_type = 'installment' THEN pa.name
          WHEN p.related_type = 'debt' THEN pa2.name
          ELSE NULL
        END as party_name,
        CASE
          WHEN p.related_type = 'installment' THEN d.kind
          WHEN p.related_type = 'debt' THEN d2.kind
          ELSE NULL
        END as debt_kind
      FROM payments p
      LEFT JOIN installments i ON p.related_type = 'installment' AND p.related_id = i.id
      LEFT JOIN debts d ON i.debt_id = d.id
      LEFT JOIN parties pa ON d.party_id = pa.id
      LEFT JOIN debts d2 ON p.related_type = 'debt' AND p.related_id = d2.id
      LEFT JOIN parties pa2 ON d2.party_id = pa2.id
      WHERE p.id = ?
    `).get(id) as Payment | undefined

    return payment || null
  }

  delete(id: number): { success: boolean; message: string } {
    const payment = this.getById(id)

    if (!payment) {
      return { success: false, message: 'Ödeme bulunamadı.' }
    }

    try {
      // If payment was for an installment, update the installment paid amount
      if (payment.related_type === 'installment') {
        const installment = this.db.prepare('SELECT * FROM installments WHERE id = ?').get(payment.related_id) as { paid_amount: number; amount: number } | undefined

        if (installment) {
          const newPaidAmount = Math.max(0, installment.paid_amount - payment.amount)
          let newStatus = 'pending'

          if (newPaidAmount >= installment.amount) {
            newStatus = 'paid'
          } else if (newPaidAmount > 0) {
            newStatus = 'partial'
          }

          this.db.prepare(`
            UPDATE installments SET paid_amount = ?, status = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(newPaidAmount, newStatus, payment.related_id)
        }
      }

      this.db.prepare('DELETE FROM payments WHERE id = ?').run(id)

      return { success: true, message: 'Ödeme başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Ödeme silinemedi.' }
    }
  }

  getMethodName(method: string): string {
    const methods: Record<string, string> = {
      cash: 'Nakit',
      bank: 'Banka Transferi',
      card: 'Kredi Kartı',
      other: 'Diğer'
    }
    return methods[method] || method
  }
}

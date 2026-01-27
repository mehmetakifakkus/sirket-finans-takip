import type { Database } from 'better-sqlite3'

interface TransactionTemplate {
  id: number
  name: string
  type: 'income' | 'expense'
  category_id: number | null
  party_id: number | null
  amount: number | null
  currency: string
  vat_rate: number
  withholding_rate: number
  description: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_date: string | null
  is_active: number
  created_by: number | null
  created_at: string
  updated_at: string
  // Joined fields
  category_name?: string
  party_name?: string
}

interface CreateTemplateData {
  name: string
  type: 'income' | 'expense'
  category_id?: number | null
  party_id?: number | null
  amount?: number | null
  currency?: string
  vat_rate?: number
  withholding_rate?: number
  description?: string | null
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_date?: string | null
  is_active?: number
  created_by?: number | null
}

interface UpdateTemplateData extends Partial<CreateTemplateData> {}

export class TemplateService {
  constructor(private db: Database) {}

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  getAll(filters?: { type?: string; is_active?: number }): TransactionTemplate[] {
    let sql = `
      SELECT t.*,
        c.name as category_name,
        p.name as party_name
      FROM transaction_templates t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (filters?.type) {
      sql += ' AND t.type = ?'
      params.push(filters.type)
    }

    if (filters?.is_active !== undefined) {
      sql += ' AND t.is_active = ?'
      params.push(filters.is_active)
    }

    sql += ' ORDER BY t.name ASC'

    return this.db.prepare(sql).all(...params) as TransactionTemplate[]
  }

  getById(id: number): TransactionTemplate | null {
    const sql = `
      SELECT t.*,
        c.name as category_name,
        p.name as party_name
      FROM transaction_templates t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.id = ?
    `
    return this.db.prepare(sql).get(id) as TransactionTemplate | null
  }

  create(data: CreateTemplateData): { success: boolean; message: string; id?: number } {
    try {
      const now = new Date().toISOString()

      const result = this.db.prepare(`
        INSERT INTO transaction_templates
        (name, type, category_id, party_id, amount, currency, vat_rate, withholding_rate,
         description, recurrence, next_date, is_active, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.type,
        data.category_id || null,
        data.party_id || null,
        data.amount ?? null,
        data.currency || 'TRY',
        data.vat_rate || 0,
        data.withholding_rate || 0,
        data.description || null,
        data.recurrence || 'none',
        data.next_date || null,
        data.is_active ?? 1,
        data.created_by || null,
        now,
        now
      )

      return { success: true, message: 'Template created', id: result.lastInsertRowid as number }
    } catch (error) {
      console.error('Error creating template:', error)
      return { success: false, message: (error as Error).message }
    }
  }

  update(id: number, data: UpdateTemplateData): { success: boolean; message: string } {
    try {
      const template = this.getById(id)
      if (!template) {
        return { success: false, message: 'Template not found' }
      }

      const now = new Date().toISOString()

      this.db.prepare(`
        UPDATE transaction_templates
        SET name = ?,
            type = ?,
            category_id = ?,
            party_id = ?,
            amount = ?,
            currency = ?,
            vat_rate = ?,
            withholding_rate = ?,
            description = ?,
            recurrence = ?,
            next_date = ?,
            is_active = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        data.name ?? template.name,
        data.type ?? template.type,
        data.category_id !== undefined ? data.category_id : template.category_id,
        data.party_id !== undefined ? data.party_id : template.party_id,
        data.amount !== undefined ? data.amount : template.amount,
        data.currency ?? template.currency,
        data.vat_rate ?? template.vat_rate,
        data.withholding_rate ?? template.withholding_rate,
        data.description !== undefined ? data.description : template.description,
        data.recurrence ?? template.recurrence,
        data.next_date !== undefined ? data.next_date : template.next_date,
        data.is_active ?? template.is_active,
        now,
        id
      )

      return { success: true, message: 'Template updated' }
    } catch (error) {
      console.error('Error updating template:', error)
      return { success: false, message: (error as Error).message }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    try {
      this.db.prepare('DELETE FROM transaction_templates WHERE id = ?').run(id)
      return { success: true, message: 'Template deleted' }
    } catch (error) {
      console.error('Error deleting template:', error)
      return { success: false, message: (error as Error).message }
    }
  }

  createTransactionFromTemplate(
    templateId: number,
    date: string,
    userId: number,
    overrides?: {
      amount?: number
      description?: string
      project_id?: number
    }
  ): { success: boolean; message: string; id?: number } {
    try {
      const template = this.getById(templateId)
      if (!template) {
        return { success: false, message: 'Template not found' }
      }

      const amount = overrides?.amount ?? template.amount ?? 0
      const vatAmount = amount * (template.vat_rate / 100)
      const withholdingAmount = amount * (template.withholding_rate / 100)
      const netAmount = template.type === 'income'
        ? amount + vatAmount - withholdingAmount
        : amount + vatAmount

      const now = new Date().toISOString()

      const result = this.db.prepare(`
        INSERT INTO transactions
        (type, party_id, category_id, project_id, date, amount, currency,
         vat_rate, vat_amount, withholding_rate, withholding_amount, net_amount,
         description, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        template.type,
        template.party_id,
        template.category_id,
        overrides?.project_id || null,
        date,
        amount,
        template.currency,
        template.vat_rate,
        vatAmount,
        template.withholding_rate,
        withholdingAmount,
        netAmount,
        overrides?.description ?? template.description,
        userId,
        now,
        now
      )

      // If template has recurrence, update next_date
      if (template.recurrence !== 'none' && template.next_date) {
        const nextDate = this.calculateNextDate(template.next_date, template.recurrence)
        this.db.prepare('UPDATE transaction_templates SET next_date = ?, updated_at = ? WHERE id = ?')
          .run(nextDate, now, templateId)
      }

      return { success: true, message: 'Transaction created from template', id: result.lastInsertRowid as number }
    } catch (error) {
      console.error('Error creating transaction from template:', error)
      return { success: false, message: (error as Error).message }
    }
  }

  private calculateNextDate(currentDate: string, recurrence: string): string {
    const date = new Date(currentDate)

    switch (recurrence) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
    }

    return this.formatDate(date)
  }

  getDueTemplates(): TransactionTemplate[] {
    const today = this.formatDate(new Date())

    return this.db.prepare(`
      SELECT t.*,
        c.name as category_name,
        p.name as party_name
      FROM transaction_templates t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.is_active = 1
        AND t.recurrence != 'none'
        AND t.next_date IS NOT NULL
        AND t.next_date <= ?
      ORDER BY t.next_date ASC
    `).all(today) as TransactionTemplate[]
  }
}

import { DatabaseWrapper, getCurrentTimestamp } from '../database/connection'
import { CurrencyService } from './CurrencyService'

interface Transaction {
  id: number
  type: 'income' | 'expense'
  party_id: number | null
  category_id: number | null
  project_id: number | null
  milestone_id: number | null
  date: string
  amount: number
  currency: string
  vat_rate: number
  vat_amount: number
  withholding_rate: number
  withholding_amount: number
  net_amount: number
  description: string | null
  ref_no: string | null
  document_path: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  // Joined fields
  party_name?: string
  category_name?: string
  project_title?: string
  milestone_title?: string
  created_by_name?: string
  amount_try?: number
  document_count?: number
}

interface TransactionFilters {
  type?: 'income' | 'expense'
  party_id?: number
  category_id?: number
  project_id?: number
  date_from?: string
  date_to?: string
  currency?: string
}

export class TransactionService {
  private db: DatabaseWrapper
  private currencyService: CurrencyService

  constructor(db: DatabaseWrapper) {
    this.db = db
    this.currencyService = new CurrencyService(db)
  }

  getFiltered(filters?: TransactionFilters): Transaction[] {
    let query = `
      SELECT t.*,
        p.name as party_name,
        c.name as category_name,
        pr.title as project_title,
        m.title as milestone_title,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM transaction_documents td WHERE td.transaction_id = t.id) as document_count
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN projects pr ON t.project_id = pr.id
      LEFT JOIN project_milestones m ON t.milestone_id = m.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (filters?.type) {
      query += ' AND t.type = ?'
      params.push(filters.type)
    }

    if (filters?.party_id) {
      query += ' AND t.party_id = ?'
      params.push(filters.party_id)
    }

    if (filters?.category_id) {
      query += ' AND t.category_id = ?'
      params.push(filters.category_id)
    }

    if (filters?.project_id) {
      query += ' AND t.project_id = ?'
      params.push(filters.project_id)
    }

    if (filters?.date_from) {
      query += ' AND t.date >= ?'
      params.push(filters.date_from)
    }

    if (filters?.date_to) {
      query += ' AND t.date <= ?'
      params.push(filters.date_to)
    }

    if (filters?.currency) {
      query += ' AND t.currency = ?'
      params.push(filters.currency)
    }

    query += ' ORDER BY t.date DESC, t.id DESC'

    const transactions = this.db.prepare(query).all(...params) as Transaction[]

    // Add TRY equivalents
    return transactions.map(t => {
      const conversion = this.currencyService.convertToTRY(t.net_amount, t.currency, t.date)
      return { ...t, amount_try: conversion.amount_try }
    })
  }

  getById(id: number): Transaction | null {
    const query = `
      SELECT t.*,
        p.name as party_name,
        c.name as category_name,
        pr.title as project_title,
        m.title as milestone_title,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM transaction_documents td WHERE td.transaction_id = t.id) as document_count
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN projects pr ON t.project_id = pr.id
      LEFT JOIN project_milestones m ON t.milestone_id = m.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `
    const transaction = this.db.prepare(query).get(id) as Transaction | undefined

    if (transaction) {
      const conversion = this.currencyService.convertToTRY(transaction.net_amount, transaction.currency, transaction.date)
      return { ...transaction, amount_try: conversion.amount_try }
    }

    return null
  }

  create(data: Partial<Transaction>): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    // Calculate VAT, withholding, and net amounts
    const calculations = this.calculateAmounts(
      data.amount || 0,
      data.vat_rate || 0,
      data.withholding_rate || 0,
      data.type || 'income'
    )

    try {
      const result = this.db.prepare(`
        INSERT INTO transactions (
          type, party_id, category_id, project_id, milestone_id, date, amount, currency,
          vat_rate, vat_amount, withholding_rate, withholding_amount, net_amount,
          description, ref_no, document_path, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.type,
        data.party_id || null,
        data.category_id || null,
        data.project_id || null,
        data.milestone_id || null,
        data.date,
        data.amount,
        data.currency || 'TRY',
        data.vat_rate || 0,
        calculations.vat_amount,
        data.withholding_rate || 0,
        calculations.withholding_amount,
        calculations.net_amount,
        data.description || null,
        data.ref_no || null,
        data.document_path || null,
        data.created_by || null,
        now,
        now
      )

      return { success: true, message: 'İşlem başarıyla oluşturuldu.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'İşlem oluşturulamadı.' }
    }
  }

  update(id: number, data: Partial<Transaction>): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getById(id)

    if (!existing) {
      return { success: false, message: 'İşlem bulunamadı.' }
    }

    const calculations = this.calculateAmounts(
      data.amount ?? existing.amount,
      data.vat_rate ?? existing.vat_rate,
      data.withholding_rate ?? existing.withholding_rate,
      data.type ?? existing.type
    )

    try {
      this.db.prepare(`
        UPDATE transactions SET
          type = ?, party_id = ?, category_id = ?, project_id = ?, milestone_id = ?,
          date = ?, amount = ?, currency = ?, vat_rate = ?, vat_amount = ?,
          withholding_rate = ?, withholding_amount = ?, net_amount = ?,
          description = ?, ref_no = ?, document_path = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.type ?? existing.type,
        data.party_id ?? existing.party_id,
        data.category_id ?? existing.category_id,
        data.project_id ?? existing.project_id,
        data.milestone_id ?? existing.milestone_id,
        data.date ?? existing.date,
        data.amount ?? existing.amount,
        data.currency ?? existing.currency,
        data.vat_rate ?? existing.vat_rate,
        calculations.vat_amount,
        data.withholding_rate ?? existing.withholding_rate,
        calculations.withholding_amount,
        calculations.net_amount,
        data.description ?? existing.description,
        data.ref_no ?? existing.ref_no,
        data.document_path ?? existing.document_path,
        now,
        id
      )

      return { success: true, message: 'İşlem başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'İşlem güncellenemedi.' }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    const transaction = this.getById(id)

    if (!transaction) {
      return { success: false, message: 'İşlem bulunamadı.' }
    }

    try {
      this.db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
      return { success: true, message: 'İşlem başarıyla silindi.' }
    } catch {
      return { success: false, message: 'İşlem silinemedi.' }
    }
  }

  getRecent(limit: number = 10): Transaction[] {
    return this.getFiltered().slice(0, limit)
  }

  calculateAmounts(amount: number, vatRate: number, withholdingRate: number, type: string): { vat_amount: number; withholding_amount: number; net_amount: number } {
    const vatAmount = (amount * vatRate) / 100
    const withholdingAmount = type === 'income' ? (amount * withholdingRate) / 100 : 0

    let netAmount: number
    if (type === 'income') {
      netAmount = amount + vatAmount - withholdingAmount
    } else {
      netAmount = amount + vatAmount
    }

    return {
      vat_amount: Math.round(vatAmount * 100) / 100,
      withholding_amount: Math.round(withholdingAmount * 100) / 100,
      net_amount: Math.round(netAmount * 100) / 100
    }
  }

  exportToCSV(filters?: TransactionFilters): string {
    const transactions = this.getFiltered(filters)

    let csv = 'Tarih;Tip;Kategori;Taraf;Proje;Tutar;Para Birimi;KDV;Stopaj;Net Tutar;TRY Karşılığı;Açıklama;Belge No\n'

    for (const t of transactions) {
      const type = t.type === 'income' ? 'Gelir' : 'Gider'
      csv += `${t.date};${type};${t.category_name || ''};${t.party_name || ''};${t.project_title || ''};${t.amount.toFixed(2)};${t.currency};${t.vat_amount.toFixed(2)};${t.withholding_amount.toFixed(2)};${t.net_amount.toFixed(2)};${(t.amount_try || 0).toFixed(2)};${(t.description || '').replace(/[;\n\r]/g, ' ')};${t.ref_no || ''}\n`
    }

    return csv
  }
}

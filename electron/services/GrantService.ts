import { DatabaseWrapper, getCurrentTimestamp } from '../database/connection'

export interface ProjectGrant {
  id: number
  project_id: number
  provider_name: string
  provider_type: 'tubitak' | 'kosgeb' | 'sponsor' | 'other'
  funding_rate: number | null
  funding_amount: number | null
  vat_excluded: boolean
  approved_amount: number
  received_amount: number
  currency: string
  status: 'pending' | 'approved' | 'partial' | 'received' | 'rejected'
  notes: string | null
  created_at: string
  updated_at: string
}

interface GrantData {
  project_id: number
  provider_name: string
  provider_type: 'tubitak' | 'kosgeb' | 'sponsor' | 'other'
  funding_rate?: number | null
  funding_amount?: number | null
  vat_excluded?: boolean
  approved_amount?: number
  received_amount?: number
  currency?: string
  status?: 'pending' | 'approved' | 'partial' | 'received' | 'rejected'
  notes?: string | null
}

export class GrantService {
  private db: DatabaseWrapper

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  getByProject(projectId: number): ProjectGrant[] {
    const grants = this.db.prepare(`
      SELECT * FROM project_grants
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId) as (ProjectGrant & { vat_excluded: number })[]

    return grants.map(g => ({
      ...g,
      vat_excluded: g.vat_excluded === 1
    }))
  }

  getById(id: number): ProjectGrant | null {
    const grant = this.db.prepare('SELECT * FROM project_grants WHERE id = ?').get(id) as (ProjectGrant & { vat_excluded: number }) | undefined

    if (!grant) return null

    return {
      ...grant,
      vat_excluded: grant.vat_excluded === 1
    }
  }

  create(data: GrantData): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    if (!data.provider_name || data.provider_name.trim() === '') {
      return { success: false, message: 'Sağlayıcı adı zorunludur.' }
    }

    if (!data.project_id) {
      return { success: false, message: 'Proje ID zorunludur.' }
    }

    try {
      const result = this.db.prepare(`
        INSERT INTO project_grants (
          project_id, provider_name, provider_type, funding_rate, funding_amount,
          vat_excluded, approved_amount, received_amount, currency, status, notes,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.project_id,
        data.provider_name.trim(),
        data.provider_type || 'other',
        data.funding_rate ?? null,
        data.funding_amount ?? null,
        data.vat_excluded !== false ? 1 : 0,
        data.approved_amount || 0,
        data.received_amount || 0,
        data.currency || 'TRY',
        data.status || 'pending',
        data.notes || null,
        now,
        now
      )

      return { success: true, message: 'Hibe/destek başarıyla eklendi.', id: Number(result.lastInsertRowid) }
    } catch (error: unknown) {
      console.error('Grant create error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
      return { success: false, message: `Hibe/destek eklenemedi: ${errorMessage}` }
    }
  }

  update(id: number, data: Partial<GrantData>): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getById(id)

    if (!existing) {
      return { success: false, message: 'Hibe/destek bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE project_grants SET
          provider_name = ?,
          provider_type = ?,
          funding_rate = ?,
          funding_amount = ?,
          vat_excluded = ?,
          approved_amount = ?,
          received_amount = ?,
          currency = ?,
          status = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        data.provider_name?.trim() ?? existing.provider_name,
        data.provider_type ?? existing.provider_type,
        data.funding_rate !== undefined ? data.funding_rate : existing.funding_rate,
        data.funding_amount !== undefined ? data.funding_amount : existing.funding_amount,
        data.vat_excluded !== undefined ? (data.vat_excluded ? 1 : 0) : (existing.vat_excluded ? 1 : 0),
        data.approved_amount ?? existing.approved_amount,
        data.received_amount ?? existing.received_amount,
        data.currency ?? existing.currency,
        data.status ?? existing.status,
        data.notes !== undefined ? data.notes : existing.notes,
        now,
        id
      )

      return { success: true, message: 'Hibe/destek başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Hibe/destek güncellenemedi.' }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    const grant = this.getById(id)

    if (!grant) {
      return { success: false, message: 'Hibe/destek bulunamadı.' }
    }

    try {
      this.db.prepare('DELETE FROM project_grants WHERE id = ?').run(id)
      return { success: true, message: 'Hibe/destek başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Hibe/destek silinemedi.' }
    }
  }

  calculateGrantAmount(projectId: number, rate: number, vatExcluded: boolean): number {
    const project = this.db.prepare('SELECT contract_amount FROM projects WHERE id = ?').get(projectId) as { contract_amount: number } | undefined

    if (!project) return 0

    let baseAmount = project.contract_amount

    // If VAT excluded, we assume contract_amount includes 20% VAT, so we calculate the base
    if (vatExcluded) {
      // contract_amount = base + (base * 0.20) = base * 1.20
      // base = contract_amount / 1.20
      baseAmount = project.contract_amount / 1.20
    }

    return Math.round(baseAmount * (rate / 100) * 100) / 100
  }

  getProjectGrantTotals(projectId: number): { total_approved: number; total_received: number } {
    const result = this.db.prepare(`
      SELECT
        COALESCE(SUM(approved_amount), 0) as total_approved,
        COALESCE(SUM(received_amount), 0) as total_received
      FROM project_grants
      WHERE project_id = ?
    `).get(projectId) as { total_approved: number; total_received: number }

    return result
  }
}

import { DatabaseWrapper, getCurrentTimestamp } from '../database/connection'
import { CurrencyService } from './CurrencyService'

interface Project {
  id: number
  party_id: number
  title: string
  contract_amount: number
  currency: string
  start_date: string | null
  end_date: string | null
  status: 'active' | 'completed' | 'cancelled' | 'on_hold'
  notes: string | null
  created_at: string
  updated_at: string
  party_name?: string
  collected_amount?: number
  remaining_amount?: number
  percentage?: number
  milestones?: Milestone[]
}

interface Milestone {
  id: number
  project_id: number
  title: string
  expected_date: string | null
  expected_amount: number
  currency: string
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

interface ProjectFilters {
  party_id?: number
  status?: string
}

export class ProjectService {
  private db: DatabaseWrapper
  private currencyService: CurrencyService

  constructor(db: DatabaseWrapper) {
    this.db = db
    this.currencyService = new CurrencyService(db)
  }

  getAll(filters?: ProjectFilters): Project[] {
    let query = `
      SELECT p.*, pa.name as party_name
      FROM projects p
      LEFT JOIN parties pa ON p.party_id = pa.id
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (filters?.party_id) {
      query += ' AND p.party_id = ?'
      params.push(filters.party_id)
    }

    if (filters?.status) {
      query += ' AND p.status = ?'
      params.push(filters.status)
    }

    query += " ORDER BY (p.status = 'active') DESC, p.end_date, p.title"

    const projects = this.db.prepare(query).all(...params) as Project[]

    return projects.map(project => {
      const balance = this.calculateBalance(project.id)
      return {
        ...project,
        collected_amount: balance.collected_amount,
        remaining_amount: balance.remaining_amount,
        percentage: balance.percentage
      }
    })
  }

  getWithDetails(id: number): Project | null {
    const query = `
      SELECT p.*, pa.name as party_name
      FROM projects p
      LEFT JOIN parties pa ON p.party_id = pa.id
      WHERE p.id = ?
    `
    const project = this.db.prepare(query).get(id) as Project | undefined

    if (!project) return null

    const milestones = this.db.prepare(`
      SELECT * FROM project_milestones WHERE project_id = ? ORDER BY expected_date
    `).all(id) as Milestone[]

    const balance = this.calculateBalance(id)

    return {
      ...project,
      milestones,
      collected_amount: balance.collected_amount,
      remaining_amount: balance.remaining_amount,
      percentage: balance.percentage
    }
  }

  create(data: Partial<Project>): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    try {
      const result = this.db.prepare(`
        INSERT INTO projects (party_id, title, contract_amount, currency, start_date, end_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.party_id,
        data.title,
        data.contract_amount || 0,
        data.currency || 'TRY',
        data.start_date || null,
        data.end_date || null,
        data.status || 'active',
        data.notes || null,
        now,
        now
      )

      return { success: true, message: 'Proje başarıyla oluşturuldu.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'Proje oluşturulamadı.' }
    }
  }

  update(id: number, data: Partial<Project>): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getWithDetails(id)

    if (!existing) {
      return { success: false, message: 'Proje bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE projects SET party_id = ?, title = ?, contract_amount = ?, currency = ?, start_date = ?, end_date = ?, status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.party_id ?? existing.party_id,
        data.title ?? existing.title,
        data.contract_amount ?? existing.contract_amount,
        data.currency ?? existing.currency,
        data.start_date ?? existing.start_date,
        data.end_date ?? existing.end_date,
        data.status ?? existing.status,
        data.notes ?? existing.notes,
        now,
        id
      )

      return { success: true, message: 'Proje başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Proje güncellenemedi.' }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    const project = this.getWithDetails(id)

    if (!project) {
      return { success: false, message: 'Proje bulunamadı.' }
    }

    try {
      // Delete all milestones first
      this.db.prepare('DELETE FROM project_milestones WHERE project_id = ?').run(id)
      this.db.prepare('DELETE FROM projects WHERE id = ?').run(id)

      return { success: true, message: 'Proje başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Proje silinemedi.' }
    }
  }

  getMilestone(id: number): Milestone | null {
    const milestone = this.db.prepare('SELECT * FROM project_milestones WHERE id = ?').get(id) as Milestone | undefined
    return milestone || null
  }

  createMilestone(data: Partial<Milestone>): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    try {
      const result = this.db.prepare(`
        INSERT INTO project_milestones (project_id, title, expected_date, expected_amount, currency, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.project_id,
        data.title,
        data.expected_date || null,
        data.expected_amount || 0,
        data.currency || 'TRY',
        data.status || 'pending',
        data.notes || null,
        now,
        now
      )

      return { success: true, message: 'Aşama başarıyla oluşturuldu.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'Aşama oluşturulamadı.' }
    }
  }

  updateMilestone(id: number, data: Partial<Milestone>): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const existing = this.getMilestone(id)

    if (!existing) {
      return { success: false, message: 'Aşama bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE project_milestones SET title = ?, expected_date = ?, expected_amount = ?, currency = ?, status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        data.title ?? existing.title,
        data.expected_date ?? existing.expected_date,
        data.expected_amount ?? existing.expected_amount,
        data.currency ?? existing.currency,
        data.status ?? existing.status,
        data.notes ?? existing.notes,
        now,
        id
      )

      return { success: true, message: 'Aşama başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Aşama güncellenemedi.' }
    }
  }

  deleteMilestone(id: number): { success: boolean; message: string } {
    const milestone = this.getMilestone(id)

    if (!milestone) {
      return { success: false, message: 'Aşama bulunamadı.' }
    }

    try {
      this.db.prepare('DELETE FROM project_milestones WHERE id = ?').run(id)
      return { success: true, message: 'Aşama başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Aşama silinemedi.' }
    }
  }

  calculateBalance(projectId: number): { collected_amount: number; remaining_amount: number; percentage: number; contract_amount: number } {
    const project = this.db.prepare('SELECT contract_amount, currency FROM projects WHERE id = ?').get(projectId) as { contract_amount: number; currency: string } | undefined

    if (!project) {
      return { collected_amount: 0, remaining_amount: 0, percentage: 0, contract_amount: 0 }
    }

    // Calculate collected amount from income transactions linked to this project
    const collected = this.db.prepare(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM transactions
      WHERE project_id = ? AND type = 'income'
    `).get(projectId) as { total: number }

    const collectedAmount = collected.total
    const remainingAmount = project.contract_amount - collectedAmount
    const percentage = project.contract_amount > 0
      ? Math.round((collectedAmount / project.contract_amount) * 10000) / 100
      : 0

    return {
      collected_amount: collectedAmount,
      remaining_amount: remainingAmount,
      percentage,
      contract_amount: project.contract_amount
    }
  }

  getActiveProjects(): Project[] {
    return this.getAll({ status: 'active' })
  }

  getIncompleteProjectsCount(): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM projects
      WHERE status = 'active'
      AND (contract_amount = 0 OR contract_amount IS NULL
           OR start_date IS NULL OR end_date IS NULL)
    `).get() as { count: number }
    return result.count
  }
}

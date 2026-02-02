/**
 * HTTP Client for Web Browser
 * Uses fetch() to communicate with PHP API backend
 */

import type { IApiClient } from './types'

// Use relative URL for Vite proxy in development, or full URL in production
const API_URL = import.meta.env.VITE_API_URL || '/api'

class HttpClient implements IApiClient {
  private token: string | null = null

  constructor() {
    // Restore token from localStorage
    this.token = localStorage.getItem('auth_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Always read token from localStorage to ensure it's fresh
    const token = this.token || localStorage.getItem('auth_token')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  private buildQueryString(params?: object): string {
    if (!params) return ''
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value))
      }
    }
    const str = query.toString()
    return str ? `?${str}` : ''
  }

  // Auth
  login = async (email: string, password: string) => {
    const result = await this.request<{ success: boolean; message: string; token?: string; user?: object }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    )
    if (result.token) {
      this.token = result.token
      localStorage.setItem('auth_token', result.token)
    }
    return result
  }

  logout = async () => {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } finally {
      this.token = null
      localStorage.removeItem('auth_token')
    }
  }

  getCurrentUser = () => this.request('/auth/me')

  // Transactions
  getTransactions = async (filters?: object) => {
    const result = await this.request<{ transactions: object[]; totals?: { income: number; expense: number; balance: number } }>(`/transactions${this.buildQueryString(filters)}`)
    return { transactions: result.transactions || [], totals: result.totals }
  }
  getTransaction = (id: number) => this.request<object | null>(`/transactions/${id}`)
  getTransactionsByProject = async (projectId: number) => {
    const result = await this.request<{ transactions: object[] }>(`/transactions?project_id=${projectId}`)
    return result.transactions || []
  }
  createTransaction = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateTransaction = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteTransaction = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    })
  exportTransactions = async (filters?: object) => {
    const query = this.buildQueryString(filters)
    window.open(`${API_URL}/transactions/export/csv${query}`, '_blank')
    return { success: true, path: '' }
  }
  getUnassignedTransactions = async (filters?: object) => {
    const result = await this.request<{ transactions: object[] }>(`/transactions/unassigned${this.buildQueryString(filters)}`)
    return result.transactions || []
  }
  assignTransactionsToProject = (transactionIds: number[], projectId: number) =>
    this.request<{ success: boolean; message: string; count: number }>('/transactions/assign', {
      method: 'POST',
      body: JSON.stringify({ transactionIds, projectId }),
    })

  // Debts
  getDebts = async (filters?: object) => {
    const result = await this.request<{ debts: object[] }>(`/debts${this.buildQueryString(filters)}`)
    return result.debts || []
  }
  getDebt = (id: number) => this.request<object | null>(`/debts/${id}`)
  createDebt = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateDebt = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteDebt = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/debts/${id}`, { method: 'DELETE' })
  createInstallments = (debtId: number, count: number, startDate?: string) =>
    this.request<{ success: boolean; message: string }>(`/debts/${debtId}/installments`, {
      method: 'POST',
      body: JSON.stringify({ count, start_date: startDate || new Date().toISOString().split('T')[0] }),
    })
  exportDebts = async (filters?: object) => {
    const query = this.buildQueryString(filters)
    window.open(`${API_URL}/debts/export/csv${query}`, '_blank')
    return { success: true, path: '' }
  }

  // Installments
  getInstallment = (id: number) => this.request<object | null>(`/installments/${id}`)
  updateInstallment = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/installments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteInstallment = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/installments/${id}`, {
      method: 'DELETE',
    })
  addInstallmentPayment = (installmentId: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/installments/${installmentId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  addDebtPayment = (debtId: number, data: { amount: number; date?: string; method?: string; notes?: string }) =>
    this.request<{ success: boolean; message: string }>(`/debts/${debtId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    })

  // Parties
  getParties = async (filters?: object) => {
    const result = await this.request<{ parties: object[] }>(`/parties${this.buildQueryString(filters)}`)
    return result.parties || []
  }
  getParty = (id: number) => this.request<object | null>(`/parties/${id}`)
  createParty = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateParty = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/parties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteParty = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/parties/${id}`, { method: 'DELETE' })
  mergeParties = (sourceId: number, targetId: number) =>
    this.request<{ success: boolean; message: string; recordsMoved?: number }>(
      `/parties/${sourceId}/merge/${targetId}`,
      { method: 'POST' }
    )

  // Categories
  getCategories = async (type?: string) => {
    const result = await this.request<{ categories: object[] }>(`/categories${type ? `?type=${type}` : ''}`)
    return result.categories || []
  }
  getCategory = (id: number) => this.request<object | null>(`/categories/${id}`)
  createCategory = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateCategory = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteCategory = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/categories/${id}`, { method: 'DELETE' })
  mergeCategories = (sourceId: number, targetId: number) =>
    this.request<{ success: boolean; message: string; transactionsMoved?: number }>(
      `/categories/${sourceId}/merge/${targetId}`,
      { method: 'POST' }
    )

  // Projects
  getProjects = async (filters?: object) => {
    const result = await this.request<{ projects: object[] }>(`/projects${this.buildQueryString(filters)}`)
    return result.projects || []
  }
  getProject = async (id: number) => {
    const result = await this.request<{ project: object | null }>(`/projects/${id}`)
    return result.project || null
  }
  createProject = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateProject = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteProject = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/projects/${id}`, { method: 'DELETE' })
  getIncompleteProjectsCount = async () => {
    const result = await this.request<{ count: number }>('/projects/incomplete-count')
    return result.count
  }

  // Milestones
  getMilestone = (id: number) => this.request<object | null>(`/milestones/${id}`)
  createMilestone = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/milestones', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateMilestone = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/milestones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteMilestone = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/milestones/${id}`, { method: 'DELETE' })

  // Grants
  getProjectGrants = async (projectId: number) => {
    const result = await this.request<{ grants: object[] }>(`/grants?project_id=${projectId}`)
    return result.grants || []
  }
  getGrant = (id: number) => this.request<object | null>(`/grants/${id}`)
  createGrant = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/grants', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateGrant = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/grants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteGrant = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/grants/${id}`, { method: 'DELETE' })
  calculateGrantAmount = async (projectId: number, rate: number, vatExcluded: boolean) => {
    const result = await this.request<{ amount: number }>(
      `/grants/calculate`,
      {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, rate, vat_excluded: vatExcluded })
      }
    )
    return result.amount
  }
  getGrantTotals = (projectId: number) =>
    this.request<{ total_approved: number; total_received: number }>(
      `/grants/totals?projectId=${projectId}`
    )

  // Payments
  getPayments = async (filters?: object) => {
    const result = await this.request<{ payments: object[] }>(`/payments${this.buildQueryString(filters)}`)
    return result.payments || []
  }
  deletePayment = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/payments/${id}`, { method: 'DELETE' })

  // Exchange Rates
  getExchangeRates = async () => {
    const result = await this.request<{ rates: object[] }>('/exchange-rates')
    return result.rates || []
  }
  getExchangeRate = (id: number) => this.request<object | null>(`/exchange-rates/${id}`)
  createExchangeRate = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/exchange-rates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateExchangeRate = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/exchange-rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteExchangeRate = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/exchange-rates/${id}`, {
      method: 'DELETE',
    })
  fetchTCMBRates = () =>
    this.request<{ success: boolean; message: string; rates?: object }>('/exchange-rates/fetch-tcmb', {
      method: 'POST',
    })
  fetchGoldPrice = () =>
    this.request<{ success: boolean; message: string; rate?: number; date?: string }>(
      '/exchange-rates/fetch-gold',
      { method: 'POST' }
    )
  getLatestRates = async () => {
    const result = await this.request<{ rates: Record<string, { rate: number; rate_date: string; date?: string }> }>('/exchange-rates/latest')
    return result.rates || {}
  }

  // Users
  getUsers = async () => {
    const result = await this.request<{ users: object[] }>('/users')
    return result.users || []
  }
  getUser = (id: number) => this.request<object | null>(`/users/${id}`)
  createUser = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateUser = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteUser = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/users/${id}`, { method: 'DELETE' })

  // Reports
  getDashboardData = () => this.request<object>('/reports/dashboard')
  getReportSummary = (filters?: object) =>
    this.request<object>(`/reports/summary${this.buildQueryString(filters)}`)
  getTransactionReport = (filters?: object) =>
    this.request<object[]>(`/reports/transactions${this.buildQueryString(filters)}`)
  getDebtReport = (filters?: object) =>
    this.request<object[]>(`/reports/debts${this.buildQueryString(filters)}`)
  getProjectReport = (filters?: object) =>
    this.request<object[]>(`/reports/projects${this.buildQueryString(filters)}`)
  exportReport = async (type: string, filters?: object) => {
    const query = this.buildQueryString(filters)
    window.open(`${API_URL}/reports/export/${type}${query}`, '_blank')
    return { success: true, message: 'Export started', path: '' }
  }

  // Charts
  getMonthlyChartData = async (months?: number) => {
    const result = await this.request<{ data: object[] }>(`/charts/monthly${months !== undefined ? `?months=${months}` : ''}`)
    return result.data || []
  }
  getCategoryChartData = async (type?: string, months?: number, month?: string) => {
    const params = this.buildQueryString({ type, months, month })
    const result = await this.request<{ data: object[] }>(`/charts/category${params}`)
    return result.data || []
  }
  getDebtSummaryChartData = () => this.request<object>('/charts/debt-summary')

  // Notifications - Web browser doesn't have native notifications for installments
  getUpcomingPayments = async (days?: number) => {
    const result = await this.request<{ payments: object[] }>(`/notifications/upcoming${days ? `?days=${days}` : ''}`)
    return result.payments || []
  }
  getOverduePayments = async () => {
    const result = await this.request<{ payments: object[] }>('/notifications/overdue')
    return result.payments || []
  }
  getPaymentSummary = () =>
    this.request<{ overdueCount: number; upcomingCount: number; overdueAmount: number; upcomingAmount: number }>(
      '/notifications/summary'
    )
  checkNotifications = async (_settings: object, _translations: object) => {
    // Web browser notifications are handled differently
    // Just return the data, UI will handle the display
    const [upcoming, overdue] = await Promise.all([
      this.getUpcomingPayments(7),
      this.getOverduePayments()
    ])
    return { upcoming, overdue }
  }

  // Templates
  getTemplates = async (filters?: object) => {
    const result = await this.request<{ templates: object[] }>(`/templates${this.buildQueryString(filters)}`)
    return result.templates || []
  }
  getTemplate = (id: number) => this.request<object | null>(`/templates/${id}`)
  createTemplate = (data: object) =>
    this.request<{ success: boolean; message: string; id?: number }>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  updateTemplate = (id: number, data: object) =>
    this.request<{ success: boolean; message: string }>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  deleteTemplate = (id: number) =>
    this.request<{ success: boolean; message: string }>(`/templates/${id}`, { method: 'DELETE' })
  createTransactionFromTemplate = (templateId: number, date: string, userId: number, overrides?: object) =>
    this.request<{ success: boolean; message: string; id?: number }>(`/templates/${templateId}/create-transaction`, {
      method: 'POST',
      body: JSON.stringify({ date, userId, ...overrides }),
    })
  getDueTemplates = async () => {
    const result = await this.request<{ templates: object[] }>('/templates/due')
    return result.templates || []
  }

  // File operations - Web implementations
  uploadFile = async (_documentPath?: string) => {
    // In web, file uploads happen via input element
    return null
  }

  deleteFile = async (_path: string) => {
    // Handle via documents endpoint
    return true
  }

  openFile = async (path: string) => {
    window.open(`${API_URL}/documents/file/${path}`, '_blank')
    return path
  }

  // Transaction Documents
  addDocument = async (transactionId: number, file?: File) => {
    if (!file) {
      // Trigger file input (handled by component)
      return { success: false, message: 'No file provided' }
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('transaction_id', String(transactionId))

    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    })

    return response.json()
  }

  getDocuments = async (transactionId: number) => {
    const result = await this.request<{ documents: Array<{
      id: number
      transaction_id: number
      filename: string
      original_name: string
      mime_type: string
      file_size: number
      uploaded_at: string
    }> }>(`/documents?transaction_id=${transactionId}`)
    return result.documents || []
  }

  deleteDocument = (documentId: number) =>
    this.request<{ success: boolean; message: string }>(`/documents/${documentId}`, {
      method: 'DELETE',
    })

  openDocument = async (documentId: number | string) => {
    const tokenParam = this.token ? `?token=${this.token}` : ''
    window.open(`${API_URL}/documents/${documentId}/preview${tokenParam}`, '_blank')
    return documentId
  }

  getDocumentCount = async (transactionId: number) => {
    const result = await this.request<number>(`/documents/transaction/${transactionId}/count`)
    return result
  }

  getDocumentPreview = (documentId: number) =>
    this.request<{ success: boolean; data?: string; mimeType?: string; message?: string }>(
      `/documents/${documentId}/data`
    )

  // Dialogs - Web implementations
  confirm = async (message: string, _title?: string) => {
    return window.confirm(message)
  }

  alert = async (message: string, _type?: 'info' | 'warning' | 'error') => {
    window.alert(message)
  }

  // Setup
  checkSetupStatus = async () => {
    try {
      const result = await this.request<{
        success: boolean
        tables_exist: boolean
        has_admin: boolean
        has_categories: boolean
        setup_complete: boolean
      }>('/setup/check')

      return {
        needsSetup: !result.setup_complete,
        hasDatabase: result.tables_exist,
        hasUsers: result.has_admin,
        hasTables: result.tables_exist,
      }
    } catch {
      return {
        needsSetup: true,
        hasDatabase: false,
        hasUsers: false,
        hasTables: false,
      }
    }
  }

  initDatabase = () =>
    this.request<{ success: boolean; message: string }>('/setup/initialize', {
      method: 'POST',
    })

  createAdmin = (data: { name: string; email: string; password: string }) =>
    this.request<{ success: boolean; message: string }>('/setup/create-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  seedData = async (options: { categories: boolean; exchangeRates: boolean; demoData: boolean }) => {
    const details: string[] = []

    if (options.categories) {
      await this.request('/setup/seed-categories', { method: 'POST' })
      details.push('Kategoriler oluşturuldu')
    }
    if (options.exchangeRates) {
      await this.request('/setup/seed-exchange-rates', { method: 'POST' })
      details.push('Döviz kurları oluşturuldu')
    }
    if (options.demoData) {
      await this.request('/setup/seed-demo', { method: 'POST' })
      details.push('Demo veriler oluşturuldu')
    }

    return { success: true, message: 'Veriler oluşturuldu', details }
  }

  clearAllData = async () => {
    const result = await this.request<{ success: boolean; message: string }>('/database/clear', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'CLEAR_ALL_DATA' }),
    })
    return { ...result, details: [] }
  }

  clearTable = async (tableName: string) => {
    return this.request<{
      success: boolean
      message: string
      table: string
      deleted_count: number
    }>(`/database/clear/${tableName}`, {
      method: 'POST',
    })
  }

  // Import - Web implementations
  selectImportFile = async () => {
    // Handled by file input in component
    return { success: false, message: 'Use file input element in browser' }
  }

  parseImportFile = async (_filePath: string) => {
    // Would need FormData with actual file
    return { success: false, message: 'Use the file upload component' }
  }

  executeImport = async (rows: object[], userId: number) => {
    return this.request<{
      success: boolean
      message: string
      imported: number
      failed: number
      categoriesCreated: number
      partiesCreated: number
      errors: string[]
    }>('/import/transactions', {
      method: 'POST',
      body: JSON.stringify({ rows, userId }),
    })
  }

  // Database
  getDatabaseStats = async () => {
    const result = await this.request<{
      success: boolean
      stats: Record<string, { label: string; count: number }>
      database_size?: string
    }>('/database/stats')

    const records: Record<string, number> = {}
    for (const [key, value] of Object.entries(result.stats)) {
      if (typeof value === 'object' && 'count' in value) {
        records[key] = value.count
      }
    }

    return {
      size: result.database_size || 'N/A',
      tables: Object.keys(result.stats).length,
      records,
    }
  }

  exportDatabaseSQL = async () => {
    const token = this.token || localStorage.getItem('auth_token')

    const response = await fetch(`${API_URL}/database/export?format=sql`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Export failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    // Get filename from Content-Disposition header or generate one
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'sirket_finans_export.sql'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
      if (match) filename = match[1]
    }

    // Download as blob
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    return { success: true, message: 'Download started' }
  }

  importDatabaseSQL = async () => {
    return new Promise<{ success: boolean; message: string; details?: string[] }>((resolve) => {
      // Create file input element
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.sql'

      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) {
          resolve({ success: false, message: 'Import cancelled' })
          return
        }

        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch(`${API_URL}/database/restore`, {
            method: 'POST',
            headers: {
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
            body: formData,
          })

          const result = await response.json()
          resolve(result)
        } catch (err) {
          resolve({
            success: false,
            message: err instanceof Error ? err.message : 'Import failed',
          })
        }
      }

      input.oncancel = () => {
        resolve({ success: false, message: 'Import cancelled' })
      }

      input.click()
    })
  }
}

export const httpClient = new HttpClient()

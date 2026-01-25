// HTTP Client for Web environment - communicates with backend API server
import type {
  IApiClient,
  LoginResponse,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
  ExportResponse,
  MergeResponse,
  DocumentInfo,
  DocumentAddResponse,
  DocumentPreviewResponse,
  SetupStatus,
  SeedDataResponse,
  ImportParseResponse,
  ImportExecuteResponse,
  DatabaseStats,
  GrantTotals,
  FetchRatesResponse,
  FetchGoldResponse,
  AssignToProjectResponse,
} from './types'

export class HttpClient implements IApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    this.token = localStorage.getItem('auth_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // Token expired or invalid
      this.token = null
      localStorage.removeItem('auth_token')
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  private get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  private post<T>(endpoint: string, data?: object): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  private put<T>(endpoint: string, data: object): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  private delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    const result = await this.post<LoginResponse>('/api/auth/login', { email, password })
    if (result.success && result.token) {
      this.token = result.token
      localStorage.setItem('auth_token', result.token)
    }
    return result
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout')
    } finally {
      this.token = null
      localStorage.removeItem('auth_token')
    }
  }

  getCurrentUser(): Promise<object | null> {
    return this.get('/api/auth/me')
  }

  // Transactions
  getTransactions(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/transactions${params}`)
  }

  getTransaction(id: number): Promise<object | null> {
    return this.get(`/api/transactions/${id}`)
  }

  getTransactionsByProject(projectId: number): Promise<object[]> {
    return this.get(`/api/transactions/project/${projectId}`)
  }

  createTransaction(data: object): Promise<CreateResponse> {
    return this.post('/api/transactions', data)
  }

  updateTransaction(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/transactions/${id}`, data)
  }

  deleteTransaction(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/transactions/${id}`)
  }

  async exportTransactions(filters?: object): Promise<ExportResponse> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    const response = await fetch(`${this.baseUrl}/api/transactions/export${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    })
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `islemler_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      return { success: true }
    }
    return { success: false, message: 'Export failed' }
  }

  getUnassignedTransactions(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/transactions/unassigned${params}`)
  }

  assignTransactionsToProject(transactionIds: number[], projectId: number): Promise<AssignToProjectResponse> {
    return this.post('/api/transactions/assign-to-project', { transactionIds, projectId })
  }

  // Debts
  getDebts(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/debts${params}`)
  }

  getDebt(id: number): Promise<object | null> {
    return this.get(`/api/debts/${id}`)
  }

  createDebt(data: object): Promise<CreateResponse> {
    return this.post('/api/debts', data)
  }

  updateDebt(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/debts/${id}`, data)
  }

  deleteDebt(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/debts/${id}`)
  }

  createInstallments(debtId: number, count: number, startDate?: string): Promise<UpdateResponse> {
    return this.post(`/api/debts/${debtId}/installments`, { count, startDate })
  }

  async exportDebts(filters?: object): Promise<ExportResponse> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    const response = await fetch(`${this.baseUrl}/api/debts/export${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    })
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `borc_alacak_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      return { success: true }
    }
    return { success: false, message: 'Export failed' }
  }

  // Installments
  getInstallment(id: number): Promise<object | null> {
    return this.get(`/api/installments/${id}`)
  }

  updateInstallment(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/installments/${id}`, data)
  }

  deleteInstallment(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/installments/${id}`)
  }

  addInstallmentPayment(installmentId: number, data: object): Promise<UpdateResponse> {
    return this.post(`/api/installments/${installmentId}/payment`, data)
  }

  // Parties
  getParties(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/parties${params}`)
  }

  getParty(id: number): Promise<object | null> {
    return this.get(`/api/parties/${id}`)
  }

  createParty(data: object): Promise<CreateResponse> {
    return this.post('/api/parties', data)
  }

  updateParty(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/parties/${id}`, data)
  }

  deleteParty(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/parties/${id}`)
  }

  mergeParties(sourceId: number, targetId: number): Promise<MergeResponse> {
    return this.post('/api/parties/merge', { sourceId, targetId })
  }

  // Categories
  getCategories(type?: string): Promise<object[]> {
    const params = type ? `?type=${type}` : ''
    return this.get(`/api/categories${params}`)
  }

  getCategory(id: number): Promise<object | null> {
    return this.get(`/api/categories/${id}`)
  }

  createCategory(data: object): Promise<CreateResponse> {
    return this.post('/api/categories', data)
  }

  updateCategory(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/categories/${id}`, data)
  }

  deleteCategory(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/categories/${id}`)
  }

  mergeCategories(sourceId: number, targetId: number): Promise<MergeResponse> {
    return this.post('/api/categories/merge', { sourceId, targetId })
  }

  // Projects
  getProjects(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/projects${params}`)
  }

  getProject(id: number): Promise<object | null> {
    return this.get(`/api/projects/${id}`)
  }

  createProject(data: object): Promise<CreateResponse> {
    return this.post('/api/projects', data)
  }

  updateProject(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/projects/${id}`, data)
  }

  deleteProject(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/projects/${id}`)
  }

  getIncompleteProjectsCount(): Promise<number> {
    return this.get('/api/projects/incomplete-count')
  }

  // Milestones
  getMilestone(id: number): Promise<object | null> {
    return this.get(`/api/milestones/${id}`)
  }

  createMilestone(data: object): Promise<CreateResponse> {
    return this.post('/api/milestones', data)
  }

  updateMilestone(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/milestones/${id}`, data)
  }

  deleteMilestone(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/milestones/${id}`)
  }

  // Grants
  getProjectGrants(projectId: number): Promise<object[]> {
    return this.get(`/api/projects/${projectId}/grants`)
  }

  getGrant(id: number): Promise<object | null> {
    return this.get(`/api/grants/${id}`)
  }

  createGrant(data: object): Promise<CreateResponse> {
    return this.post('/api/grants', data)
  }

  updateGrant(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/grants/${id}`, data)
  }

  deleteGrant(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/grants/${id}`)
  }

  calculateGrantAmount(projectId: number, rate: number, vatExcluded: boolean): Promise<number> {
    return this.post(`/api/grants/calculate`, { projectId, rate, vatExcluded })
  }

  getGrantTotals(projectId: number): Promise<GrantTotals> {
    return this.get(`/api/projects/${projectId}/grants/totals`)
  }

  // Payments
  getPayments(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/payments${params}`)
  }

  deletePayment(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/payments/${id}`)
  }

  // Exchange Rates
  getExchangeRates(): Promise<object[]> {
    return this.get('/api/exchange-rates')
  }

  getExchangeRate(id: number): Promise<object | null> {
    return this.get(`/api/exchange-rates/${id}`)
  }

  createExchangeRate(data: object): Promise<CreateResponse> {
    return this.post('/api/exchange-rates', data)
  }

  updateExchangeRate(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/exchange-rates/${id}`, data)
  }

  deleteExchangeRate(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/exchange-rates/${id}`)
  }

  fetchTCMBRates(): Promise<FetchRatesResponse> {
    return this.post('/api/exchange-rates/fetch-tcmb')
  }

  fetchGoldPrice(): Promise<FetchGoldResponse> {
    return this.post('/api/exchange-rates/fetch-gold')
  }

  getLatestRates(): Promise<object> {
    return this.get('/api/exchange-rates/latest')
  }

  // Users
  getUsers(): Promise<object[]> {
    return this.get('/api/users')
  }

  getUser(id: number): Promise<object | null> {
    return this.get(`/api/users/${id}`)
  }

  createUser(data: object): Promise<CreateResponse> {
    return this.post('/api/users', data)
  }

  updateUser(id: number, data: object): Promise<UpdateResponse> {
    return this.put(`/api/users/${id}`, data)
  }

  deleteUser(id: number): Promise<DeleteResponse> {
    return this.delete(`/api/users/${id}`)
  }

  // Reports
  getDashboardData(): Promise<object> {
    return this.get('/api/reports/dashboard')
  }

  getReportSummary(filters?: object): Promise<object> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/reports/summary${params}`)
  }

  getTransactionReport(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/reports/transactions${params}`)
  }

  getDebtReport(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/reports/debts${params}`)
  }

  getProjectReport(filters?: object): Promise<object[]> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    return this.get(`/api/reports/projects${params}`)
  }

  async exportReport(type: string, filters?: object): Promise<ExportResponse> {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>)}` : ''
    const response = await fetch(`${this.baseUrl}/api/reports/export/${type}${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    })
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rapor_${type}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      return { success: true }
    }
    return { success: false, message: 'Export failed' }
  }

  // File operations - Web versions
  async uploadFile(_documentPath?: string): Promise<string | null> {
    // In web, we use file input instead of native dialog
    return null
  }

  async deleteFile(path: string): Promise<boolean> {
    const result = await this.delete<{ success: boolean }>(`/api/files/${encodeURIComponent(path)}`)
    return result.success
  }

  async openFile(path: string): Promise<string> {
    // In web, open file in new tab
    window.open(`${this.baseUrl}/api/files/${encodeURIComponent(path)}`, '_blank')
    return path
  }

  // Transaction Documents - Web version uses File object
  async addDocument(transactionId: number, file?: File): Promise<DocumentAddResponse> {
    if (!file) {
      return { success: false, message: 'Dosya seçilmedi' }
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('transactionId', transactionId.toString())

    const response = await fetch(`${this.baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    })

    return response.json()
  }

  getDocuments(transactionId: number): Promise<DocumentInfo[]> {
    return this.get(`/api/documents/transaction/${transactionId}`)
  }

  deleteDocument(documentId: number): Promise<DeleteResponse> {
    return this.delete(`/api/documents/${documentId}`)
  }

  async openDocument(filename: string): Promise<string> {
    window.open(`${this.baseUrl}/api/documents/file/${encodeURIComponent(filename)}`, '_blank')
    return filename
  }

  getDocumentCount(transactionId: number): Promise<number> {
    return this.get(`/api/documents/transaction/${transactionId}/count`)
  }

  getDocumentPreview(documentId: number): Promise<DocumentPreviewResponse> {
    return this.get(`/api/documents/${documentId}/preview`)
  }

  // Dialogs - Web implementations using native dialogs
  async confirm(message: string, _title?: string): Promise<boolean> {
    return window.confirm(message)
  }

  async alert(message: string, _type?: 'info' | 'warning' | 'error'): Promise<void> {
    window.alert(message)
  }

  // Setup
  checkSetupStatus(): Promise<SetupStatus> {
    return this.get('/api/setup/status')
  }

  initDatabase(): Promise<UpdateResponse> {
    return this.post('/api/setup/init')
  }

  createAdmin(data: { name: string; email: string; password: string }): Promise<UpdateResponse> {
    return this.post('/api/setup/create-admin', data)
  }

  seedData(options: { categories: boolean; exchangeRates: boolean; demoData: boolean }): Promise<SeedDataResponse> {
    return this.post('/api/setup/seed', options)
  }

  clearAllData(): Promise<SeedDataResponse> {
    return this.post('/api/setup/clear')
  }

  // Import - Web version
  async selectImportFile(): Promise<{ success: boolean; filePath?: string }> {
    // In web, we don't have file paths - return indicator for web file picker
    return { success: true, filePath: '__web_file_picker__' }
  }

  parseImportFile(_filePath: string): Promise<ImportParseResponse> {
    // In web, this should be called with actual file content
    return Promise.resolve({ success: false, message: 'Web import uses file upload' })
  }

  async parseImportFileWeb(file: File): Promise<ImportParseResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/api/import/parse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    })

    return response.json()
  }

  executeImport(rows: object[], userId: number): Promise<ImportExecuteResponse> {
    return this.post('/api/import/execute', { rows, userId })
  }

  // Database
  getDatabaseStats(): Promise<DatabaseStats> {
    return this.get('/api/database/stats')
  }

  async exportDatabaseSQL(): Promise<ExportResponse> {
    const response = await fetch(`${this.baseUrl}/api/database/export`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    })
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sirket-finans-backup_${new Date().toISOString().split('T')[0]}.sql`
      a.click()
      URL.revokeObjectURL(url)
      return { success: true }
    }
    return { success: false, message: 'Export failed' }
  }

  async importDatabaseSQL(): Promise<{ success: boolean; message: string; details?: string[] }> {
    // In web, this should be handled via file upload
    return { success: false, message: 'Web import uses file upload' }
  }

  // Additional web-specific methods
  async uploadFileWeb(file: File): Promise<string | null> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    })

    if (response.ok) {
      const result = await response.json()
      return result.filename
    }
    return null
  }

  async downloadFile(filename: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/files/${encodeURIComponent(filename)}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    })
    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}

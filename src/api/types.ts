// API interface definition - shared between Electron and Web clients

export interface ApiResponse<T = void> {
  success: boolean
  message?: string
  data?: T
}

export interface LoginResponse {
  success: boolean
  message: string
  user?: object
  token?: string
}

export interface CreateResponse {
  success: boolean
  message: string
  id?: number
}

export interface UpdateResponse {
  success: boolean
  message: string
}

export interface DeleteResponse {
  success: boolean
  message: string
}

export interface ExportResponse {
  success: boolean
  path?: string
  message?: string
}

export interface MergeResponse {
  success: boolean
  message: string
  recordsMoved?: number
  transactionsMoved?: number
}

export interface DocumentInfo {
  id: number
  transaction_id: number
  filename: string
  original_name: string
  mime_type: string
  file_size: number
  uploaded_at: string
}

export interface DocumentAddResponse {
  success: boolean
  message: string
  document?: DocumentInfo
}

export interface DocumentPreviewResponse {
  success: boolean
  data?: string
  mimeType?: string
  message?: string
}

export interface SetupStatus {
  needsSetup: boolean
  hasDatabase: boolean
  hasUsers: boolean
  hasTables: boolean
}

export interface SeedDataResponse {
  success: boolean
  message: string
  details: string[]
}

export interface ImportPreview {
  fileName: string
  totalRows: number
  validRows: number
  invalidRows: number
  skippedRows: number
  rows: object[]
  categories: { name: string; exists: boolean }[]
  parties: { name: string; exists: boolean }[]
}

export interface ImportParseResponse {
  success: boolean
  message?: string
  preview?: ImportPreview
}

export interface ImportExecuteResponse {
  success: boolean
  message: string
  imported: number
  failed: number
  categoriesCreated: number
  partiesCreated: number
  errors: string[]
}

export interface DatabaseStats {
  size: string
  tables: number
  records: Record<string, number>
}

export interface GrantTotals {
  total_approved: number
  total_received: number
}

export interface FetchRatesResponse {
  success: boolean
  message: string
  rates?: object
}

export interface FetchGoldResponse {
  success: boolean
  message: string
  rate?: number
  date?: string
}

export interface AssignToProjectResponse {
  success: boolean
  message: string
  count: number
}

// Main API Client Interface
export interface IApiClient {
  // Auth
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<object | null>

  // Transactions
  getTransactions: (filters?: object) => Promise<object[]>
  getTransaction: (id: number) => Promise<object | null>
  getTransactionsByProject: (projectId: number) => Promise<object[]>
  createTransaction: (data: object) => Promise<CreateResponse>
  updateTransaction: (id: number, data: object) => Promise<UpdateResponse>
  deleteTransaction: (id: number) => Promise<DeleteResponse>
  exportTransactions: (filters?: object) => Promise<ExportResponse>
  getUnassignedTransactions: (filters?: object) => Promise<object[]>
  assignTransactionsToProject: (transactionIds: number[], projectId: number) => Promise<AssignToProjectResponse>

  // Debts
  getDebts: (filters?: object) => Promise<object[]>
  getDebt: (id: number) => Promise<object | null>
  createDebt: (data: object) => Promise<CreateResponse>
  updateDebt: (id: number, data: object) => Promise<UpdateResponse>
  deleteDebt: (id: number) => Promise<DeleteResponse>
  createInstallments: (debtId: number, count: number, startDate?: string) => Promise<UpdateResponse>
  exportDebts: (filters?: object) => Promise<ExportResponse>

  // Installments
  getInstallment: (id: number) => Promise<object | null>
  updateInstallment: (id: number, data: object) => Promise<UpdateResponse>
  deleteInstallment: (id: number) => Promise<DeleteResponse>
  addInstallmentPayment: (installmentId: number, data: object) => Promise<UpdateResponse>

  // Parties
  getParties: (filters?: object) => Promise<object[]>
  getParty: (id: number) => Promise<object | null>
  createParty: (data: object) => Promise<CreateResponse>
  updateParty: (id: number, data: object) => Promise<UpdateResponse>
  deleteParty: (id: number) => Promise<DeleteResponse>
  mergeParties: (sourceId: number, targetId: number) => Promise<MergeResponse>

  // Categories
  getCategories: (type?: string) => Promise<object[]>
  getCategory: (id: number) => Promise<object | null>
  createCategory: (data: object) => Promise<CreateResponse>
  updateCategory: (id: number, data: object) => Promise<UpdateResponse>
  deleteCategory: (id: number) => Promise<DeleteResponse>
  mergeCategories: (sourceId: number, targetId: number) => Promise<MergeResponse>

  // Projects
  getProjects: (filters?: object) => Promise<object[]>
  getProject: (id: number) => Promise<object | null>
  createProject: (data: object) => Promise<CreateResponse>
  updateProject: (id: number, data: object) => Promise<UpdateResponse>
  deleteProject: (id: number) => Promise<DeleteResponse>
  getIncompleteProjectsCount: () => Promise<number>

  // Milestones
  getMilestone: (id: number) => Promise<object | null>
  createMilestone: (data: object) => Promise<CreateResponse>
  updateMilestone: (id: number, data: object) => Promise<UpdateResponse>
  deleteMilestone: (id: number) => Promise<DeleteResponse>

  // Grants
  getProjectGrants: (projectId: number) => Promise<object[]>
  getGrant: (id: number) => Promise<object | null>
  createGrant: (data: object) => Promise<CreateResponse>
  updateGrant: (id: number, data: object) => Promise<UpdateResponse>
  deleteGrant: (id: number) => Promise<DeleteResponse>
  calculateGrantAmount: (projectId: number, rate: number, vatExcluded: boolean) => Promise<number>
  getGrantTotals: (projectId: number) => Promise<GrantTotals>

  // Payments
  getPayments: (filters?: object) => Promise<object[]>
  deletePayment: (id: number) => Promise<DeleteResponse>

  // Exchange Rates
  getExchangeRates: () => Promise<object[]>
  getExchangeRate: (id: number) => Promise<object | null>
  createExchangeRate: (data: object) => Promise<CreateResponse>
  updateExchangeRate: (id: number, data: object) => Promise<UpdateResponse>
  deleteExchangeRate: (id: number) => Promise<DeleteResponse>
  fetchTCMBRates: () => Promise<FetchRatesResponse>
  fetchGoldPrice: () => Promise<FetchGoldResponse>
  getLatestRates: () => Promise<object>

  // Users
  getUsers: () => Promise<object[]>
  getUser: (id: number) => Promise<object | null>
  createUser: (data: object) => Promise<CreateResponse>
  updateUser: (id: number, data: object) => Promise<UpdateResponse>
  deleteUser: (id: number) => Promise<DeleteResponse>

  // Reports
  getDashboardData: () => Promise<object>
  getReportSummary: (filters?: object) => Promise<object>
  getTransactionReport: (filters?: object) => Promise<object[]>
  getDebtReport: (filters?: object) => Promise<object[]>
  getProjectReport: (filters?: object) => Promise<object[]>
  exportReport: (type: string, filters?: object) => Promise<ExportResponse>

  // File operations
  uploadFile: (documentPath?: string) => Promise<string | null>
  deleteFile: (path: string) => Promise<boolean>
  openFile: (path: string) => Promise<string>

  // Transaction Documents
  addDocument: (transactionId: number, file?: File) => Promise<DocumentAddResponse>
  getDocuments: (transactionId: number) => Promise<DocumentInfo[]>
  deleteDocument: (documentId: number) => Promise<DeleteResponse>
  openDocument: (filename: string) => Promise<string>
  getDocumentCount: (transactionId: number) => Promise<number>
  getDocumentPreview: (documentId: number) => Promise<DocumentPreviewResponse>

  // Dialogs
  confirm: (message: string, title?: string) => Promise<boolean>
  alert: (message: string, type?: 'info' | 'warning' | 'error') => Promise<void>

  // Setup
  checkSetupStatus: () => Promise<SetupStatus>
  initDatabase: () => Promise<UpdateResponse>
  createAdmin: (data: { name: string; email: string; password: string }) => Promise<UpdateResponse>
  seedData: (options: { categories: boolean; exchangeRates: boolean; demoData: boolean }) => Promise<SeedDataResponse>
  clearAllData: () => Promise<SeedDataResponse>

  // Import
  selectImportFile: () => Promise<{ success: boolean; filePath?: string }>
  parseImportFile: (filePath: string) => Promise<ImportParseResponse>
  executeImport: (rows: object[], userId: number) => Promise<ImportExecuteResponse>

  // Database
  getDatabaseStats: () => Promise<DatabaseStats>
  exportDatabaseSQL: () => Promise<ExportResponse>
  importDatabaseSQL: () => Promise<{ success: boolean; message: string; details?: string[] }>

  // Web-specific file operations
  uploadFileWeb?: (file: File) => Promise<string | null>
  downloadFile?: (filename: string) => Promise<void>
}

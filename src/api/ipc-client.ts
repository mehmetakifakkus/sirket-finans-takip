// Electron IPC Client - wraps window.electronApi for Electron environment
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

// Interface for Electron's exposed API
interface IElectronApi {
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<object | null>
  getTransactions: (filters?: object) => Promise<object[]>
  getTransaction: (id: number) => Promise<object | null>
  getTransactionsByProject: (projectId: number) => Promise<object[]>
  createTransaction: (data: object) => Promise<CreateResponse>
  updateTransaction: (id: number, data: object) => Promise<UpdateResponse>
  deleteTransaction: (id: number) => Promise<DeleteResponse>
  exportTransactions: (filters?: object) => Promise<ExportResponse>
  getUnassignedTransactions: (filters?: object) => Promise<object[]>
  assignTransactionsToProject: (transactionIds: number[], projectId: number) => Promise<AssignToProjectResponse>
  getDebts: (filters?: object) => Promise<object[]>
  getDebt: (id: number) => Promise<object | null>
  createDebt: (data: object) => Promise<CreateResponse>
  updateDebt: (id: number, data: object) => Promise<UpdateResponse>
  deleteDebt: (id: number) => Promise<DeleteResponse>
  createInstallments: (debtId: number, count: number, startDate?: string) => Promise<UpdateResponse>
  exportDebts: (filters?: object) => Promise<ExportResponse>
  getInstallment: (id: number) => Promise<object | null>
  updateInstallment: (id: number, data: object) => Promise<UpdateResponse>
  deleteInstallment: (id: number) => Promise<DeleteResponse>
  addInstallmentPayment: (installmentId: number, data: object) => Promise<UpdateResponse>
  getParties: (filters?: object) => Promise<object[]>
  getParty: (id: number) => Promise<object | null>
  createParty: (data: object) => Promise<CreateResponse>
  updateParty: (id: number, data: object) => Promise<UpdateResponse>
  deleteParty: (id: number) => Promise<DeleteResponse>
  mergeParties: (sourceId: number, targetId: number) => Promise<MergeResponse>
  getCategories: (type?: string) => Promise<object[]>
  getCategory: (id: number) => Promise<object | null>
  createCategory: (data: object) => Promise<CreateResponse>
  updateCategory: (id: number, data: object) => Promise<UpdateResponse>
  deleteCategory: (id: number) => Promise<DeleteResponse>
  mergeCategories: (sourceId: number, targetId: number) => Promise<MergeResponse>
  getProjects: (filters?: object) => Promise<object[]>
  getProject: (id: number) => Promise<object | null>
  createProject: (data: object) => Promise<CreateResponse>
  updateProject: (id: number, data: object) => Promise<UpdateResponse>
  deleteProject: (id: number) => Promise<DeleteResponse>
  getIncompleteProjectsCount: () => Promise<number>
  getMilestone: (id: number) => Promise<object | null>
  createMilestone: (data: object) => Promise<CreateResponse>
  updateMilestone: (id: number, data: object) => Promise<UpdateResponse>
  deleteMilestone: (id: number) => Promise<DeleteResponse>
  getProjectGrants: (projectId: number) => Promise<object[]>
  getGrant: (id: number) => Promise<object | null>
  createGrant: (data: object) => Promise<CreateResponse>
  updateGrant: (id: number, data: object) => Promise<UpdateResponse>
  deleteGrant: (id: number) => Promise<DeleteResponse>
  calculateGrantAmount: (projectId: number, rate: number, vatExcluded: boolean) => Promise<number>
  getGrantTotals: (projectId: number) => Promise<GrantTotals>
  getPayments: (filters?: object) => Promise<object[]>
  deletePayment: (id: number) => Promise<DeleteResponse>
  getExchangeRates: () => Promise<object[]>
  getExchangeRate: (id: number) => Promise<object | null>
  createExchangeRate: (data: object) => Promise<CreateResponse>
  updateExchangeRate: (id: number, data: object) => Promise<UpdateResponse>
  deleteExchangeRate: (id: number) => Promise<DeleteResponse>
  fetchTCMBRates: () => Promise<FetchRatesResponse>
  fetchGoldPrice: () => Promise<FetchGoldResponse>
  getLatestRates: () => Promise<object>
  getUsers: () => Promise<object[]>
  getUser: (id: number) => Promise<object | null>
  createUser: (data: object) => Promise<CreateResponse>
  updateUser: (id: number, data: object) => Promise<UpdateResponse>
  deleteUser: (id: number) => Promise<DeleteResponse>
  getDashboardData: () => Promise<object>
  getReportSummary: (filters?: object) => Promise<object>
  getTransactionReport: (filters?: object) => Promise<object[]>
  getDebtReport: (filters?: object) => Promise<object[]>
  getProjectReport: (filters?: object) => Promise<object[]>
  exportReport: (type: string, filters?: object) => Promise<ExportResponse>
  uploadFile: (documentPath?: string) => Promise<string | null>
  deleteFile: (path: string) => Promise<boolean>
  openFile: (path: string) => Promise<string>
  addDocument: (transactionId: number) => Promise<DocumentAddResponse>
  getDocuments: (transactionId: number) => Promise<DocumentInfo[]>
  deleteDocument: (documentId: number) => Promise<DeleteResponse>
  openDocument: (filename: string) => Promise<string>
  getDocumentCount: (transactionId: number) => Promise<number>
  getDocumentPreview: (documentId: number) => Promise<DocumentPreviewResponse>
  confirm: (message: string, title?: string) => Promise<boolean>
  alert: (message: string, type?: 'info' | 'warning' | 'error') => Promise<void>
  checkSetupStatus: () => Promise<SetupStatus>
  initDatabase: () => Promise<UpdateResponse>
  createAdmin: (data: { name: string; email: string; password: string }) => Promise<UpdateResponse>
  seedData: (options: { categories: boolean; exchangeRates: boolean; demoData: boolean }) => Promise<SeedDataResponse>
  clearAllData: () => Promise<SeedDataResponse>
  selectImportFile: () => Promise<{ success: boolean; filePath?: string }>
  parseImportFile: (filePath: string) => Promise<ImportParseResponse>
  executeImport: (rows: object[], userId: number) => Promise<ImportExecuteResponse>
  getDatabaseStats: () => Promise<DatabaseStats>
  exportDatabaseSQL: () => Promise<ExportResponse>
  importDatabaseSQL: () => Promise<{ success: boolean; message: string; details?: string[] }>
}

declare global {
  interface Window {
    electronApi?: IElectronApi
  }
}

export class IpcClient implements IApiClient {
  private get api(): IElectronApi {
    if (!window.electronApi) {
      throw new Error('Electron API not available')
    }
    return window.electronApi
  }

  // Auth
  login = (email: string, password: string) => this.api.login(email, password)
  logout = () => this.api.logout()
  getCurrentUser = () => this.api.getCurrentUser()

  // Transactions
  getTransactions = (filters?: object) => this.api.getTransactions(filters)
  getTransaction = (id: number) => this.api.getTransaction(id)
  getTransactionsByProject = (projectId: number) => this.api.getTransactionsByProject(projectId)
  createTransaction = (data: object) => this.api.createTransaction(data)
  updateTransaction = (id: number, data: object) => this.api.updateTransaction(id, data)
  deleteTransaction = (id: number) => this.api.deleteTransaction(id)
  exportTransactions = (filters?: object) => this.api.exportTransactions(filters)
  getUnassignedTransactions = (filters?: object) => this.api.getUnassignedTransactions(filters)
  assignTransactionsToProject = (transactionIds: number[], projectId: number) =>
    this.api.assignTransactionsToProject(transactionIds, projectId)

  // Debts
  getDebts = (filters?: object) => this.api.getDebts(filters)
  getDebt = (id: number) => this.api.getDebt(id)
  createDebt = (data: object) => this.api.createDebt(data)
  updateDebt = (id: number, data: object) => this.api.updateDebt(id, data)
  deleteDebt = (id: number) => this.api.deleteDebt(id)
  createInstallments = (debtId: number, count: number, startDate?: string) =>
    this.api.createInstallments(debtId, count, startDate)
  exportDebts = (filters?: object) => this.api.exportDebts(filters)

  // Installments
  getInstallment = (id: number) => this.api.getInstallment(id)
  updateInstallment = (id: number, data: object) => this.api.updateInstallment(id, data)
  deleteInstallment = (id: number) => this.api.deleteInstallment(id)
  addInstallmentPayment = (installmentId: number, data: object) =>
    this.api.addInstallmentPayment(installmentId, data)

  // Parties
  getParties = (filters?: object) => this.api.getParties(filters)
  getParty = (id: number) => this.api.getParty(id)
  createParty = (data: object) => this.api.createParty(data)
  updateParty = (id: number, data: object) => this.api.updateParty(id, data)
  deleteParty = (id: number) => this.api.deleteParty(id)
  mergeParties = (sourceId: number, targetId: number) => this.api.mergeParties(sourceId, targetId)

  // Categories
  getCategories = (type?: string) => this.api.getCategories(type)
  getCategory = (id: number) => this.api.getCategory(id)
  createCategory = (data: object) => this.api.createCategory(data)
  updateCategory = (id: number, data: object) => this.api.updateCategory(id, data)
  deleteCategory = (id: number) => this.api.deleteCategory(id)
  mergeCategories = (sourceId: number, targetId: number) => this.api.mergeCategories(sourceId, targetId)

  // Projects
  getProjects = (filters?: object) => this.api.getProjects(filters)
  getProject = (id: number) => this.api.getProject(id)
  createProject = (data: object) => this.api.createProject(data)
  updateProject = (id: number, data: object) => this.api.updateProject(id, data)
  deleteProject = (id: number) => this.api.deleteProject(id)
  getIncompleteProjectsCount = () => this.api.getIncompleteProjectsCount()

  // Milestones
  getMilestone = (id: number) => this.api.getMilestone(id)
  createMilestone = (data: object) => this.api.createMilestone(data)
  updateMilestone = (id: number, data: object) => this.api.updateMilestone(id, data)
  deleteMilestone = (id: number) => this.api.deleteMilestone(id)

  // Grants
  getProjectGrants = (projectId: number) => this.api.getProjectGrants(projectId)
  getGrant = (id: number) => this.api.getGrant(id)
  createGrant = (data: object) => this.api.createGrant(data)
  updateGrant = (id: number, data: object) => this.api.updateGrant(id, data)
  deleteGrant = (id: number) => this.api.deleteGrant(id)
  calculateGrantAmount = (projectId: number, rate: number, vatExcluded: boolean) =>
    this.api.calculateGrantAmount(projectId, rate, vatExcluded)
  getGrantTotals = (projectId: number) => this.api.getGrantTotals(projectId)

  // Payments
  getPayments = (filters?: object) => this.api.getPayments(filters)
  deletePayment = (id: number) => this.api.deletePayment(id)

  // Exchange Rates
  getExchangeRates = () => this.api.getExchangeRates()
  getExchangeRate = (id: number) => this.api.getExchangeRate(id)
  createExchangeRate = (data: object) => this.api.createExchangeRate(data)
  updateExchangeRate = (id: number, data: object) => this.api.updateExchangeRate(id, data)
  deleteExchangeRate = (id: number) => this.api.deleteExchangeRate(id)
  fetchTCMBRates = () => this.api.fetchTCMBRates()
  fetchGoldPrice = () => this.api.fetchGoldPrice()
  getLatestRates = () => this.api.getLatestRates()

  // Users
  getUsers = () => this.api.getUsers()
  getUser = (id: number) => this.api.getUser(id)
  createUser = (data: object) => this.api.createUser(data)
  updateUser = (id: number, data: object) => this.api.updateUser(id, data)
  deleteUser = (id: number) => this.api.deleteUser(id)

  // Reports
  getDashboardData = () => this.api.getDashboardData()
  getReportSummary = (filters?: object) => this.api.getReportSummary(filters)
  getTransactionReport = (filters?: object) => this.api.getTransactionReport(filters)
  getDebtReport = (filters?: object) => this.api.getDebtReport(filters)
  getProjectReport = (filters?: object) => this.api.getProjectReport(filters)
  exportReport = (type: string, filters?: object) => this.api.exportReport(type, filters)

  // File operations
  uploadFile = (documentPath?: string) => this.api.uploadFile(documentPath)
  deleteFile = (path: string) => this.api.deleteFile(path)
  openFile = (path: string) => this.api.openFile(path)

  // Transaction Documents - In Electron, the file parameter is ignored (uses native dialog)
  addDocument = (transactionId: number, _file?: File) => this.api.addDocument(transactionId)
  getDocuments = (transactionId: number) => this.api.getDocuments(transactionId)
  deleteDocument = (documentId: number) => this.api.deleteDocument(documentId)
  openDocument = (filename: string) => this.api.openDocument(filename)
  getDocumentCount = (transactionId: number) => this.api.getDocumentCount(transactionId)
  getDocumentPreview = (documentId: number) => this.api.getDocumentPreview(documentId)

  // Dialogs
  confirm = (message: string, title?: string) => this.api.confirm(message, title)
  alert = (message: string, type?: 'info' | 'warning' | 'error') => this.api.alert(message, type)

  // Setup
  checkSetupStatus = () => this.api.checkSetupStatus()
  initDatabase = () => this.api.initDatabase()
  createAdmin = (data: { name: string; email: string; password: string }) => this.api.createAdmin(data)
  seedData = (options: { categories: boolean; exchangeRates: boolean; demoData: boolean }) =>
    this.api.seedData(options)
  clearAllData = () => this.api.clearAllData()

  // Import
  selectImportFile = () => this.api.selectImportFile()
  parseImportFile = (filePath: string) => this.api.parseImportFile(filePath)
  executeImport = (rows: object[], userId: number) => this.api.executeImport(rows, userId)

  // Database
  getDatabaseStats = () => this.api.getDatabaseStats()
  exportDatabaseSQL = () => this.api.exportDatabaseSQL()
  importDatabaseSQL = () => this.api.importDatabaseSQL()
}

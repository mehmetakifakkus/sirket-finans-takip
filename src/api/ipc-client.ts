/**
 * IPC Client for Electron
 * Wraps window.api (Electron preload) for use with API abstraction
 */

import type { IApiClient } from './types'

class IpcClient implements IApiClient {
  private get api() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).api
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

  // Transaction Documents
  addDocument = (transactionId: number) => this.api.addDocument(transactionId)
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
  clearTable = (tableName: string) => this.api.clearTable(tableName)
}

export const ipcClient = new IpcClient()

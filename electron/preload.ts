import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('api', {
  // Auth
  login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),

  // Transactions
  getTransactions: (filters?: object) => ipcRenderer.invoke('transactions:list', filters),
  getTransaction: (id: number) => ipcRenderer.invoke('transactions:get', id),
  getTransactionsByProject: (projectId: number) => ipcRenderer.invoke('transactions:getByProject', projectId),
  createTransaction: (data: object) => ipcRenderer.invoke('transactions:create', data),
  updateTransaction: (id: number, data: object) => ipcRenderer.invoke('transactions:update', id, data),
  deleteTransaction: (id: number) => ipcRenderer.invoke('transactions:delete', id),
  exportTransactions: (filters?: object) => ipcRenderer.invoke('transactions:export', filters),
  getUnassignedTransactions: (filters?: object) => ipcRenderer.invoke('transactions:getUnassigned', filters),
  assignTransactionsToProject: (transactionIds: number[], projectId: number) =>
    ipcRenderer.invoke('transactions:assignToProject', transactionIds, projectId),

  // Debts
  getDebts: (filters?: object) => ipcRenderer.invoke('debts:list', filters),
  getDebt: (id: number) => ipcRenderer.invoke('debts:get', id),
  createDebt: (data: object) => ipcRenderer.invoke('debts:create', data),
  updateDebt: (id: number, data: object) => ipcRenderer.invoke('debts:update', id, data),
  deleteDebt: (id: number) => ipcRenderer.invoke('debts:delete', id),
  createInstallments: (debtId: number, count: number, startDate?: string) =>
    ipcRenderer.invoke('debts:createInstallments', debtId, count, startDate),
  exportDebts: (filters?: object) => ipcRenderer.invoke('debts:export', filters),

  // Installments
  getInstallment: (id: number) => ipcRenderer.invoke('installments:get', id),
  updateInstallment: (id: number, data: object) => ipcRenderer.invoke('installments:update', id, data),
  deleteInstallment: (id: number) => ipcRenderer.invoke('installments:delete', id),
  addInstallmentPayment: (installmentId: number, data: object) =>
    ipcRenderer.invoke('installments:addPayment', installmentId, data),

  // Parties
  getParties: (filters?: object) => ipcRenderer.invoke('parties:list', filters),
  getParty: (id: number) => ipcRenderer.invoke('parties:get', id),
  createParty: (data: object) => ipcRenderer.invoke('parties:create', data),
  updateParty: (id: number, data: object) => ipcRenderer.invoke('parties:update', id, data),
  deleteParty: (id: number) => ipcRenderer.invoke('parties:delete', id),
  mergeParties: (sourceId: number, targetId: number) => ipcRenderer.invoke('parties:merge', sourceId, targetId),

  // Categories
  getCategories: (type?: string) => ipcRenderer.invoke('categories:list', type),
  getCategory: (id: number) => ipcRenderer.invoke('categories:get', id),
  createCategory: (data: object) => ipcRenderer.invoke('categories:create', data),
  updateCategory: (id: number, data: object) => ipcRenderer.invoke('categories:update', id, data),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),
  mergeCategories: (sourceId: number, targetId: number) => ipcRenderer.invoke('categories:merge', sourceId, targetId),

  // Projects
  getProjects: (filters?: object) => ipcRenderer.invoke('projects:list', filters),
  getProject: (id: number) => ipcRenderer.invoke('projects:get', id),
  createProject: (data: object) => ipcRenderer.invoke('projects:create', data),
  updateProject: (id: number, data: object) => ipcRenderer.invoke('projects:update', id, data),
  deleteProject: (id: number) => ipcRenderer.invoke('projects:delete', id),
  getIncompleteProjectsCount: () => ipcRenderer.invoke('projects:incompleteCount'),

  // Milestones
  getMilestone: (id: number) => ipcRenderer.invoke('milestones:get', id),
  createMilestone: (data: object) => ipcRenderer.invoke('milestones:create', data),
  updateMilestone: (id: number, data: object) => ipcRenderer.invoke('milestones:update', id, data),
  deleteMilestone: (id: number) => ipcRenderer.invoke('milestones:delete', id),

  // Grants
  getProjectGrants: (projectId: number) => ipcRenderer.invoke('grants:list', projectId),
  getGrant: (id: number) => ipcRenderer.invoke('grants:get', id),
  createGrant: (data: object) => ipcRenderer.invoke('grants:create', data),
  updateGrant: (id: number, data: object) => ipcRenderer.invoke('grants:update', id, data),
  deleteGrant: (id: number) => ipcRenderer.invoke('grants:delete', id),
  calculateGrantAmount: (projectId: number, rate: number, vatExcluded: boolean) =>
    ipcRenderer.invoke('grants:calculateAmount', projectId, rate, vatExcluded),
  getGrantTotals: (projectId: number) => ipcRenderer.invoke('grants:totals', projectId),

  // Payments
  getPayments: (filters?: object) => ipcRenderer.invoke('payments:list', filters),
  deletePayment: (id: number) => ipcRenderer.invoke('payments:delete', id),

  // Exchange Rates
  getExchangeRates: () => ipcRenderer.invoke('exchangeRates:list'),
  getExchangeRate: (id: number) => ipcRenderer.invoke('exchangeRates:get', id),
  createExchangeRate: (data: object) => ipcRenderer.invoke('exchangeRates:create', data),
  updateExchangeRate: (id: number, data: object) => ipcRenderer.invoke('exchangeRates:update', id, data),
  deleteExchangeRate: (id: number) => ipcRenderer.invoke('exchangeRates:delete', id),
  fetchTCMBRates: () => ipcRenderer.invoke('exchangeRates:fetchTCMB'),
  fetchGoldPrice: () => ipcRenderer.invoke('exchangeRates:fetchGold'),
  getLatestRates: () => ipcRenderer.invoke('exchangeRates:getLatest'),

  // Users
  getUsers: () => ipcRenderer.invoke('users:list'),
  getUser: (id: number) => ipcRenderer.invoke('users:get', id),
  createUser: (data: object) => ipcRenderer.invoke('users:create', data),
  updateUser: (id: number, data: object) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id: number) => ipcRenderer.invoke('users:delete', id),

  // Reports
  getDashboardData: () => ipcRenderer.invoke('reports:dashboard'),
  getReportSummary: (filters?: object) => ipcRenderer.invoke('reports:summary', filters),
  getTransactionReport: (filters?: object) => ipcRenderer.invoke('reports:transactions', filters),
  getDebtReport: (filters?: object) => ipcRenderer.invoke('reports:debts', filters),
  getProjectReport: (filters?: object) => ipcRenderer.invoke('reports:projects', filters),
  exportReport: (type: string, filters?: object) => ipcRenderer.invoke('reports:export', type, filters),

  // Charts
  getMonthlyChartData: (months?: number) => ipcRenderer.invoke('charts:monthlyData', months),
  getCategoryChartData: (type?: string, months?: number) => ipcRenderer.invoke('charts:categoryData', type, months),
  getDebtSummaryChartData: () => ipcRenderer.invoke('charts:debtSummary'),

  // Notifications
  getUpcomingPayments: (days?: number) => ipcRenderer.invoke('notifications:getUpcoming', days),
  getOverduePayments: () => ipcRenderer.invoke('notifications:getOverdue'),
  getPaymentSummary: () => ipcRenderer.invoke('notifications:getSummary'),
  checkNotifications: (settings: object, translations: object) => ipcRenderer.invoke('notifications:check', settings, translations),

  // Templates
  getTemplates: (filters?: object) => ipcRenderer.invoke('templates:list', filters),
  getTemplate: (id: number) => ipcRenderer.invoke('templates:get', id),
  createTemplate: (data: object) => ipcRenderer.invoke('templates:create', data),
  updateTemplate: (id: number, data: object) => ipcRenderer.invoke('templates:update', id, data),
  deleteTemplate: (id: number) => ipcRenderer.invoke('templates:delete', id),
  createTransactionFromTemplate: (templateId: number, date: string, userId: number, overrides?: object) =>
    ipcRenderer.invoke('templates:createTransaction', templateId, date, userId, overrides),
  getDueTemplates: () => ipcRenderer.invoke('templates:getDue'),

  // File operations
  uploadFile: (documentPath?: string) => ipcRenderer.invoke('file:upload', documentPath),
  deleteFile: (path: string) => ipcRenderer.invoke('file:delete', path),
  openFile: (path: string) => ipcRenderer.invoke('file:open', path),

  // Transaction Documents
  addDocument: (transactionId: number) => ipcRenderer.invoke('documents:add', transactionId),
  getDocuments: (transactionId: number) => ipcRenderer.invoke('documents:list', transactionId),
  deleteDocument: (documentId: number) => ipcRenderer.invoke('documents:delete', documentId),
  openDocument: (filename: string) => ipcRenderer.invoke('documents:open', filename),
  getDocumentCount: (transactionId: number) => ipcRenderer.invoke('documents:count', transactionId),
  getDocumentPreview: (documentId: number) => ipcRenderer.invoke('documents:preview', documentId),

  // Dialogs
  confirm: (message: string, title?: string) => ipcRenderer.invoke('dialog:confirm', message, title),
  alert: (message: string, type?: 'info' | 'warning' | 'error') => ipcRenderer.invoke('dialog:alert', message, type),

  // Setup
  checkSetupStatus: () => ipcRenderer.invoke('setup:checkStatus'),
  initDatabase: () => ipcRenderer.invoke('setup:initDatabase'),
  createAdmin: (data: { name: string; email: string; password: string }) => ipcRenderer.invoke('setup:createAdmin', data),
  seedData: (options: { categories: boolean; exchangeRates: boolean; demoData: boolean }) => ipcRenderer.invoke('setup:seedData', options),
  clearAllData: () => ipcRenderer.invoke('setup:clearData'),

  // Import
  selectImportFile: () => ipcRenderer.invoke('import:selectFile'),
  parseImportFile: (filePath: string) => ipcRenderer.invoke('import:parseFile', filePath),
  executeImport: (rows: object[], userId: number) => ipcRenderer.invoke('import:execute', rows, userId),

  // Database
  getDatabaseStats: () => ipcRenderer.invoke('database:getStats'),
  exportDatabaseSQL: () => ipcRenderer.invoke('database:exportSQL'),
  importDatabaseSQL: () => ipcRenderer.invoke('database:importSQL'),
})

// Type definition for window.api
export interface IElectronAPI {
  // Auth
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: object }>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<object | null>;

  // Transactions
  getTransactions: (filters?: object) => Promise<object[]>;
  getTransaction: (id: number) => Promise<object | null>;
  getTransactionsByProject: (projectId: number) => Promise<object[]>;
  createTransaction: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateTransaction: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteTransaction: (id: number) => Promise<{ success: boolean; message: string }>;
  exportTransactions: (filters?: object) => Promise<{ success: boolean; path?: string }>;
  getUnassignedTransactions: (filters?: object) => Promise<object[]>;
  assignTransactionsToProject: (transactionIds: number[], projectId: number) => Promise<{ success: boolean; message: string; count: number }>;

  // Debts
  getDebts: (filters?: object) => Promise<object[]>;
  getDebt: (id: number) => Promise<object | null>;
  createDebt: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateDebt: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteDebt: (id: number) => Promise<{ success: boolean; message: string }>;
  createInstallments: (debtId: number, count: number, startDate?: string) => Promise<{ success: boolean; message: string }>;
  exportDebts: (filters?: object) => Promise<{ success: boolean; path?: string }>;

  // Installments
  getInstallment: (id: number) => Promise<object | null>;
  updateInstallment: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteInstallment: (id: number) => Promise<{ success: boolean; message: string }>;
  addInstallmentPayment: (installmentId: number, data: object) => Promise<{ success: boolean; message: string }>;

  // Parties
  getParties: (filters?: object) => Promise<object[]>;
  getParty: (id: number) => Promise<object | null>;
  createParty: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateParty: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteParty: (id: number) => Promise<{ success: boolean; message: string }>;
  mergeParties: (sourceId: number, targetId: number) => Promise<{ success: boolean; message: string; recordsMoved?: number }>;

  // Categories
  getCategories: (type?: string) => Promise<object[]>;
  getCategory: (id: number) => Promise<object | null>;
  createCategory: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateCategory: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteCategory: (id: number) => Promise<{ success: boolean; message: string }>;
  mergeCategories: (sourceId: number, targetId: number) => Promise<{ success: boolean; message: string; transactionsMoved?: number }>;

  // Projects
  getProjects: (filters?: object) => Promise<object[]>;
  getProject: (id: number) => Promise<object | null>;
  createProject: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateProject: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteProject: (id: number) => Promise<{ success: boolean; message: string }>;
  getIncompleteProjectsCount: () => Promise<number>;

  // Milestones
  getMilestone: (id: number) => Promise<object | null>;
  createMilestone: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateMilestone: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteMilestone: (id: number) => Promise<{ success: boolean; message: string }>;

  // Grants
  getProjectGrants: (projectId: number) => Promise<object[]>;
  getGrant: (id: number) => Promise<object | null>;
  createGrant: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateGrant: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteGrant: (id: number) => Promise<{ success: boolean; message: string }>;
  calculateGrantAmount: (projectId: number, rate: number, vatExcluded: boolean) => Promise<number>;
  getGrantTotals: (projectId: number) => Promise<{ total_approved: number; total_received: number }>;

  // Payments
  getPayments: (filters?: object) => Promise<object[]>;
  deletePayment: (id: number) => Promise<{ success: boolean; message: string }>;

  // Exchange Rates
  getExchangeRates: () => Promise<object[]>;
  getExchangeRate: (id: number) => Promise<object | null>;
  createExchangeRate: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateExchangeRate: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteExchangeRate: (id: number) => Promise<{ success: boolean; message: string }>;
  fetchTCMBRates: () => Promise<{ success: boolean; message: string; rates?: object }>;
  fetchGoldPrice: () => Promise<{ success: boolean; message: string; rate?: number; date?: string }>;
  getLatestRates: () => Promise<object>;

  // Users
  getUsers: () => Promise<object[]>;
  getUser: (id: number) => Promise<object | null>;
  createUser: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateUser: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: number) => Promise<{ success: boolean; message: string }>;

  // Reports
  getDashboardData: () => Promise<object>;
  getReportSummary: (filters?: object) => Promise<object>;
  getTransactionReport: (filters?: object) => Promise<object[]>;
  getDebtReport: (filters?: object) => Promise<object[]>;
  getProjectReport: (filters?: object) => Promise<object[]>;
  exportReport: (type: string, filters?: object) => Promise<{ success: boolean; message: string; path?: string }>;

  // Charts
  getMonthlyChartData: (months?: number) => Promise<object[]>;
  getCategoryChartData: (type?: string, months?: number) => Promise<object[]>;
  getDebtSummaryChartData: () => Promise<object>;

  // Notifications
  getUpcomingPayments: (days?: number) => Promise<object[]>;
  getOverduePayments: () => Promise<object[]>;
  getPaymentSummary: () => Promise<{ overdueCount: number; upcomingCount: number; overdueAmount: number; upcomingAmount: number }>;
  checkNotifications: (settings: object, translations: object) => Promise<{ upcoming: object[]; overdue: object[] }>;

  // Templates
  getTemplates: (filters?: object) => Promise<object[]>;
  getTemplate: (id: number) => Promise<object | null>;
  createTemplate: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateTemplate: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteTemplate: (id: number) => Promise<{ success: boolean; message: string }>;
  createTransactionFromTemplate: (templateId: number, date: string, userId: number, overrides?: object) =>
    Promise<{ success: boolean; message: string; id?: number }>;
  getDueTemplates: () => Promise<object[]>;

  // File operations
  uploadFile: (documentPath?: string) => Promise<string | null>;
  deleteFile: (path: string) => Promise<boolean>;
  openFile: (path: string) => Promise<string>;

  // Transaction Documents
  addDocument: (transactionId: number) => Promise<{
    success: boolean;
    message: string;
    document?: {
      id: number;
      transaction_id: number;
      filename: string;
      original_name: string;
      mime_type: string;
      file_size: number;
      uploaded_at: string;
    };
  }>;
  getDocuments: (transactionId: number) => Promise<{
    id: number;
    transaction_id: number;
    filename: string;
    original_name: string;
    mime_type: string;
    file_size: number;
    uploaded_at: string;
  }[]>;
  deleteDocument: (documentId: number) => Promise<{ success: boolean; message: string }>;
  openDocument: (filename: string) => Promise<string>;
  getDocumentCount: (transactionId: number) => Promise<number>;
  getDocumentPreview: (documentId: number) => Promise<{ success: boolean; data?: string; mimeType?: string; message?: string }>;

  // Dialogs
  confirm: (message: string, title?: string) => Promise<boolean>;
  alert: (message: string, type?: 'info' | 'warning' | 'error') => Promise<void>;

  // Setup
  checkSetupStatus: () => Promise<{
    needsSetup: boolean;
    hasDatabase: boolean;
    hasUsers: boolean;
    hasTables: boolean;
  }>;
  initDatabase: () => Promise<{ success: boolean; message: string }>;
  createAdmin: (data: { name: string; email: string; password: string }) => Promise<{ success: boolean; message: string }>;
  seedData: (options: { categories: boolean; exchangeRates: boolean; demoData: boolean }) => Promise<{ success: boolean; message: string; details: string[] }>;
  clearAllData: () => Promise<{ success: boolean; message: string; details: string[] }>;

  // Import
  selectImportFile: () => Promise<{ success: boolean; filePath?: string }>;
  parseImportFile: (filePath: string) => Promise<{
    success: boolean;
    message?: string;
    preview?: {
      fileName: string;
      totalRows: number;
      validRows: number;
      invalidRows: number;
      skippedRows: number;
      rows: object[];
      categories: { name: string; exists: boolean }[];
      parties: { name: string; exists: boolean }[];
    };
  }>;
  executeImport: (rows: object[], userId: number) => Promise<{
    success: boolean;
    message: string;
    imported: number;
    failed: number;
    categoriesCreated: number;
    partiesCreated: number;
    errors: string[];
  }>;

  // Database
  getDatabaseStats: () => Promise<{
    size: string;
    tables: number;
    records: Record<string, number>;
  }>;
  exportDatabaseSQL: () => Promise<{ success: boolean; path?: string; message?: string }>;
  importDatabaseSQL: () => Promise<{ success: boolean; message: string; details?: string[] }>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

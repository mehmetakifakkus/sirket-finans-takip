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
  createTransaction: (data: object) => ipcRenderer.invoke('transactions:create', data),
  updateTransaction: (id: number, data: object) => ipcRenderer.invoke('transactions:update', id, data),
  deleteTransaction: (id: number) => ipcRenderer.invoke('transactions:delete', id),
  exportTransactions: (filters?: object) => ipcRenderer.invoke('transactions:export', filters),

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

  // Categories
  getCategories: (type?: string) => ipcRenderer.invoke('categories:list', type),
  getCategory: (id: number) => ipcRenderer.invoke('categories:get', id),
  createCategory: (data: object) => ipcRenderer.invoke('categories:create', data),
  updateCategory: (id: number, data: object) => ipcRenderer.invoke('categories:update', id, data),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),

  // Projects
  getProjects: (filters?: object) => ipcRenderer.invoke('projects:list', filters),
  getProject: (id: number) => ipcRenderer.invoke('projects:get', id),
  createProject: (data: object) => ipcRenderer.invoke('projects:create', data),
  updateProject: (id: number, data: object) => ipcRenderer.invoke('projects:update', id, data),
  deleteProject: (id: number) => ipcRenderer.invoke('projects:delete', id),

  // Milestones
  getMilestone: (id: number) => ipcRenderer.invoke('milestones:get', id),
  createMilestone: (data: object) => ipcRenderer.invoke('milestones:create', data),
  updateMilestone: (id: number, data: object) => ipcRenderer.invoke('milestones:update', id, data),
  deleteMilestone: (id: number) => ipcRenderer.invoke('milestones:delete', id),

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

  // File operations
  uploadFile: (documentPath?: string) => ipcRenderer.invoke('file:upload', documentPath),
  deleteFile: (path: string) => ipcRenderer.invoke('file:delete', path),
  openFile: (path: string) => ipcRenderer.invoke('file:open', path),

  // Dialogs
  confirm: (message: string, title?: string) => ipcRenderer.invoke('dialog:confirm', message, title),
  alert: (message: string, type?: 'info' | 'warning' | 'error') => ipcRenderer.invoke('dialog:alert', message, type),
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
  createTransaction: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateTransaction: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteTransaction: (id: number) => Promise<{ success: boolean; message: string }>;
  exportTransactions: (filters?: object) => Promise<{ success: boolean; path?: string }>;

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

  // Categories
  getCategories: (type?: string) => Promise<object[]>;
  getCategory: (id: number) => Promise<object | null>;
  createCategory: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateCategory: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteCategory: (id: number) => Promise<{ success: boolean; message: string }>;

  // Projects
  getProjects: (filters?: object) => Promise<object[]>;
  getProject: (id: number) => Promise<object | null>;
  createProject: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateProject: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteProject: (id: number) => Promise<{ success: boolean; message: string }>;

  // Milestones
  getMilestone: (id: number) => Promise<object | null>;
  createMilestone: (data: object) => Promise<{ success: boolean; message: string; id?: number }>;
  updateMilestone: (id: number, data: object) => Promise<{ success: boolean; message: string }>;
  deleteMilestone: (id: number) => Promise<{ success: boolean; message: string }>;

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

  // File operations
  uploadFile: (documentPath?: string) => Promise<string | null>;
  deleteFile: (path: string) => Promise<boolean>;
  openFile: (path: string) => Promise<string>;

  // Dialogs
  confirm: (message: string, title?: string) => Promise<boolean>;
  alert: (message: string, type?: 'info' | 'warning' | 'error') => Promise<void>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

/**
 * API Client Interface
 * Shared interface for both Electron IPC and HTTP clients
 */

export interface IApiClient {
  // Auth
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: object; token?: string }>;
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

  // File operations
  uploadFile: (documentPath?: string) => Promise<string | null>;
  deleteFile: (path: string) => Promise<boolean>;
  openFile: (path: string) => Promise<string>;

  // Transaction Documents
  addDocument: (transactionId: number, file?: File) => Promise<{
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

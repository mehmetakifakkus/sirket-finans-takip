import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { initDatabaseAsync, closeDatabase, getDatabaseWrapper, DatabaseWrapper } from './database/connection'
import { runMigrations } from './database/migrations'
import { seedDatabase } from './database/seed'

// Services
import { AuthService } from './services/AuthService'
import { TransactionService } from './services/TransactionService'
import { DebtService } from './services/DebtService'
import { PartyService } from './services/PartyService'
import { CategoryService } from './services/CategoryService'
import { ProjectService } from './services/ProjectService'
import { PaymentService } from './services/PaymentService'
import { ExchangeRateService } from './services/ExchangeRateService'
import { ReportService } from './services/ReportService'
import { FileService } from './services/FileService'
import { SetupService } from './services/SetupService'

let mainWindow: BrowserWindow | null = null

// Check for dev server URL from vite-plugin-electron
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || (process.argv.includes('--dev') ? 'http://localhost:5173' : undefined)
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Şirket Finans Takip',
    icon: path.join(__dirname, '../assets/icon.png'),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Initialize services
let authService: AuthService
let transactionService: TransactionService
let debtService: DebtService
let partyService: PartyService
let categoryService: CategoryService
let projectService: ProjectService
let paymentService: PaymentService
let exchangeRateService: ExchangeRateService
let reportService: ReportService
let fileService: FileService
let setupService: SetupService

app.whenReady().then(async () => {
  // Initialize database (async for sql.js)
  await initDatabaseAsync()
  const db = getDatabaseWrapper()

  // Initialize setup service first (it handles migrations/seeding detection)
  setupService = new SetupService(db)

  // Check if setup is needed - if not, run migrations and seed
  const status = setupService.checkStatus()
  if (!status.needsSetup) {
    // Database is already set up, just ensure migrations are run
    runMigrations(db)
  }

  // Initialize services
  authService = new AuthService(db)
  transactionService = new TransactionService(db)
  debtService = new DebtService(db)
  partyService = new PartyService(db)
  categoryService = new CategoryService(db)
  projectService = new ProjectService(db)
  paymentService = new PaymentService(db)
  exchangeRateService = new ExchangeRateService(db)
  reportService = new ReportService(db)
  fileService = new FileService()

  // Register IPC handlers
  registerIpcHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers() {
  // Auth handlers
  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    return authService.login(email, password)
  })

  ipcMain.handle('auth:logout', async () => {
    return authService.logout()
  })

  ipcMain.handle('auth:getCurrentUser', async () => {
    return authService.getCurrentUser()
  })

  // Transaction handlers
  ipcMain.handle('transactions:list', async (_, filters) => {
    return transactionService.getFiltered(filters)
  })

  ipcMain.handle('transactions:get', async (_, id: number) => {
    return transactionService.getById(id)
  })

  ipcMain.handle('transactions:create', async (_, data) => {
    return transactionService.create(data)
  })

  ipcMain.handle('transactions:update', async (_, id: number, data) => {
    return transactionService.update(id, data)
  })

  ipcMain.handle('transactions:delete', async (_, id: number) => {
    return transactionService.delete(id)
  })

  ipcMain.handle('transactions:export', async (_, filters) => {
    const csv = transactionService.exportToCSV(filters)
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `islemler_${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!result.canceled && result.filePath) {
      await fileService.writeFile(result.filePath, csv)
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })

  // Debt handlers
  ipcMain.handle('debts:list', async (_, filters) => {
    return debtService.getFiltered(filters)
  })

  ipcMain.handle('debts:get', async (_, id: number) => {
    return debtService.getWithDetails(id)
  })

  ipcMain.handle('debts:create', async (_, data) => {
    return debtService.create(data)
  })

  ipcMain.handle('debts:update', async (_, id: number, data) => {
    return debtService.update(id, data)
  })

  ipcMain.handle('debts:delete', async (_, id: number) => {
    return debtService.delete(id)
  })

  ipcMain.handle('debts:createInstallments', async (_, debtId: number, count: number, startDate?: string) => {
    return debtService.createInstallments(debtId, count, startDate)
  })

  ipcMain.handle('debts:export', async (_, filters) => {
    const csv = debtService.exportToCSV(filters)
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `borc_alacak_${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!result.canceled && result.filePath) {
      await fileService.writeFile(result.filePath, csv)
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })

  // Installment handlers
  ipcMain.handle('installments:get', async (_, id: number) => {
    return debtService.getInstallment(id)
  })

  ipcMain.handle('installments:update', async (_, id: number, data) => {
    return debtService.updateInstallment(id, data)
  })

  ipcMain.handle('installments:delete', async (_, id: number) => {
    return debtService.deleteInstallment(id)
  })

  ipcMain.handle('installments:addPayment', async (_, installmentId: number, data) => {
    return debtService.addInstallmentPayment(installmentId, data)
  })

  // Party handlers
  ipcMain.handle('parties:list', async (_, filters) => {
    return partyService.getAll(filters)
  })

  ipcMain.handle('parties:get', async (_, id: number) => {
    return partyService.getById(id)
  })

  ipcMain.handle('parties:create', async (_, data) => {
    return partyService.create(data)
  })

  ipcMain.handle('parties:update', async (_, id: number, data) => {
    return partyService.update(id, data)
  })

  ipcMain.handle('parties:delete', async (_, id: number) => {
    return partyService.delete(id)
  })

  // Category handlers
  ipcMain.handle('categories:list', async (_, type?: string) => {
    return categoryService.getAll(type)
  })

  ipcMain.handle('categories:get', async (_, id: number) => {
    return categoryService.getById(id)
  })

  ipcMain.handle('categories:create', async (_, data) => {
    return categoryService.create(data)
  })

  ipcMain.handle('categories:update', async (_, id: number, data) => {
    return categoryService.update(id, data)
  })

  ipcMain.handle('categories:delete', async (_, id: number) => {
    return categoryService.delete(id)
  })

  // Project handlers
  ipcMain.handle('projects:list', async (_, filters) => {
    return projectService.getAll(filters)
  })

  ipcMain.handle('projects:get', async (_, id: number) => {
    return projectService.getWithDetails(id)
  })

  ipcMain.handle('projects:create', async (_, data) => {
    return projectService.create(data)
  })

  ipcMain.handle('projects:update', async (_, id: number, data) => {
    return projectService.update(id, data)
  })

  ipcMain.handle('projects:delete', async (_, id: number) => {
    return projectService.delete(id)
  })

  ipcMain.handle('projects:incompleteCount', async () => {
    return projectService.getIncompleteProjectsCount()
  })

  // Milestone handlers
  ipcMain.handle('milestones:get', async (_, id: number) => {
    return projectService.getMilestone(id)
  })

  ipcMain.handle('milestones:create', async (_, data) => {
    return projectService.createMilestone(data)
  })

  ipcMain.handle('milestones:update', async (_, id: number, data) => {
    return projectService.updateMilestone(id, data)
  })

  ipcMain.handle('milestones:delete', async (_, id: number) => {
    return projectService.deleteMilestone(id)
  })

  // Payment handlers
  ipcMain.handle('payments:list', async (_, filters) => {
    return paymentService.getAll(filters)
  })

  ipcMain.handle('payments:delete', async (_, id: number) => {
    return paymentService.delete(id)
  })

  // Exchange rate handlers
  ipcMain.handle('exchangeRates:list', async () => {
    return exchangeRateService.getAll()
  })

  ipcMain.handle('exchangeRates:get', async (_, id: number) => {
    return exchangeRateService.getById(id)
  })

  ipcMain.handle('exchangeRates:create', async (_, data) => {
    return exchangeRateService.create(data)
  })

  ipcMain.handle('exchangeRates:update', async (_, id: number, data) => {
    return exchangeRateService.update(id, data)
  })

  ipcMain.handle('exchangeRates:delete', async (_, id: number) => {
    return exchangeRateService.delete(id)
  })

  ipcMain.handle('exchangeRates:fetchTCMB', async () => {
    return exchangeRateService.fetchFromTCMB()
  })

  ipcMain.handle('exchangeRates:getLatest', async () => {
    return exchangeRateService.getLatestRates()
  })

  // User handlers
  ipcMain.handle('users:list', async () => {
    return authService.getAllUsers()
  })

  ipcMain.handle('users:get', async (_, id: number) => {
    return authService.getUserById(id)
  })

  ipcMain.handle('users:create', async (_, data) => {
    return authService.createUser(data)
  })

  ipcMain.handle('users:update', async (_, id: number, data) => {
    return authService.updateUser(id, data)
  })

  ipcMain.handle('users:delete', async (_, id: number) => {
    return authService.deleteUser(id)
  })

  // Report handlers
  ipcMain.handle('reports:dashboard', async () => {
    return reportService.getDashboardData()
  })

  ipcMain.handle('reports:summary', async (_, filters) => {
    return reportService.getSummaryReport(filters)
  })

  ipcMain.handle('reports:transactions', async (_, filters) => {
    return reportService.getTransactionReport(filters)
  })

  ipcMain.handle('reports:debts', async (_, filters) => {
    return reportService.getDebtReport(filters)
  })

  ipcMain.handle('reports:projects', async (_, filters) => {
    return reportService.getProjectReport(filters)
  })

  ipcMain.handle('reports:export', async (_, type: string, filters) => {
    const csv = reportService.exportCSV(type, filters)
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `rapor_${type}_${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!result.canceled && result.filePath) {
      await fileService.writeFile(result.filePath, csv)
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })

  // File handlers
  ipcMain.handle('file:upload', async (_, documentPath?: string) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'] }
      ]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return fileService.uploadDocument(result.filePaths[0])
    }
    return null
  })

  ipcMain.handle('file:delete', async (_, path: string) => {
    return fileService.deleteDocument(path)
  })

  ipcMain.handle('file:open', async (_, path: string) => {
    return shell.openPath(fileService.getFullPath(path))
  })

  // Dialog handlers
  ipcMain.handle('dialog:confirm', async (_, message: string, title?: string) => {
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: ['İptal', 'Evet'],
      defaultId: 1,
      title: title || 'Onay',
      message: message
    })
    return result.response === 1
  })

  ipcMain.handle('dialog:alert', async (_, message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    await dialog.showMessageBox(mainWindow!, {
      type: type,
      buttons: ['Tamam'],
      title: type === 'error' ? 'Hata' : type === 'warning' ? 'Uyarı' : 'Bilgi',
      message: message
    })
  })

  // Setup handlers
  ipcMain.handle('setup:checkStatus', async () => {
    return setupService.checkStatus()
  })

  ipcMain.handle('setup:initDatabase', async () => {
    return setupService.initDatabase()
  })

  ipcMain.handle('setup:createAdmin', async (_, data: { name: string; email: string; password: string }) => {
    return setupService.createAdmin(data)
  })

  ipcMain.handle('setup:seedData', async (_, options: { categories: boolean; exchangeRates: boolean; demoData: boolean }) => {
    return setupService.seedData(options)
  })
}
